// Shared helper: append an automated event to a lead's timeline.
// Never throws — telemetry must not break the caller's flow.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type LeadEventStatus = "info" | "success" | "error" | "warning";

export interface LeadEventInput {
  leadId: string | null | undefined;
  type: string;
  status?: LeadEventStatus;
  message?: string | null;
  durationMs?: number | null;
  attempt?: number | null;
  actor?: string;
  metadata?: Record<string, unknown>;
}

let cached: SupabaseClient | null = null;

const adminClient = (): SupabaseClient | null => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  if (!cached) cached = createClient(url, key);
  return cached;
};

export async function logLeadEvent(
  input: LeadEventInput,
  client?: SupabaseClient,
): Promise<void> {
  try {
    if (!input.leadId) return;
    const admin = client ?? adminClient();
    if (!admin) return;

    await admin.from("lead_events").insert({
      lead_id: input.leadId,
      event_type: input.type.slice(0, 60),
      status: input.status ?? "info",
      message: input.message ? String(input.message).slice(0, 500) : null,
      duration_ms:
        typeof input.durationMs === "number" ? Math.max(0, Math.round(input.durationMs)) : null,
      attempt: typeof input.attempt === "number" ? input.attempt : null,
      actor: (input.actor ?? "system").slice(0, 60),
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("logLeadEvent failed:", (err as Error)?.message);
  }
}
