// External Keys Healthcheck — validates Google Service Account (GA4) and
// ElevenLabs API key. Logs results to external_keys_health and alerts on failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
};

async function checkGoogleSA(): Promise<{ ok: boolean; status?: number; message: string }> {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
  if (!raw) return { ok: false, message: "GOOGLE_SERVICE_ACCOUNT_KEY missing" };
  try {
    const sa = JSON.parse(raw);
    const key = await crypto.subtle.importKey(
      "pkcs8", pemToArrayBuffer(sa.private_key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
    );
    const jwt = await create({ alg: "RS256", typ: "JWT" }, {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: getNumericDate(0), exp: getNumericDate(3600),
    }, key);
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    });
    const data = await r.json();
    if (!r.ok) return { ok: false, status: r.status, message: data?.error_description || JSON.stringify(data) };
    return { ok: true, status: 200, message: "Token issued OK" };
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}

async function checkElevenLabs(): Promise<{ ok: boolean; status?: number; message: string }> {
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return { ok: false, message: "ELEVENLABS_API_KEY missing" };
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": key, "accept": "application/json" },
    });
    if (!r.ok) {
      const text = await r.text();
      return { ok: false, status: r.status, message: text.slice(0, 200) };
    }
    const data = await r.json();
    return { ok: true, status: 200, message: `OK (subscription tier: ${data?.subscription?.tier ?? "?"})` };
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const t0 = Date.now();
  await sb.from("cron_run_log").insert({ job_name: "external-keys-healthcheck", status: "started" });

  const [google, eleven] = await Promise.all([checkGoogleSA(), checkElevenLabs()]);

  await sb.from("external_keys_health").insert([
    { provider: "google_service_account", is_valid: google.ok, status_code: google.status ?? null, message: google.message },
    { provider: "elevenlabs", is_valid: eleven.ok, status_code: eleven.status ?? null, message: eleven.message },
  ]);

  const failures: string[] = [];
  if (!google.ok) failures.push(`Google SA: ${google.message}`);
  if (!eleven.ok) failures.push(`ElevenLabs: ${eleven.message}`);

  if (failures.length) {
    await sb.from("admin_audit_log").insert({
      action: "external_key_invalid",
      actor_label: "external-keys-healthcheck",
      entity_type: "secrets",
      severity: "error",
      details: { google, eleven },
    });
    const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await sb.from("user_notifications").insert(admins.map((a: any) => ({
        user_id: a.user_id,
        title: "🔑 Cheie externă invalidă",
        message: `Verificare zilnică: ${failures.join(" | ")}`,
        type: "error",
        action_url: "/admin",
        action_label: "Vezi detalii",
      })));
    }
  }

  await sb.from("cron_run_log").insert({
    job_name: "external-keys-healthcheck",
    status: "success",
    duration_ms: Date.now() - t0,
    details: { google, eleven },
  });

  return new Response(JSON.stringify({ ok: failures.length === 0, google, eleven }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
