// Social autopilot: menține calendarul de postări din feed alimentat.
// Rulează zilnic din orchestrator (`social.autopilot`, 07:15): aplică garda de
// randament pe ciorne și postări programate, marchează „Necesită corectare
// manuală” ciornele fără media sau în format nesuportat, verifică pozele înainte
// de programare și umple sloturile libere (10:00/18:00) alternând proprietăți și
// articole. Publicarea rămâne la `process-scheduled-posts`.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { localSocialRows, isKnownSocialContent } from "../_shared/socialLocalExtract.ts";
import { sendAdminText } from "../_shared/listingInspection.ts";
import { relayToMake } from "../_shared/makeRelay.ts";
import { ADMIN_WA_ALERT_NUMBERS } from "../_shared/waAgentNotify.ts";
import { guardSocialPostYield } from "../_shared/socialYieldGuard.ts";
import {
  autopilotConfig, upcomingSlots, isAutopilotEligible, planSchedule, freeSlots, withTitleLine, orderDrafts,
  manualFixUpdate, manualFixReason, draftMediaUrls, isManualFixFlag, MANUAL_FIX_PREFIX, TZ, type DraftRow,
} from "../_shared/socialAutopilotPlan.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const DRAFT_COLS = "id,type,title,caption,content_variants,media_type,video_url,image_url,image_urls,property_id,source_url,last_error,created_at";
const fmt = (d: Date) => new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
type Row = DraftRow & { content_variants?: unknown; status?: string; scheduled_at?: string | null };

/** Pre-scheduling media check: every image must load as an image. Returns the problem or null. */
async function mediaProblem(urls: string[]): Promise<string | null> {
  const probe = async (url: string): Promise<string | null> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      let r = await fetch(url, { method: "HEAD", signal: ctrl.signal });
      if (r.status === 405 || r.status === 403) r = await fetch(url, { headers: { Range: "bytes=0-0" }, signal: ctrl.signal });
      await r.body?.cancel().catch(() => {});
      if (!r.ok) return `imaginea nu se poate încărca (HTTP ${r.status})`;
      const type = r.headers.get("content-type") ?? "";
      if (type && !type.startsWith("image/") && !type.includes("octet-stream")) return "linkul imaginii nu duce la o fotografie";
      return null;
    } catch {
      return "imaginea nu răspunde (timp depășit)";
    } finally { clearTimeout(t); }
  };
  for (const r of await Promise.all(urls.slice(0, 10).map(probe))) if (r) return r;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;
  const body = await req.json().catch(() => ({}));
  if (body.dry_run !== undefined && typeof body.dry_run !== "boolean") return json({ error: "dry_run invalid" }, 400);
  if (body.notify !== undefined && typeof body.notify !== "boolean") return json({ error: "notify invalid" }, 400);
  const dryRun = body.dry_run === true;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: job } = await sb.from("automation_jobs").select("config").eq("job_key", "social.autopilot").maybeSingle();
  const cfg = autopilotConfig(job?.config as Record<string, unknown> | null);
  const now = new Date();
  let yieldFixed = 0;
  const flagged: { id: string; title: string; reason: string }[] = [];

  const loadContext = async () => {
    const [props, blogs, queued, drafts] = await Promise.all([
      sb.from("properties").select("id,social_yield_override").eq("is_active", true).limit(2000),
      sb.from("blog_articles").select("slug").eq("is_published", true).limit(2000),
      sb.from("social_posts").select(`${DRAFT_COLS},status,scheduled_at`).eq("status", "scheduled")
        .gte("scheduled_at", new Date(now.getTime() - 60 * 60_000).toISOString()).limit(500),
      sb.from("social_posts").select(DRAFT_COLS).eq("status", "draft").order("created_at").limit(1000),
    ]);
    const error = props.error || blogs.error || queued.error || drafts.error;
    if (error) throw new Error(error.message);
    const overrides = new Map<string, unknown>((props.data ?? []).map((p: { id: string; social_yield_override: unknown }) => [p.id, p.social_yield_override]));
    return {
      ctx: {
        activePropertyIds: new Set(overrides.keys()),
        publishedBlogSlugs: new Set((blogs.data ?? []).map((b: { slug: string }) => b.slug)),
        minCaption: cfg.min_caption,
      },
      overrides,
      queued: (queued.data ?? []) as Row[],
      drafts: (drafts.data ?? []) as Row[],
    };
  };

  /** Rule 1: every draft and scheduled post carries only the approved yield range (or the explicit property override). */
  const applyYieldGuard = async (rows: Row[], overrides: Map<string, unknown>) => {
    for (const row of rows) {
      const g = guardSocialPostYield(row, row.property_id ? overrides.get(row.property_id) : null);
      if (!g.changed) continue;
      yieldFixed++;
      Object.assign(row, { title: g.title, caption: g.caption, content_variants: g.content_variants });
      if (dryRun) continue;
      await sb.from("social_posts").update({ title: g.title, caption: g.caption, content_variants: g.content_variants })
        .eq("id", row.id).in("status", ["draft", "scheduled"]);
    }
  };

  /** Rule 2: write / clear the „Necesită corectare manuală” flag. */
  const setFlag = async (row: Row, next: string | null) => {
    row.last_error = next;
    if (next && isManualFixFlag(next)) flagged.push({ id: row.id, title: row.title ?? "(fără titlu)", reason: next.slice(MANUAL_FIX_PREFIX.length) });
    if (!dryRun) await sb.from("social_posts").update({ last_error: next }).eq("id", row.id).eq("status", "draft");
  };

  try {
    const slots = upcomingSlots(now, cfg);
    let state = await loadContext();
    await applyYieldGuard([...state.drafts, ...state.queued], state.overrides);
    for (const d of state.drafts) {
      const next = manualFixUpdate(d);
      if (next !== undefined) await setFlag(d, next);
      else if (isManualFixFlag(d.last_error)) flagged.push({ id: d.id, title: d.title ?? "(fără titlu)", reason: d.last_error!.slice(MANUAL_FIX_PREFIX.length) });
    }
    const scheduledFeed = () => state.queued.filter((r) => r.media_type !== "STORY");
    let free = freeSlots(slots, scheduledFeed().map((r) => new Date(r.scheduled_at!)));
    let eligible = state.drafts.filter((d) => isAutopilotEligible(d, state.ctx));
    let extracted = 0;

    // Ciorne insuficiente → completăm din conținutul local (fără scraping extern), o singură dată per conținut.
    if (eligible.length < free.length) {
      const need = Math.min(10, free.length - eligible.length + 2);
      const [properties, articles, existing, gallery] = await Promise.all([
        sb.from("properties").select("id,slug,name,description_ro,location,image_path,images,listing_type,capital_necesar,base_price_per_night,social_yield_override").eq("is_active", true).order("updated_at", { ascending: false }).limit(1000),
        sb.from("blog_articles").select("slug,title,excerpt,content,cover_image,main_image_url").eq("is_published", true).order("published_at", { ascending: false }).limit(1000),
        sb.from("social_posts").select("source_url,title,type,status").limit(10000),
        sb.from("property_images").select("property_id,image_path").eq("is_published", true).order("display_order").limit(10000),
      ]);
      const error = properties.error || articles.error || existing.error || gallery.error;
      if (error) throw new Error(error.message);
      const photos = new Map<string, string[]>();
      for (const row of gallery.data ?? []) photos.set(row.property_id, [...(photos.get(row.property_id) ?? []), row.image_path]);
      const fresh = localSocialRows(
        (properties.data ?? []).map((p: any) => ({ ...p, images: [...(p.images ?? []), ...(photos.get(p.id) ?? [])] })),
        articles.data ?? [],
        (v: string) => sb.storage.from("property-images").getPublicUrl(v).data.publicUrl,
      )
        .filter((r: any) => !isKnownSocialContent(r, existing.data ?? []))
        .map((r: any) => {
          const g = guardSocialPostYield({ title: r.title, caption: withTitleLine(r.title ?? "", r.caption ?? "") }, r.property_id ? state.overrides.get(r.property_id) : null);
          return { ...r, title: g.title, caption: g.caption, media_type: (r.image_urls?.length ?? 0) > 1 ? "CAROUSEL" : "IMAGE" };
        })
        .filter((r: any) => r.caption.length >= cfg.min_caption + (r.title?.length ?? 0)
          && !manualFixReason({ ...r, id: "new", last_error: null, created_at: "" }))
        .slice(0, need);
      if (fresh.length && !dryRun) {
        const ins = await sb.from("social_posts").upsert(fresh, { onConflict: "source_url", ignoreDuplicates: true }).select("id");
        if (ins.error) throw new Error(ins.error.message);
        extracted = ins.data?.length ?? 0;
        state = await loadContext();
        free = freeSlots(slots, scheduledFeed().map((r) => new Date(r.scheduled_at!)));
        eligible = state.drafts.filter((d) => isAutopilotEligible(d, state.ctx));
      } else extracted = dryRun ? fresh.length : 0;
    }

    // Rotație: continuăm alternanța după ultima postare din calendar înainte de primul slot liber.
    const before = scheduledFeed().filter((r) => !free[0] || new Date(r.scheduled_at!) < free[0])
      .sort((a, b) => b.scheduled_at!.localeCompare(a.scheduled_at!))[0];
    let after = before?.type ?? null;
    if (!after) {
      const { data: last } = await sb.from("social_posts").select("type").eq("status", "posted").neq("media_type", "STORY")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      after = last?.type ?? null;
    }

    // Verificarea media înainte de programare: o poză care nu se încarcă scoate ciorna din coadă.
    const verified: Row[] = [];
    let checks = 0;
    for (const d of orderDrafts(eligible, after) as Row[]) {
      if (verified.length >= free.length || checks >= 40) break;
      checks++;
      const problem = await mediaProblem(draftMediaUrls(d));
      if (problem) await setFlag(d, manualFixUpdate(d, problem) ?? `${MANUAL_FIX_PREFIX}${problem}`);
      else verified.push(d);
    }

    const plan = planSchedule(slots, scheduledFeed().map((r) => new Date(r.scheduled_at!)), verified, after);
    const done: { id: string; at: string }[] = [];
    if (!dryRun) {
      for (const item of plan) {
        const { data } = await sb.from("social_posts").update({ status: "scheduled", scheduled_at: item.at.toISOString() })
          .eq("id", item.id).eq("status", "draft").is("last_error", null).select("id");
        if (data?.length) done.push({ id: item.id, at: item.at.toISOString() });
      }
    }
    const filled = new Set((dryRun ? plan.map((p) => p.at.toISOString()) : done.map((d) => d.at)));
    const empty = free.filter((s) => !filled.has(s.toISOString()));
    const soonEmpty = empty.filter((s) => s.getTime() < now.getTime() + 48 * 3600_000);

    let alert: string | null = null;
    if (!dryRun && soonEmpty.length && body.notify !== false) {
      const list = flagged.slice(0, 5).map((f) => `• ${f.title.slice(0, 70)} — ${f.reason.slice(0, 120)}`).join("\n");
      const message =
        `⚠️ Autopilot social: ${soonEmpty.length} ${soonEmpty.length === 1 ? "slot liber" : "sloturi libere"} în următoarele 48h (10:00/18:00), primul: ${fmt(soonEmpty[0])}.\n` +
        (flagged.length
          ? `${flagged.length} ${flagged.length === 1 ? "ciornă necesită" : "ciorne necesită"} corectare manuală:\n${list}\n`
          : "Nu mai există ciorne publicabile. Adaugă o proprietate sau un articol nou.\n") +
        `https://realtrust.ro/admin?tab=social`;
      const relay = await relayToMake("social_autopilot_window_gap", {
        channel: "whatsapp", phones: ADMIN_WA_ALERT_NUMBERS, phone: ADMIN_WA_ALERT_NUMBERS[0], message,
        empty_slots: soonEmpty.map((s) => s.toISOString()), flagged_drafts: flagged.slice(0, 20),
      }, sb);
      alert = relay.ok ? "make" : "direct";
      // Make indisponibil → aceeași alertă direct pe WhatsApp, ca golul să nu treacă neobservat.
      if (!relay.ok) await sendAdminText(message).catch((e) => console.warn("[social-autopilot] admin WA failed:", e?.message));
    }

    return json({
      success: true, dry_run: dryRun, slots_per_day: cfg.slots, days_ahead: cfg.days_ahead,
      scheduled: dryRun ? plan.length : done.length, extracted, yield_fixed: yieldFixed,
      manual_fix: flagged, empty_slots: empty.length, empty_48h: soonEmpty.length, alert,
      next: (dryRun ? plan.map((p) => ({ id: p.id, at: p.at.toISOString() })) : done).slice(0, 20),
    });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
