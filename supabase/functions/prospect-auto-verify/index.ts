// Verificare automată în fundal pentru anunțurile noi de proprietari:
//   1. telefon (prospect-listings-fetch-phone)
//   2. scor AI (prospect-ai-scorer)
//   3. analiză poze (property-vision-score)
//
// Rulează din cron sau imediat după o căutare în Admin ("verificare în fundal"),
// cu lot limitat, lease single-flight, marcare idempotentă și circuit breaker.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLATFORMS = ["olx.ro", "storia.ro", "publi24.ro", "homezz.ro"];
const MAX_ATTEMPTS = 4;
const RETRY_AFTER_MIN = 20;
const LEASE_MINUTES = 5;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const ids = Array.isArray(body.prospect_ids) ? (body.prospect_ids as string[]).slice(0, 25) : null;
    const urls = Array.isArray(body.source_urls) ? (body.source_urls as string[]).slice(0, 40) : null;
    let limit = Math.max(1, Math.min(10, Number(body.limit) || 3));
    const resume = body.resume === true;

    // ── circuit breaker + single-flight lease ───────────────────────────────
    const { data: state } = await supabase
      .from("prospect_auto_verify_state")
      .select("paused, pause_reason, lease_until, updated_at")
      .eq("id", 1)
      .maybeSingle();

    // Cota Gemini se resetează la miezul nopții ora Pacific. Dacă pauza e din cauza cotei
    // și între timp a venit o zi nouă, reluăm automat cu UN singur anunț de probă.
    const pacificDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    const quotaPause = state?.paused && /cota|quota|RESOURCE_EXHAUSTED/i.test(state.pause_reason || "");
    const newQuotaDay = quotaPause && state?.updated_at &&
      pacificDay(new Date(state.updated_at)) !== pacificDay(new Date());
    let probeOnly = false;

    if (resume || newQuotaDay) {
      await supabase.from("prospect_auto_verify_state")
        .update({ paused: false, pause_reason: null, updated_at: new Date().toISOString() }).eq("id", 1);
      probeOnly = !!newQuotaDay && !resume;
    } else if (state?.paused) {
      return json({ skipped: "paused", reason: state.pause_reason });
    }

    const now = Date.now();
    if (state?.lease_until && new Date(state.lease_until).getTime() > now) {
      return json({ skipped: "already_running", lease_until: state.lease_until });
    }
    await supabase.from("prospect_auto_verify_state").update({
      lease_until: new Date(now + LEASE_MINUTES * 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", 1);

    const releaseLease = () =>
      supabase.from("prospect_auto_verify_state")
        .update({ lease_until: null, last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", 1);

    // ── candidați ──────────────────────────────────────────────────────────
    let q = supabase
      .from("prospect_listings")
      .select("id, source_url, source_platform, phone_normalized, contact_phone, ai_scored_at, quality_score, images, auto_verify_attempts")
      .eq("is_active", true)
      .not("source_url", "is", null)
      .lt("auto_verify_attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (ids?.length) {
      q = q.in("id", ids);
    } else if (urls?.length) {
      q = q.in("source_url", urls);
    } else {
      const platformFilter = PLATFORMS.map((p) => `source_platform.ilike.%${p}%`).join(",");
      q = q
        .or(platformFilter)
        .gte("created_at", new Date(now - 14 * 86_400_000).toISOString())
        .or(`auto_verify_last_at.is.null,auto_verify_last_at.lt.${new Date(now - RETRY_AFTER_MIN * 60_000).toISOString()}`);
    }

    const { data: candidates, error: candErr } = await q;
    if (candErr) throw candErr;

    const pending = (candidates ?? []).filter(
      (r) => !r.phone_normalized || !r.ai_scored_at || r.quality_score === null,
    );
    if (pending.length === 0) {
      await releaseLease();
      return json({ success: true, processed: 0, note: "nothing_to_verify" });
    }

    // Buget total sub limita platformei; fiecare apel are propriul plafon.
    const deadline = now + 110_000;
    const callFn = async (name: string, payload: unknown) => {
      const remaining = deadline - Date.now() - 5_000;
      if (remaining < 5_000) return { status: 0, ok: false, data: { timeout: true } as any };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.min(45_000, remaining));
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            "x-webhook-secret": SERVICE_KEY,
          },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        const text = await res.text();
        let parsed: any = {};
        try { parsed = JSON.parse(text); } catch { /* text simplu */ }
        return { status: res.status, ok: res.ok, data: parsed };
      } catch {
        // Timeout propriu: tratat ca „reîncercare mai târziu".
        return { status: 504, ok: false, data: { timeout: true } };
      } finally {
        clearTimeout(timer);
      }
    };

    const results: Array<Record<string, unknown>> = [];
    let paused: string | null = null;

    for (const row of pending) {
      if (Date.now() > deadline - 15_000) break;
      // Marcăm încercarea înainte de apeluri, ca un anunț lent să nu fie reluat la nesfârșit.
      await supabase.from("prospect_listings").update({
        auto_verify_attempts: (row.auto_verify_attempts ?? 0) + 1,
        auto_verify_last_at: new Date().toISOString(),
      }).eq("id", row.id);
      const steps: Record<string, string> = {};

      if (!row.phone_normalized && !row.contact_phone) {
        const r = await callFn("prospect-listings-fetch-phone", { prospect_id: row.id });
        steps.phone = r.data?.found ? "found" : r.ok ? "not_found" : `error_${r.status}`;
      } else {
        steps.phone = "existing";
      }

      if (!row.ai_scored_at) {
        const r = await callFn("prospect-ai-scorer", { prospect_id: row.id });
        if (r.status === 402 || r.status === 403 || r.data?.code === "gemini_key_invalid") {
          paused = r.data?.error || `scoring_blocked_${r.status}`;
          steps.score = "blocked";
        } else if (r.status === 429 || r.status >= 500) {
          // „serviciu supraaglomerat" — nu blocăm anunțul, se reia la următoarea rulare.
          steps.score = "retry_later";
        } else {
          steps.score = r.ok ? "scored" : `error_${r.status}`;
        }
      } else {
        steps.score = "existing";
      }

      if (row.quality_score === null && Array.isArray(row.images) && row.images.length > 0 && !paused) {
        const r = await callFn("property-vision-score", { prospect_id: row.id });
        if (r.status === 402 || r.status === 403) {
          paused = r.data?.error || `vision_blocked_${r.status}`;
          steps.photos = "blocked";
        } else {
          steps.photos = r.ok ? "analyzed" : r.status === 429 || r.status >= 500 ? "retry_later" : `error_${r.status}`;
        }
      } else {
        steps.photos = row.quality_score !== null ? "existing" : "no_images";
      }

      const retryLater = Object.values(steps).includes("retry_later");
      await supabase.from("prospect_listings").update({
        auto_verify_status: paused ? "blocat" : retryLater ? "reîncercare" : "verificat",
      }).eq("id", row.id);

      results.push({ id: row.id, ...steps });
      if (paused) break;
    }

    if (paused) {
      await supabase.from("prospect_auto_verify_state").update({
        paused: true,
        pause_reason: String(paused).slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", 1);
    }
    await releaseLease();

    return json({ success: true, processed: results.length, paused, results });
  } catch (e) {
    await supabase.from("prospect_auto_verify_state")
      .update({ lease_until: null, updated_at: new Date().toISOString() }).eq("id", 1);
    console.error("prospect-auto-verify error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
