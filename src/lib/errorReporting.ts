/**
 * Centralized error reporting payload for application-level failures
 * (data fetches, form submits, third-party calls).
 *
 * Wire-shape is stable so Make.com / external monitoring scenarios can
 * be built against it without coupling to React internals.
 *
 * The endpoint is read from `VITE_MAKE_ERROR_WEBHOOK_URL`. When unset
 * (e.g. local dev), `reportError` becomes a no-op except for the console
 * log so we never block the UI on telemetry.
 */

export type AppErrorContext = {
  /** Logical area: "listings", "filters", "property_card", "form:lead", ... */
  scope: string;
  /** Optional route path; defaults to current location */
  route?: string;
  /** Free-form extra metadata (ids, queryKey, http status, etc.) */
  meta?: Record<string, unknown>;
};

export type AppErrorPayload = {
  source: "realtrust.web";
  level: "error" | "warning";
  scope: string;
  route: string;
  message: string;
  stack?: string;
  user_agent: string;
  ts: string;
  meta?: Record<string, unknown>;
};

const WEBHOOK_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_MAKE_ERROR_WEBHOOK_URL) ||
  "";

export const buildErrorPayload = (
  error: unknown,
  ctx: AppErrorContext,
  level: AppErrorPayload["level"] = "error",
): AppErrorPayload => {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    source: "realtrust.web",
    level,
    scope: ctx.scope,
    route:
      ctx.route ||
      (typeof window !== "undefined" ? window.location.pathname + window.location.search : ""),
    message: err.message || "Unknown error",
    stack: err.stack,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    ts: new Date().toISOString(),
    meta: ctx.meta,
  };
};

export const reportError = (
  error: unknown,
  ctx: AppErrorContext,
  level: AppErrorPayload["level"] = "error",
): void => {
  const payload = buildErrorPayload(error, ctx, level);
  // Always log locally for dev visibility
  // eslint-disable-next-line no-console
  console.error(`[reportError:${payload.scope}]`, payload.message, payload.meta ?? {});
  if (!WEBHOOK_URL) return;
  try {
    // Fire-and-forget; keepalive lets it survive page transitions.
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      mode: "no-cors",
    }).catch(() => {});
  } catch {
    /* swallow — telemetry must never break UX */
  }
};
