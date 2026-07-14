// Auto-translate blog article title + excerpt (and optionally content) to English
// using Lovable AI Gateway. Fills in title_en / excerpt_en / content_en when missing.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const MODEL = "google/gemini-2.5-flash";

interface Row {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  title_en: string | null;
  excerpt_en: string | null;
  content_en: string | null;
  translation_locked: boolean | null;
}

async function translate(
  apiKey: string,
  fields: { title: string; excerpt: string; content?: string; withContent: boolean },
): Promise<{ title_en: string; excerpt_en: string; content_en?: string }> {
  const sys =
    "You translate Romanian real-estate/tourism blog copy into natural, professional English for an international audience. Keep proper nouns (Timișoara, ISHO, Iulius Town, RealTrust, ApArt Hotel, ANAF, Continental) as-is. Keep numbers, prices, and units unchanged. If input is Markdown, preserve formatting exactly. Return STRICT JSON only.";

  const schemaHint = fields.withContent
    ? '{"title_en":"...","excerpt_en":"...","content_en":"..."}'
    : '{"title_en":"...","excerpt_en":"..."}';

  const user = `Translate the following Romanian blog fields to English. Reply ONLY with JSON matching: ${schemaHint}\n\nTITLE:\n${fields.title}\n\nEXCERPT:\n${fields.excerpt}${
    fields.withContent ? `\n\nCONTENT (Markdown):\n${fields.content}` : ""
  }`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return {
    title_en: String(parsed.title_en ?? "").trim(),
    excerpt_en: String(parsed.excerpt_en ?? "").trim(),
    ...(fields.withContent ? { content_en: String(parsed.content_en ?? "").trim() } : {}),
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    let body: { limit?: number; includeContent?: boolean; articleId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // no body — defaults
    }
    const limit = Math.min(Math.max(body.limit ?? 8, 1), 25);
    const includeContent = body.includeContent === true;

    // Select articles missing English translation (title_en OR excerpt_en null/empty)
    // and NOT translation_locked (manual edits are protected)
    let query = supabase
      .from("blog_articles")
      .select("id,title,excerpt,content,title_en,excerpt_en,content_en,translation_locked")
      .eq("is_published", true)
      .limit(limit);

    if (body.articleId) {
      query = query.eq("id", body.articleId);
    } else {
      query = query.or("title_en.is.null,excerpt_en.is.null").eq("translation_locked", false);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const items = (rows ?? []) as Row[];
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const row of items) {
      try {
        if (row.translation_locked) {
          results.push({ id: row.id, ok: false, error: "translation_locked" });
          continue;
        }
        const needsContent = includeContent && !row.content_en && !!row.content;
        const out = await translate(apiKey, {
          title: row.title ?? "",
          excerpt: row.excerpt ?? "",
          content: row.content ?? "",
          withContent: needsContent,
        });

        const update: Record<string, string> = {};
        if (!row.title_en && out.title_en) update.title_en = out.title_en;
        if (!row.excerpt_en && out.excerpt_en) update.excerpt_en = out.excerpt_en;
        if (needsContent && out.content_en) update.content_en = out.content_en;

        if (Object.keys(update).length > 0) {
          const { error: upErr } = await supabase
            .from("blog_articles")
            .update(update)
            .eq("id", row.id);
          if (upErr) throw upErr;
        }
        results.push({ id: row.id, ok: true });
      } catch (e) {
        results.push({ id: row.id, ok: false, error: (e as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: corsHeaders },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
