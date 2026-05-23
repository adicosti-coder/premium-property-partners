import { requireAdmin } from "../_shared/adminAuth.ts";
// Ghosting Detection: scans recent calls, flags 3+ consecutive no-answer profiles,
// generates a Last Chance WhatsApp draft via Gemini, queues for admin approval.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const NO_ANSWER_STATUSES = ["no-answer", "busy", "failed", "no_answer"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __auth = await requireAdmin(req, corsHeaders);
  if (!__auth.ok) return __auth.response!;

  try {
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get last 200 calls grouped by caller_profile_id
    const { data: calls } = await supabase
      .from("voice_call_sessions")
      .select("id, caller_profile_id, to_number, status, ai_summary, prospect_listing_id, started_at")
      .order("started_at", { ascending: false })
      .limit(300);
    if (!calls?.length) return json({ flagged: 0, queued: 0 });

    // Group by phone
    const byPhone = new Map<string, any[]>();
    for (const c of calls) {
      if (!c.to_number) continue;
      const arr = byPhone.get(c.to_number) || [];
      arr.push(c);
      byPhone.set(c.to_number, arr);
    }

    let flagged = 0, queued = 0;
    for (const [phone, list] of byPhone) {
      const recent = list.slice(0, 3);
      if (recent.length < 3) continue;
      const allNoAnswer = recent.every((c) => NO_ANSWER_STATUSES.includes(String(c.status || "").toLowerCase()));
      if (!allNoAnswer) continue;

      // Check if already in queue (pending)
      const { data: existing } = await supabase
        .from("voice_ghosting_queue").select("id")
        .eq("phone_normalized", phone).eq("status", "pending").maybeSingle();
      if (existing) continue;

      flagged++;

      // Update profile
      if (recent[0].caller_profile_id) {
        await supabase.from("voice_caller_profiles").update({
          is_ghosting: true,
          consecutive_no_answer: 3,
          last_no_answer_at: recent[0].started_at,
        }).eq("id", recent[0].caller_profile_id);
      }

      // Build context from prospect + last summaries
      let prospectInfo = "";
      const pid = recent.find((c) => c.prospect_listing_id)?.prospect_listing_id;
      if (pid) {
        const { data: p } = await supabase
          .from("prospect_listings").select("title, zone, category, lead_score").eq("id", pid).maybeSingle();
        if (p) prospectInfo = `Anunț: ${p.title || ""} | ${p.zone || ""} | ${p.category || ""} (scor ${p.lead_score || "-"})`;
      }
      const summaries = recent.map((c) => c.ai_summary).filter(Boolean).slice(0, 2).join(" | ");

      const prompt = `Generează un mesaj WhatsApp scurt (max 280 caractere), politicos, de "Last Chance" pentru un proprietar din Timișoara care nu a răspuns la 3 apeluri ale lui Andrei (concierge RealTrust).
${prospectInfo}
Note anterioare: ${summaries || "—"}

Reguli: tu (informal, dar respectuos), fără emoji excesive, oferă un singur CTA clar (răspuns DA/NU sau buton de programare). Nu menționa "ultimul apel". Răspunde DOAR cu textul mesajului, fără ghilimele.`;

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "Ești copywriter WhatsApp. Răspunzi doar cu textul mesajului." },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        }),
      });
      let draft = `Bună ziua! Sunt Andrei de la RealTrust Timișoara. Am încercat să vă contactez în ultimele zile. Mai sunteți interesat să discutăm despre proprietatea dvs.? Un simplu DA/NU mă ajută să nu vă mai deranjez. Mulțumesc!`;
      if (r.ok) {
        const j = await r.json();
        const t = j.choices?.[0]?.message?.content?.trim();
        if (t) draft = t.slice(0, 500);
      }

      await supabase.from("voice_ghosting_queue").insert({
        prospect_id: pid || null,
        caller_profile_id: recent[0].caller_profile_id || null,
        phone_normalized: phone,
        no_answer_count: 3,
        context_summary: `${prospectInfo} ${summaries}`.trim().slice(0, 800),
        draft_message: draft,
        status: "pending",
      });
      queued++;
    }

    return json({ flagged, queued });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
