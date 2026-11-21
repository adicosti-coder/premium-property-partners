// Connection Health rules (green / yellow / red) for the admin widget.
// Pure TypeScript: used by the `connection-health` edge function, by the admin
// UI (overall status, offline fallback) and unit-tested from src/lib.
// Never put secret values in these results — only names, codes and messages.

export type HealthStatus = "green" | "yellow" | "red";
export type ServiceKey = "database" | "whatsapp" | "make";

export interface ServiceHealth {
  key: ServiceKey;
  label: string;
  status: HealthStatus;
  summary: string;
  lastError: string | null;
  checkedAt: string;
  /** Admin route where the problem is fixed. */
  fixRoute: string;
  details?: Record<string, unknown>;
}

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  database: "Baza de date (Cloud)",
  whatsapp: "WhatsApp Business (Meta)",
  make: "Webhook-uri Make.com",
};

export const FIX_ROUTES: Record<ServiceKey, string> = {
  database: "/admin/stare-baza",
  whatsapp: "/admin/hub-whatsapp?section=coada",
  make: "/admin/make-queue",
};

const RANK: Record<HealthStatus, number> = { green: 0, yellow: 1, red: 2 };
export const worst = (a: HealthStatus, b: HealthStatus): HealthStatus => (RANK[b] > RANK[a] ? b : a);

export function overallStatus(services: Pick<ServiceHealth, "status">[]): HealthStatus {
  return services.reduce<HealthStatus>((acc, s) => worst(acc, s.status), "green");
}

export const STATUS_TEXT: Record<HealthStatus, string> = {
  green: "Toate active",
  yellow: "Atenție",
  red: "Conexiune oprită",
};

type Issue = { status: HealthStatus; message: string };
function pick(issues: Issue[], okMessage: string): { status: HealthStatus; summary: string } {
  if (!issues.length) return { status: "green", summary: okMessage };
  const top = [...issues].sort((a, b) => RANK[b.status] - RANK[a.status])[0];
  const extra = issues.length > 1 ? ` (+${issues.length - 1} alte semnale)` : "";
  return { status: top.status, summary: top.message + extra };
}

const trim = (s: string | null | undefined, n = 220) => (s ? String(s).replace(/\s+/g, " ").trim().slice(0, n) : null);

// ── Database ────────────────────────────────────────────────────────────────
const PAUSE_OR_CREDITS = /pause|paused|credit|quota|exceed|insufficient|billing|402|project is (?:inactive|paused)/i;
export const SLOW_DB_MS = 2000;

export function evaluateDatabase(input: {
  readOk: boolean; writeOk: boolean; latencyMs: number | null; error?: string | null; checkedAt: string;
}): ServiceHealth {
  const issues: Issue[] = [];
  const err = trim(input.error);
  if (!input.readOk || !input.writeOk) {
    issues.push({
      status: "red",
      message: err && PAUSE_OR_CREDITS.test(err)
        ? "Baza de date e oprită — posibil pauză sau credite Cloud epuizate."
        : !input.readOk ? "Citirea din baza de date eșuează." : "Scrierea în baza de date eșuează.",
    });
  } else if (input.latencyMs != null && input.latencyMs > SLOW_DB_MS) {
    issues.push({ status: "yellow", message: `Baza de date răspunde lent (${Math.round(input.latencyMs)} ms).` });
  }
  const { status, summary } = pick(issues, `Citire și scriere OK${input.latencyMs != null ? ` (${Math.round(input.latencyMs)} ms)` : ""}.`);
  return { key: "database", label: SERVICE_LABELS.database, status, summary, lastError: err, checkedAt: input.checkedAt, fixRoute: FIX_ROUTES.database, details: { latencyMs: input.latencyMs } };
}

// ── WhatsApp (Meta Cloud API) ───────────────────────────────────────────────
/** Account-level blocks: payment/eligibility and locked account. */
export const WA_ACCOUNT_BLOCK_CODES: Record<string, string> = {
  "131042": "Meta a blocat trimiterile: problemă de plată / eligibilitate a contului (131042).",
  "131031": "Contul WhatsApp Business este blocat de Meta (131031).",
};
/** Throttling — messages are delayed, not lost. */
export const WA_RATE_LIMIT_CODES = new Set(["130429", "131048", "131056", "80007"]);
/** Per-recipient outcomes that say nothing about the connection itself. */
export const WA_RECIPIENT_CODES = new Set(["131026", "131047", "131049", "131050", "131051"]);
export const WA_STUCK_RED = 25;
export const WA_REAL_FAILURES_YELLOW = 3;

export function waErrorCode(text: string | null | undefined): string | null {
  const m = String(text ?? "").match(/\b(13\d{4}|80007|190)\b/);
  return m ? m[1] : null;
}

export function evaluateWhatsApp(input: {
  tokenPresent: boolean;
  /** Result of a light Graph API read of the sending phone number. */
  tokenCheck: { httpStatus: number | null; errorCode?: string | number | null; errorMessage?: string | null; canSendMessage?: string | null };
  /** Failed queue rows from the last 24h (most recent first). */
  recentFailures: { last_error: string | null; updated_at: string }[];
  /** Pending rows whose scheduled time passed more than an hour ago. */
  stuckPending: number;
  /** Stuck rows only count while the worker is allowed to send. */
  withinSendingHours: boolean;
  sent24h: number;
  checkedAt: string;
}): ServiceHealth {
  const issues: Issue[] = [];
  const t = input.tokenCheck;
  const code = t.errorCode != null ? String(t.errorCode) : null;

  if (!input.tokenPresent) issues.push({ status: "red", message: "Tokenul Meta WhatsApp lipsește din setările serverului." });
  else if (t.httpStatus === 401 || code === "190") issues.push({ status: "red", message: "Tokenul Meta WhatsApp este invalid sau expirat." });
  else if (t.httpStatus == null) issues.push({ status: "yellow", message: "Meta nu a răspuns la verificarea tokenului." });
  else if (t.httpStatus >= 400) issues.push({ status: "yellow", message: `Meta a răspuns cu eroare ${t.httpStatus} la verificarea contului.` });

  const can = (t.canSendMessage ?? "").toUpperCase();
  if (can === "BLOCKED") issues.push({ status: "red", message: "Meta raportează că numărul nu poate trimite mesaje (BLOCKED)." });
  else if (can === "LIMITED") issues.push({ status: "yellow", message: "Meta a limitat trimiterile numărului (LIMITED)." });

  const seenBlock = new Set<string>();
  let rateLimited = 0;
  let realFailures = 0;
  for (const f of input.recentFailures) {
    const c = waErrorCode(f.last_error);
    if (c && WA_ACCOUNT_BLOCK_CODES[c]) { seenBlock.add(c); continue; }
    if (c && WA_RATE_LIMIT_CODES.has(c)) { rateLimited++; continue; }
    if (c && WA_RECIPIENT_CODES.has(c)) continue;
    if (/http_409/i.test(f.last_error ?? "")) continue; // duplicate-send guard, not a delivery fault
    realFailures++;
  }
  for (const c of seenBlock) issues.push({ status: "red", message: WA_ACCOUNT_BLOCK_CODES[c] });
  if (rateLimited) issues.push({ status: "yellow", message: `${rateLimited} trimiteri limitate temporar de Meta (24h).` });
  if (realFailures >= WA_REAL_FAILURES_YELLOW) issues.push({ status: "yellow", message: `${realFailures} trimiteri eșuate în ultimele 24h.` });

  if (input.withinSendingHours && input.stuckPending > 0) {
    issues.push({
      status: input.stuckPending >= WA_STUCK_RED ? "red" : "yellow",
      message: `${input.stuckPending} mesaje blocate în coadă de peste o oră.`,
    });
  }

  const { status, summary } = pick(issues, `Token valid; ${input.sent24h} mesaje trimise în 24h.`);
  const lastError = trim(t.errorMessage) ?? trim(input.recentFailures.find((f) => !/http_409/i.test(f.last_error ?? ""))?.last_error);
  return {
    key: "whatsapp", label: SERVICE_LABELS.whatsapp, status, summary, lastError, checkedAt: input.checkedAt, fixRoute: FIX_ROUTES.whatsapp,
    details: { sent24h: input.sent24h, stuckPending: input.stuckPending, canSendMessage: can || null, accountBlockCodes: [...seenBlock] },
  };
}

// ── Make.com webhooks ───────────────────────────────────────────────────────
/** Main lead webhook: without it no lead reaches Make. */
export const MAKE_REQUIRED = ["MAKE_WEBHOOK_URL"];

export interface MakeDelivery {
  event: string;
  status: string;
  last_status: number | null;
  last_error: string | null;
  created_at: string;
}

export function evaluateMake(input: {
  configured: { name: string; present: boolean }[];
  /** Relay/DLQ rows from the last 24h. */
  deliveries: MakeDelivery[];
  /** Outbound Make lead events that failed in the last 24h. */
  leadEventsFailed24h: number;
  checkedAt: string;
}): ServiceHealth {
  const issues: Issue[] = [];
  const missing = input.configured.filter((c) => !c.present).map((c) => c.name);
  for (const name of MAKE_REQUIRED) if (missing.includes(name)) issues.push({ status: "red", message: "Webhook-ul principal Make pentru lead-uri nu este configurat." });

  // Latest delivery per event decides: a later success clears an older failure.
  const latest = new Map<string, MakeDelivery>();
  for (const d of input.deliveries) {
    const prev = latest.get(d.event);
    if (!prev || d.created_at > prev.created_at) latest.set(d.event, d);
  }
  let lastError: string | null = null;
  for (const d of latest.values()) {
    if (d.status === "delivered") continue;
    const err = d.last_error ?? "";
    const http = d.last_status ?? 0;
    if (!lastError) lastError = trim(`${d.event}: ${http ? `HTTP ${http} — ` : ""}${err}`);
    if (/timeout|timed out|abort/i.test(err) || !http) {
      issues.push({ status: "yellow", message: `Timeout la webhook-ul Make „${d.event}”.` });
    } else if (http >= 500) {
      issues.push({ status: "yellow", message: `Make a răspuns cu eroare ${http} pentru „${d.event}”.` });
    } else if (http >= 400) {
      issues.push({
        status: "red",
        message: http === 410 || /no scenario/i.test(err)
          ? `Scenariul Make pentru „${d.event}” este oprit — livrările se pierd.`
          : `Make respinge „${d.event}” (HTTP ${http}).`,
      });
    }
  }
  if (input.leadEventsFailed24h > 0) issues.push({ status: "yellow", message: `${input.leadEventsFailed24h} evenimente de lead către Make au eșuat în 24h.` });

  const { status, summary } = pick(issues, "Ultimele apeluri webhook au fost livrate.");
  return {
    key: "make", label: SERVICE_LABELS.make, status, summary, lastError, checkedAt: input.checkedAt, fixRoute: FIX_ROUTES.make,
    details: { missingWebhooks: missing, failingEvents: [...latest.values()].filter((d) => d.status !== "delivered").map((d) => d.event) },
  };
}

// ── UI helpers ──────────────────────────────────────────────────────────────
/** When the health endpoint itself can't be reached, the backend is down. */
export function offlineSnapshot(errorMessage: string, now: Date = new Date()): ServiceHealth[] {
  const at = now.toISOString();
  const db = evaluateDatabase({ readOk: false, writeOk: false, latencyMs: null, error: errorMessage, checkedAt: at });
  if (db.summary === "Citirea din baza de date eșuează.") {
    db.summary = "Backendul nu răspunde — posibil pauză sau credite Cloud epuizate.";
  }
  const unknown = (key: Exclude<ServiceKey, "database">): ServiceHealth => ({
    key, label: SERVICE_LABELS[key], status: "yellow",
    summary: "Nu poate fi verificat cât timp backendul nu răspunde.", lastError: null, checkedAt: at, fixRoute: FIX_ROUTES[key],
  });
  return [db, unknown("whatsapp"), unknown("make")];
}

export const STALE_AFTER_MS = 30 * 60_000;

/** A green result older than 30 minutes is shown as "attention" until rechecked. */
export function applyStaleness(services: ServiceHealth[], now: Date = new Date()): ServiceHealth[] {
  return services.map((s) => {
    const age = now.getTime() - new Date(s.checkedAt).getTime();
    if (s.status === "green" && age > STALE_AFTER_MS) {
      return { ...s, status: "yellow", summary: `Ultima verificare reușită e mai veche de 30 de minute. ${s.summary}` };
    }
    return s;
  });
}
