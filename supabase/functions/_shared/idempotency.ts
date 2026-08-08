/**
 * Idempotency guard backed by the `request_idempotency` table (30s TTL).
 *
 * Usage:
 *   const guard = await beginIdempotent(supabase, "submit-lead", req);
 *   if (guard.replay) return guard.replay;      // duplicate / parallel call
 *   ... do the work ...
 *   await guard.finish(payload);                // cache the response body
 */

// deno-lint-ignore no-explicit-any
type Client = any;

const TTL_SECONDS = 30;

export interface IdempotencyGuard {
  key: string | null;
  /** Non-null when the request is a replay: return it as-is. */
  replay: Response | null;
  finish: (payload: unknown) => Promise<void>;
}

export async function beginIdempotent(
  supabase: Client,
  scope: string,
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<IdempotencyGuard> {
  const key = (req.headers.get("x-idempotency-key") || "").trim().slice(0, 128);
  const noop: IdempotencyGuard = { key: null, replay: null, finish: async () => {} };
  if (!key) return noop;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json", "x-idempotent-replay": "1" },
    });

  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();

  // Atomic claim: the primary key (scope, key) rejects any parallel second call.
  const { error } = await supabase
    .from("request_idempotency")
    .insert({ key, scope, expires_at: expiresAt });

  if (error) {
    if (error.code === "23505") {
      // Someone already claimed this key. Return the cached response if the
      // first call finished, otherwise tell the client it's already in flight.
      const { data } = await supabase
        .from("request_idempotency")
        .select("response, expires_at")
        .eq("scope", scope)
        .eq("key", key)
        .maybeSingle();

      const stale = data?.expires_at && new Date(data.expires_at).getTime() < Date.now();
      if (stale) {
        // Expired claim → let this request through and refresh the TTL.
        await supabase
          .from("request_idempotency")
          .update({ response: null, expires_at: expiresAt })
          .eq("scope", scope)
          .eq("key", key);
      } else {
        return {
          key,
          replay: json(
            data?.response ?? { success: true, duplicate: true, pending: true },
          ),
          finish: async () => {},
        };
      }
    } else {
      // Cache unavailable → fail open, never block a real lead.
      console.error("idempotency claim failed (failing open):", error);
      return noop;
    }
  }

  return {
    key,
    replay: null,
    finish: async (payload: unknown) => {
      try {
        await supabase
          .from("request_idempotency")
          .update({ response: payload as never })
          .eq("scope", scope)
          .eq("key", key);
      } catch (e) {
        console.error("idempotency finish failed:", e);
      }
    },
  };
}
