// Shared rule: a background job is in alert after MORE THAN 2 consecutive failed runs.
// A run stuck in "started"/"running" for over 2 hours counts as failed (it timed out).
export const CONSECUTIVE_FAILURE_ALERT = 3;
const STUCK_MS = 2 * 3600_000;

export type RunLike = { status: string | null; started_at: string };

export function isFailedRun(run: RunLike, now = Date.now()): boolean {
  const s = (run.status || "").toLowerCase();
  if (["failed", "error", "timeout", "failure"].includes(s)) return true;
  if (["started", "running"].includes(s)) return now - new Date(run.started_at).getTime() > STUCK_MS;
  return false;
}

/** Number of failures at the head of a list sorted newest first. */
export function leadingFailures(runs: RunLike[], now = Date.now()): number {
  let n = 0;
  for (const r of runs) {
    const s = (r.status || "").toLowerCase();
    if (["started", "running"].includes(s) && !isFailedRun(r, now)) continue; // still in progress
    if (!isFailedRun(r, now)) break;
    n++;
  }
  return n;
}

export const shouldAlert = (runs: RunLike[], now = Date.now()) => leadingFailures(runs, now) >= CONSECUTIVE_FAILURE_ALERT;

/** POSTs an alert to the admin-configured webhook (app_settings.system_alert_webhook_url). Never throws. */
export async function postAlertWebhook(sb: any, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const { data } = await sb.from("app_settings").select("value").eq("key", "system_alert_webhook_url").maybeSingle();
    const url = String(data?.value || "").trim();
    if (!/^https:\/\//.test(url)) return false;
    const r = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "realtrust_system_health", ...payload }),
      signal: AbortSignal.timeout(5000),
    });
    await r.text();
    return r.ok;
  } catch { return false; }
}
