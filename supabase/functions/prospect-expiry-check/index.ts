// Reverificare anunțuri prospect_listings — detectează cele expirate pe sursă
// și le marchează `is_active=false` + `lifecycle_status='expired'`.
//
// Heuristics (fără Firecrawl, pentru cost minim):
//  - HTTP 404 / 410 / 451 → expirat
//  - Redirect către un URL „search" (ex. olx.ro/d/ → olx.ro/oferte/) → expirat
//  - Markeri text în HTML: "anunțul nu mai este disponibil", "anuntul a expirat",
//    "această ofertă nu mai este disponibilă", "no longer available", "removed",
//    "anuntul a fost dezactivat", "oferta a fost retrasă", etc.
//
// Body:
//   { limit?: number, mode?: 'batch'|'all', dry_run?: boolean, ids?: string[] }
// Default: batch de 60 (ordonat după last_expiry_check_at NULLS FIRST).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const EXPIRED_MARKERS: RegExp[] = [
  /anun[țt]ul nu mai este (disponibil|activ)/i,
  /anun[țt]ul a expirat/i,
  /anun[țt]ul a fost (dezactivat|[șs]ters|retras|eliminat)/i,
  /aceast[ăa] ofert[ăa] nu mai este disponibil[ăa]/i,
  /oferta a fost (retras[ăa]|dezactivat[ăa]|[șs]tears[ăa])/i,
  /this (ad|listing|offer) is no longer available/i,
  /listing (has been )?removed/i,
  /no longer available/i,
  /ne g[ăa]sim aceast[ăa] pagin[ăa]/i,
  /pagina (cerut[ăa] )?nu (a fost g[ăa]sit[ăa]|exist[ăa])/i,
  // OLX specific
  /to og[łl]oszenie nie jest ju[żz] aktualne/i, // PL fallback
  /og[łl]oszenie zosta[łl]o usuni[ęe]te/i,
  // imobiliare.ro
  /anun[țt] inactiv/i,
];

function isSearchLikeUrl(u: string): boolean {
  const low = u.toLowerCase();
  // OLX: oferta single page is /d/oferta/... — listing pages are /oferte/...
  if (/olx\.ro\/(oferte|d\/oferte)\//.test(low) && !/\/d\/oferta\//.test(low)) return true;
  // storia/imobiliare: redirect 404 page often
  if (/\/404(\b|\/|\?)/.test(low)) return true;
  if (/\/error(\b|\/|\?)/.test(low)) return true;
  return false;
}

async function checkUrl(url: string): Promise<{ expired: boolean; reason: string; status: number }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });

    const status = res.status;
    const finalUrl = res.url || url;

    if (status === 404 || status === 410 || status === 451) {
      try { await res.body?.cancel(); } catch { /* */ }
      return { expired: true, reason: `http_${status}`, status };
    }

    // Redirect-based detection
    if (finalUrl && finalUrl !== url && isSearchLikeUrl(finalUrl)) {
      try { await res.body?.cancel(); } catch { /* */ }
      return { expired: true, reason: `redirect_to_search: ${finalUrl.slice(0, 120)}`, status };
    }

    if (!res.ok) {
      try { await res.body?.cancel(); } catch { /* */ }
      // 5xx / 403 — nu marca expirat, e doar eroare temporară
      return { expired: false, reason: `http_${status}`, status };
    }

    const html = await res.text();
    // Only inspect the first ~120kb to keep it fast
    const slice = html.slice(0, 120_000);
    for (const re of EXPIRED_MARKERS) {
      if (re.test(slice)) {
        return { expired: true, reason: `marker: ${re.source.slice(0, 60)}`, status };
      }
    }

    return { expired: false, reason: "ok", status };
  } catch (e: any) {
    const msg = e?.name === "TimeoutError" ? "timeout" : (e?.message || String(e)).slice(0, 120);
    return { expired: false, reason: `error:${msg}`, status: 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(1, Number(body?.limit) || 60), 200);
    const mode = body?.mode === "all" ? "all" : "batch";
    const dryRun = !!body?.dry_run;
    const ids: string[] | null = Array.isArray(body?.ids) && body.ids.length > 0 ? body.ids : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase
      .from("prospect_listings")
      .select("id, source_url, title, admin_notes, last_expiry_check_at")
      .eq("is_active", true)
      .not("source_url", "is", null);

    if (ids) {
      query = query.in("id", ids);
    } else if (mode === "batch") {
      query = query
        .order("last_expiry_check_at", { ascending: true, nullsFirst: true })
        .limit(limit);
    } else {
      query = query.limit(Math.min(limit, 200));
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const results = {
      processed: 0,
      expired: 0,
      ok: 0,
      errors: 0,
      dry_run: dryRun,
      details: [] as Array<{ id: string; title: string | null; reason: string; expired: boolean }>,
    };

    const concurrency = 6;
    const queue = [...(rows || [])];
    const nowIso = new Date().toISOString();

    async function worker() {
      while (queue.length > 0) {
        const r = queue.shift();
        if (!r) break;
        const url = r.source_url as string;
        const check = await checkUrl(url);
        results.processed++;
        if (check.expired) results.expired++;
        else if (check.reason.startsWith("error") || check.reason.startsWith("http_5")) results.errors++;
        else results.ok++;

        results.details.push({ id: r.id, title: r.title, reason: check.reason, expired: check.expired });

        if (dryRun) continue;

        const newNote = `[expiry-check ${nowIso.slice(0, 16)}] ${check.expired ? "EXPIRAT" : "ok"}: ${check.reason}`;
        if (check.expired) {
          await supabase
            .from("prospect_listings")
            .update({
              is_active: false,
              lifecycle_status: "expired",
              last_expiry_check_at: nowIso,
              expiry_check_status: "expired",
              admin_notes: [r.admin_notes, newNote].filter(Boolean).join("\n"),
            })
            .eq("id", r.id);
        } else {
          await supabase
            .from("prospect_listings")
            .update({
              last_expiry_check_at: nowIso,
              expiry_check_status: check.reason.startsWith("error") || check.reason.startsWith("http_5") ? "error" : "ok",
            })
            .eq("id", r.id);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[prospect-expiry-check] error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
