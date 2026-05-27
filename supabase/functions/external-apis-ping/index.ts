// Quick latency probes for ElevenLabs + Supabase Functions self-roundtrip.
// Used by admin "Status API-uri Externe (Live Integration Check)" widget.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type ProbeResult = {
  name: string;
  ok: boolean;
  status: "green" | "amber" | "red";
  latency_ms: number | null;
  http_status?: number;
  message?: string;
};

const classify = (ms: number, ok: boolean): "green" | "amber" | "red" => {
  if (!ok) return "red";
  if (ms > 1500) return "red";
  if (ms > 700) return "amber";
  return "green";
};

async function probeElevenLabs(): Promise<ProbeResult> {
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return { name: "ElevenLabs API", ok: false, status: "red", latency_ms: null, message: "Missing key" };
  const t0 = performance.now();
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": key },
      signal: AbortSignal.timeout(5000),
    });
    const ms = Math.round(performance.now() - t0);
    return {
      name: "ElevenLabs API", ok: r.ok, status: classify(ms, r.ok),
      latency_ms: ms, http_status: r.status,
      message: r.ok ? "OK" : `HTTP ${r.status}`,
    };
  } catch (e: any) {
    return { name: "ElevenLabs API", ok: false, status: "red", latency_ms: null, message: e?.message || "timeout" };
  }
}

async function probeSupabaseFunctions(): Promise<ProbeResult> {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) return { name: "Supabase Functions", ok: false, status: "red", latency_ms: null, message: "Missing URL" };
  const t0 = performance.now();
  try {
    // OPTIONS hit on ourselves — exercises the functions router roundtrip.
    const r = await fetch(`${url}/functions/v1/external-apis-ping`, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(5000),
    });
    const ms = Math.round(performance.now() - t0);
    return {
      name: "Supabase Functions", ok: r.ok, status: classify(ms, r.ok),
      latency_ms: ms, http_status: r.status, message: r.ok ? "OK" : `HTTP ${r.status}`,
    };
  } catch (e: any) {
    return { name: "Supabase Functions", ok: false, status: "red", latency_ms: null, message: e?.message || "timeout" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const [eleven, sb] = await Promise.all([probeElevenLabs(), probeSupabaseFunctions()]);
  return new Response(JSON.stringify({
    probes: [eleven, sb],
    checked_at: new Date().toISOString(),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
