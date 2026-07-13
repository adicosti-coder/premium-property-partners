/**
 * Centralized error reporting payload for application-level failures
 * (data fetches, form submits, third-party calls).
 *
 * Wire shape is stable so Make.com / external monitoring scenarios and the
 * admin "Blog Error Feed" can consume it without coupling to React internals.
 *
 * `reportError` returns a Correlation ID (also embedded in the payload) so
 * calling code can surface it in the UI — this lets a user quote the ID and
 * the admin can locate the exact row instantly in `frontend_error_logs`.
 */

import { supabase } from "@/lib/supabaseClient";

export type AppErrorContext = {
  /** Logical area: "listings", "filters", "property_card", "form:lead", "blog_article_fetch", ... */
  scope: string;
  /** Optional route path; defaults to current location */
  route?: string;
  /** Free-form extra metadata (ids, queryKey, http status, etc.) */
  meta?: Record<string, unknown>;
};

export type AppErrorPayload = {
  source: "realtrust.web";
  level: "error" | "warning";
  correlation_id: string;
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

/**
 * Generate a short, human-friendly correlation ID.
 * Format: `err_<timestamp36>_<random8>` — easy to read out over the phone.
 */
const generateCorrelationId = (): string => {
  const ts = Date.now().toString(36);
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `err_${ts}_${rand}`;
};

export const buildErrorPayload = (
  error: unknown,
  ctx: AppErrorContext,
  level: AppErrorPayload["level"] = "error",
  correlationId: string = generateCorrelationId(),
): AppErrorPayload => {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    source: "realtrust.web",
    level,
    correlation_id: correlationId,
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

/**
 * Persist the error row to `public.frontend_error_logs` (anon INSERT allowed).
 * Fire-and-forget — telemetry must never break UX.
 */
const persistToDb = (payload: AppErrorPayload): void => {
  try {
    void supabase
      .from("frontend_error_logs")
      .insert([
        {
          correlation_id: payload.correlation_id,
          scope: payload.scope,
          level: payload.level,
          route: payload.route,
          message: payload.message.slice(0, 2000),
          user_agent: payload.user_agent?.slice(0, 500),
          meta: (payload.meta ?? null) as never,
        },
      ])
      .then(({ error }) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.warn(`[reportError:db] insert failed`, error.message);
        }
      });
  } catch {
    /* swallow */
  }
};

/**
 * Report an application error. Returns the Correlation ID so the caller
 * can display it in the UI ("Cod referință: err_xxx_xxx").
 */
export const reportError = (
  error: unknown,
  ctx: AppErrorContext,
  level: AppErrorPayload["level"] = "error",
): string => {
  const correlationId = generateCorrelationId();
  const payload = buildErrorPayload(error, ctx, level, correlationId);

  // eslint-disable-next-line no-console
  console.error(
    `[reportError:${payload.scope}][${correlationId}]`,
    payload.message,
    payload.meta ?? {},
  );

  // Persist for the admin Blog Error Feed panel.
  persistToDb(payload);

  // Optional external monitoring (Make.com etc.).
  if (WEBHOOK_URL) {
    try {
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
  }

  return correlationId;
};
