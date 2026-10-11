import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* Admin-only diagnostic for outbound calls by Andrei.
   Reports which settings exist and whether ElevenLabs / Twilio accept them.
   Never returns secret values. */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Check = { key: string; label: string; ok: boolean; required: boolean; detail: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Auth required" }, 401);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Invalid token" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin required" }, 403);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");

    const checks: Check[] = [];

    // ElevenLabs key
    if (!ELEVENLABS_API_KEY) {
      checks.push({ key: "ELEVENLABS_API_KEY", label: "Cheie ElevenLabs", ok: false, required: true, detail: "Lipsește. Conectează ElevenLabs din Connectors." });
    } else {
      const r = await fetch("https://api.elevenlabs.io/v1/user", { headers: { "xi-api-key": ELEVENLABS_API_KEY } });
      const t = r.ok ? "" : (await r.text()).slice(0, 300);
      checks.push({
        key: "ELEVENLABS_API_KEY", label: "Cheie ElevenLabs", ok: r.ok, required: true,
        detail: r.ok ? "Setată și acceptată de ElevenLabs." : `ElevenLabs a răspuns ${r.status}: ${t}`,
      });
    }

    checks.push({
      key: "ELEVENLABS_AGENT_ID", label: "ID agent ElevenLabs", ok: true, required: false,
      detail: ELEVENLABS_AGENT_ID
        ? "Setat (opțional — apelurile pleacă prin Twilio, ElevenLabs dă vocea)."
        : "Nu e necesar: apelurile pleacă prin Twilio, iar ElevenLabs generează doar vocea lui Andrei.",
    });

    checks.push({
      key: "TWILIO_API_KEY", label: "Conexiune Twilio", ok: !!TWILIO_API_KEY && !!LOVABLE_API_KEY, required: true,
      detail: TWILIO_API_KEY ? "Conectorul Twilio este legat." : "Lipsește. Conectează Twilio din Connectors.",
    });

    if (!TWILIO_FROM_NUMBER) {
      checks.push({ key: "TWILIO_FROM_NUMBER", label: "Număr Twilio pentru apeluri", ok: false, required: true, detail: "Lipsește numărul de pe care sună Andrei (format +40…)." });
    } else if (TWILIO_API_KEY && LOVABLE_API_KEY) {
      const url = `https://connector-gateway.lovable.dev/twilio/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(TWILIO_FROM_NUMBER)}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TWILIO_API_KEY } });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        checks.push({ key: "TWILIO_FROM_NUMBER", label: "Număr Twilio pentru apeluri", ok: false, required: true, detail: `Twilio a răspuns ${r.status}: ${JSON.stringify(body).slice(0, 300)}` });
      } else {
        const num = body?.incoming_phone_numbers?.[0];
        const voice = num?.capabilities?.voice;
        checks.push({
          key: "TWILIO_FROM_NUMBER", label: "Număr Twilio pentru apeluri", ok: !!num && voice !== false, required: true,
          detail: !num
            ? "Numărul setat nu aparține contului Twilio conectat."
            : voice === false ? "Numărul există, dar nu are apeluri vocale activate." : "Numărul aparține contului și poate face apeluri.",
        });
      }
    }

    // Twilio account type (trial accounts can only call verified numbers)
    if (TWILIO_API_KEY && LOVABLE_API_KEY) {
      const r = await fetch("https://connector-gateway.lovable.dev/twilio/Accounts.json?PageSize=1", { headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TWILIO_API_KEY } });
      const body = await r.json().catch(() => ({}));
      const acc = body?.accounts?.[0];
      if (r.ok && acc) {
        const trial = acc.type === "Trial";
        checks.push({
          key: "TWILIO_ACCOUNT", label: "Cont Twilio", ok: acc.status === "active", required: true,
          detail: `${acc.status === "active" ? "Activ" : `Status: ${acc.status}`}${trial ? " · cont de probă (Trial): poate suna doar numere verificate în Twilio." : ""}`,
        });
      }
    }

    // Last failed call errors
    const { data: lastFails } = await supabase.from("voice_call_sessions")
      .select("created_at, error_message").not("error_message", "is", null)
      .order("created_at", { ascending: false }).limit(3);

    return json({ ready: checks.every((c) => !c.required || c.ok), checks, recent_errors: lastFails ?? [] });
  } catch (e) {
    console.error("voice-agent-config-check error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
