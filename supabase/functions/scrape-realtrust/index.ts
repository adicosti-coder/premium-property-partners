// Social Engine · scanează realtrust.ro (Firecrawl) și salvează proprietăți/articole noi ca drafturi în social_posts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/adminAuth.ts";

const SITE = "https://realtrust.ro";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isProperty = (u: string) => /^https:\/\/(www\.)?realtrust\.ro\/proprietate\/[^/?#]+\/?$/.test(u);
const isBlog = (u: string) =>
  /^https:\/\/(www\.)?realtrust\.ro\/blog\/[^/?#]+\/?$/.test(u) && !/\/blog\/(categorie|locatie)\//.test(u);
const canon = (u: string) => u.replace("://www.", "://").replace(/[?#].*$/, "").replace(/\/$/, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return json({ success: false, error: "Firecrawl nu este configurat" }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const keywords: string[] = Array.isArray(body?.keywords)
      ? body.keywords.filter((k: unknown) => typeof k === "string").map((k: string) => k.toLowerCase().trim()).filter(Boolean).slice(0, 20)
      : [];

    const mapResp = await fetch("https://api.firecrawl.dev/v2/map", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: SITE, limit: 1000, includeSubdomains: false }),
    });
    const mapData = await mapResp.json().catch(() => ({}));
    if (!mapResp.ok) {
      console.error("firecrawl map", mapResp.status, mapData);
      return json({ success: false, error: `Firecrawl ${mapResp.status}: ${mapData?.error ?? "map eșuat"}` }, 502);
    }
    const rawLinks: unknown[] = mapData.links ?? mapData.data?.links ?? [];
    const links = [...new Set(rawLinks.map((l: any) => canon(typeof l === "string" ? l : l?.url ?? "")).filter(Boolean))];
    const kw = (u: string) => keywords.length === 0 || keywords.some((k) => u.toLowerCase().includes(k));
    const candidates = links.filter((u) => (isProperty(u) || isBlog(u)) && kw(u));

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await sb.from("social_posts").select("source_url");
    const known = new Set((existing ?? []).map((r: any) => canon(r.source_url)));
    const fresh = candidates.filter((u) => !known.has(u)).slice(0, 10);

    const rows: Array<Record<string, unknown>> = [];
    for (const url of fresh) {
      try {
        const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { console.error("scrape", url, r.status); continue; }
        const m = d.data?.metadata ?? d.metadata ?? {};
        const title = String(m.ogTitle || m.title || url.split("/").pop()?.replace(/-/g, " ") || "Fără titlu")
          .replace(/\s*[|–-]\s*RealTrust.*$/i, "").slice(0, 200);
        const img = Array.isArray(m.ogImage) ? m.ogImage[0] : m.ogImage || m.image || "";
        rows.push({ type: isProperty(url) ? "property" : "blog", title, source_url: url, image_url: String(img || ""), caption: "", status: "draft", posted_to: [] });
      } catch (e) { console.error("scrape err", url, e); }
    }

    let inserted = 0;
    if (rows.length) {
      const { data, error } = await sb.from("social_posts").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true }).select("id");
      if (error) return json({ success: false, error: error.message }, 500);
      inserted = data?.length ?? 0;
    }
    return json({ success: true, discovered: candidates.length, duplicates: candidates.length - fresh.length, inserted });
  } catch (e) {
    console.error("scrape-realtrust", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Eroare necunoscută" }, 500);
  }
});
