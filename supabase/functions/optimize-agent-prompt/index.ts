// Re-antrenare Andrei: analizează apelurile reale și simulările din Laborator cu notă mică
// și salvează O propunere de prompt „pending” pentru aprobarea adminului. Nu aplică nimic singur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { AIError, callAI, MODELS } from "../_shared/aiClient.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: script } = await db.from("voice_agent_scripts").select("id, system_prompt").eq("is_active", true).maybeSingle();
  if (!script?.system_prompt) return json({ error: "Nu există un scenariu activ pentru Andrei" }, 404);
  const { data: pending } = await db.from("agent_prompts_history").select("id").eq("script_id", script.id).eq("status", "pending").maybeSingle();
  if (pending) return json({ status: "already_pending", id: pending.id });

  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data: calls } = await db.from("voice_call_analyses").select("source, score, weaknesses, prompt_fixes, outcome")
    .lte("score", 6).gte("created_at", since).order("created_at", { ascending: false }).limit(40);
  const rows = calls ?? [];
  if (rows.length < 3) return json({ status: "not_enough_data", failed_calls: rows.length });
  const real = rows.filter((r: any) => !String(r.source || "").startsWith("training_lab")).length;

  const digest = rows.map((r: any, i: number) =>
    `#${i + 1} [${String(r.source || "").startsWith("training_lab") ? "Laborator" : "apel real"}] nota ${r.score} · ${r.outcome ?? ""}\nSlăbiciuni: ${(r.weaknesses ?? []).slice(0, 3).join("; ")}\nCorecturi propuse: ${(r.prompt_fixes ?? []).slice(0, 2).join("; ")}`).join("\n\n").slice(0, 14000);

  try {
    const { content } = await callAI({
      model: MODELS.text, fallbackModel: MODELS.fallback, label: "optimize-agent-prompt",
      schema: { name: "prompt_opt", schema: { type: "object", additionalProperties: false, required: ["reasoning", "proposed_prompt"],
        properties: { reasoning: { type: "string" }, proposed_prompt: { type: "string" } } } },
      messages: [
        { role: "system", content: "Optimizezi scenariul de sistem al lui Andrei, asistent AI telefonic RealTrust Timișoara. Păstrezi structura și toate regulile existente; modifici doar ce rezolvă problemele repetate. Interzis să adaugi: procente noi, garanții, cumpărători/chiriași inventați, întâlniri la birou, București. Regulile de comision, STOP și acord WhatsApp se aplică separat și nu le contrazici. Răspunzi în română." },
        { role: "user", content: `SCENARIU CURENT:\n${script.system_prompt}\n\nAPELURI CU NOTĂ MICĂ (ultimele 14 zile):\n${digest}\n\nReturnează: reasoning = 3-6 puncte scurte cu problemele repetate și ce ai schimbat; proposed_prompt = scenariul complet îmbunătățit.` },
      ],
    });
    const proposed = String(content.proposed_prompt || "").trim();
    if (proposed.length < 200 || proposed === script.system_prompt) return json({ status: "no_change" });
    const { data: row, error } = await db.from("agent_prompts_history").insert({
      script_id: script.id, current_prompt: script.system_prompt, proposed_prompt: proposed.slice(0, 20000),
      reasoning: String(content.reasoning || "").slice(0, 4000),
      evidence: { failed_calls: rows.length, real_calls: real, lab_calls: rows.length - real, since },
      created_by: auth.userId === "00000000-0000-0000-0000-000000000000" ? null : auth.userId,
    }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    return json({ status: "created", id: row.id, failed_calls: rows.length });
  } catch (e) {
    const s = e instanceof AIError ? e.status : 500;
    return json({ error: e instanceof Error ? e.message : "Eroare" }, s === 402 || s === 429 ? s : 502);
  }
});
