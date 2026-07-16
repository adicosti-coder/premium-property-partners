export type Settings = {
  enabled: boolean;
  paused_reason: string | null;
  updated_at: string;
};

export type Job = {
  id: string;
  job_key: string;
  category: "lead" | "seo" | "system" | "blog" | "ai" | "listing";
  label: string;
  description: string | null;
  enabled: boolean;
  schedule: string | null;
  trigger_type: "cron" | "event" | "manual";
  last_run_at: string | null;
  last_status: "success" | "failed" | "disabled" | "running" | "timeout" | "skipped" | null;
  last_error: string | null;
  consecutive_failures: number;
  total_runs: number;
  total_successes: number;
  config: Record<string, unknown> | null;
};

export type Approval = {
  id: string;
  job_key: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  proposal: Record<string, unknown>;
  evidence: Record<string, unknown>;
  severity: "info" | "warning" | "critical";
  status: string;
  created_at: string;
  expires_at: string;
};

export type Run = {
  id: string;
  job_key: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: "success" | "failed" | "timeout" | "skipped" | "running";
  error: string | null;
  triggered_by: string | null;
  retry_count: number;
  output_summary: Record<string, unknown>;
};
