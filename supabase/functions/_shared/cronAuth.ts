// Shared internal-call auth for DB triggers / pg_cron.
// Accepts either:
//   x-cron-secret     === vault secret `cron_reconcile_secret` (via get_cron_reconcile_secret RPC)
//   x-webhook-secret  === SUPABASE_SERVICE_ROLE_KEY (legacy path)
import { createClient } from "npm:@supabase/supabase-js@2";

export function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

let cachedSecret: string | null = null;

async function getCronSecret(): Promise<string | null> {
  if (cachedSecret) return cachedSecret;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await supabase.rpc("get_cron_reconcile_secret");
    if (error || !data) return null;
    cachedSecret = String(data);
    return cachedSecret;
  } catch {
    return null;
  }
}

/** Returns true when the request is an authenticated internal call. */
export async function isInternalCall(req: Request): Promise<boolean> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const webhookSecret = req.headers.get("x-webhook-secret") || "";
  if (serviceKey && timingSafeEqual(webhookSecret, serviceKey)) return true;

  const cronHeader = req.headers.get("x-cron-secret") || "";
  if (!cronHeader) return false;
  const expected = await getCronSecret();
  return !!expected && timingSafeEqual(cronHeader, expected);
}
