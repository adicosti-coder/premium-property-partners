// E2E test: invokes voice-agent-e2e-test in simulate mode and asserts that
// (a) TwiML response contains a <Play> tag, and (b) ElevenLabs latency < 2s.
//
// Run with: deno test --allow-net --allow-env supabase/functions/voice-agent-e2e-test/index.test.ts
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  Deno.env.get("SUPABASE_ANON_KEY")!;
const ADMIN_JWT = Deno.env.get("ADMIN_TEST_JWT"); // optional: a real admin user's access_token

Deno.test({
  name: "voice-agent-e2e-test simulate: TwiML has <Play> and ElevenLabs < 2s",
  ignore: !ADMIN_JWT, // skip if no admin token provided locally
  async fn() {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-e2e-test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${ADMIN_JWT}`,
      },
      body: JSON.stringify({
        mode: "simulate",
        text:
          "Bună ziua, sunt Andrei de la RealTrust Timișoara. Am un apartament în Iosefin și unul la ApArt Hotel.",
      }),
    });
    const data = await res.json();
    assertEquals(res.status, 200, `HTTP ${res.status} → ${JSON.stringify(data)}`);
    assert(data.summary, "missing summary");
    assert(Array.isArray(data.checks), "missing checks array");

    const byName = Object.fromEntries(
      data.checks.map((c: any) => [c.name, c]),
    );

    // (a) TwiML <Play> tag
    assert(
      byName.twiml_play_tag_valid?.passed,
      `TwiML <Play> tag missing: ${JSON.stringify(byName.twiml_play_tag_valid)}`,
    );

    // (b) ElevenLabs responded under 2 seconds
    const latencyCheck = byName.elevenlabs_under_2s;
    assert(
      latencyCheck?.passed,
      `ElevenLabs latency >= 2000ms: ${JSON.stringify(latencyCheck?.details)}`,
    );
    assert(
      latencyCheck.details.latency_ms < 2000,
      `latency_ms=${latencyCheck.details.latency_ms} should be < 2000`,
    );

    // Overall verdict
    assertEquals(
      data.summary.verdict,
      "PASS",
      `verdict=${data.summary.verdict}, checks=${JSON.stringify(data.checks)}`,
    );
  },
});

Deno.test("voice-agent-e2e-test rejects unauthenticated callers", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-e2e-test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ mode: "simulate" }),
  });
  await res.text(); // drain body
  assert(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
});
