// Shared gate for internal automation endpoints (pg_cron / DB triggers / admin UI).
// Accepts:
//   - internal calls (x-webhook-secret = service role key, or x-cron-secret = vault secret)
//   - authenticated admin users (JWT with 'admin' role in public.user_roles)
// Everything else is rejected, so anonymous callers cannot burn AI credits/quota
// or mutate automation state.
import { isInternalCall } from "./cronAuth.ts";
import { requireAdmin } from "./adminAuth.ts";

/** Returns null when the caller is allowed, or a Response to return immediately. */
export async function requireInternalOrAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  if (await isInternalCall(req)) return null;

  const auth = await requireAdmin(req, corsHeaders);
  if (auth.ok) return null;

  return (
    auth.response ??
    new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  );
}
