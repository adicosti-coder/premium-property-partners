// Returns a paragraph from the source URL where the anchor could be inserted.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function stripHtml(html: string): string[] {
  // crude paragraph extraction
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const matches = Array.from(text.matchAll(/<(?:p|h[1-6]|li)[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|li)>/gi));
  const paragraphs = matches
    .map(m => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(t => t.length > 60 && t.length < 1200);
  return paragraphs;
}

function scoreParagraph(p: string, anchor: string, target: string): number {
  const lp = p.toLowerCase();
  const tokens = anchor.toLowerCase().split(/\s+/).filter(t => t.length > 3);
  const targetTokens = target.toLowerCase().replace(/[\/\-_]/g, " ").split(/\s+/).filter(t => t.length > 3);
  let score = 0;
  for (const t of tokens) if (lp.includes(t)) score += 3;
  for (const t of targetTokens) if (lp.includes(t)) score += 1;
  return score;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth" }, 401);
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return json({ error: "Invalid token" }, 401);
    const { data: role } = await sb.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const { source_url_path, anchor_text, target_url_path } = await req.json();
    if (!source_url_path || !anchor_text) return json({ error: "missing params" }, 400);

    const url = `https://www.realtrust.ro${source_url_path}`;
    const res = await fetch(url, { headers: { "User-Agent": "RealTrustSEO/1.0" } });
    if (!res.ok) return json({ ok: false, error: `Fetch ${res.status}` });
    const html = await res.text();
    const paragraphs = stripHtml(html);
    if (!paragraphs.length) return json({ ok: true, paragraph: null });

    const ranked = paragraphs
      .map(p => ({ p, s: scoreParagraph(p, anchor_text, target_url_path || "") }))
      .sort((a, b) => b.s - a.s);
    const best = ranked[0];
    if (!best || best.s === 0) return json({ ok: true, paragraph: paragraphs[0], score: 0 });

    // Build preview with anchor inserted
    const anchorHtml = `<a href="${target_url_path}"><strong>${anchor_text}</strong></a>`;
    const lower = best.p.toLowerCase();
    const tokens = anchor_text.toLowerCase().split(/\s+/).filter((t: string) => t.length > 3);
    let insertAt = -1;
    for (const t of tokens) {
      const i = lower.indexOf(t);
      if (i >= 0) { insertAt = i; break; }
    }
    let highlighted = best.p;
    if (insertAt >= 0) {
      // Replace first sentence boundary near match
      const end = best.p.indexOf(".", insertAt);
      const cut = end > 0 ? end + 1 : best.p.length;
      highlighted = best.p.slice(0, cut) + ` ${anchorHtml} ` + best.p.slice(cut);
    } else {
      highlighted = `${best.p} ${anchorHtml}`;
    }

    return json({ ok: true, paragraph: best.p, preview_html: highlighted, score: best.s, total: paragraphs.length });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
