// Shared audit log helper for edge functions.
// Best-effort, never throws — auditing must not break business logic.

export type AuditSeverity = "info" | "warning" | "error";

export interface AuditEntry {
  action: string;                 // e.g. "campaign_launch", "retry_auto", "call_failed"
  actor_user_id?: string | null;  // auth user id (null for system)
  actor_label?: string | null;    // human label, e.g. email or "system"
  entity_type?: string | null;    // "prospect_listing" | "campaign" | "voice_session"
  entity_id?: string | null;
  details?: Record<string, unknown>;
  severity?: AuditSeverity;
}

export async function logAudit(supabase: any, entry: AuditEntry): Promise<void> {
  try {
    await supabase.from("admin_audit_log").insert({
      action: entry.action,
      actor_user_id: entry.actor_user_id ?? null,
      actor_label: entry.actor_label ?? (entry.actor_user_id ? null : "system"),
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      details: entry.details ?? {},
      severity: entry.severity ?? "info",
    });
  } catch (e) {
    console.warn("[audit] failed to log:", (e as Error).message);
  }
}
