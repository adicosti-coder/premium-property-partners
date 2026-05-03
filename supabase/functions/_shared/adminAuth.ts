// Shared admin auth helper for edge functions.
// Validates a Supabase JWT and confirms the user has the 'admin' role
// in public.user_roles. Returns the user_id on success, or a Response on failure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AdminAuthResult {
  ok: boolean;
  userId?: string;
  response?: Response;
}

export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AdminAuthResult> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const userId = userData.user.id;

  // Use service role to bypass RLS on user_roles read
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: roleRow } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleRow) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { ok: true, userId };
}

/**
 * Validates an internal webhook call from a Postgres trigger.
 * The trigger must send `x-webhook-secret: <SUPABASE_SERVICE_ROLE_KEY>`.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyInternalWebhook(
  req: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  const provided = req.headers.get("x-webhook-secret") || "";
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!expected || !timingSafeEqual(provided, expected)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
