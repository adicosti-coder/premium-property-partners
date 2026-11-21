// Reguli pure pentru „Centrul WhatsApp” din Admin: clasificarea cozii de
// trimitere, cazurile care cer intervenție umană, metricile compacte și
// limitele acțiunilor rapide. Fără importuri Deno, ca să fie folosite și de
// interfață, și de funcția `wa-hub-actions`, și de teste.

// ── Coada de trimitere ──────────────────────────────────────────────────────
export type QueueBucket =
  | "critical"   // cont Meta blocat: plată / eligibilitate (131042), cont blocat (131031)…
  | "retryable"  // eșec tehnic care poate fi reluat (http_4xx/5xx, timeouts confirmate)
  | "uncertain"  // posibil trimis — nu se retrimite niciodată automat
  | "stuck"      // trebuia să plece și stă (pauză, worker oprit, „sending” agățat)
  | "scheduled"  // programat în viitor
  | "waiting"    // în așteptare normală (ex. în afara orelor de trimitere)
  | "benign"     // fără WhatsApp (131026), dublură refuzată, listă de excludere, expirat
  | "sent";      // trimis / a răspuns

export interface QueueItemLike {
  status: string;
  last_error: string | null;
  scheduled_at: string | null;
  created_at?: string | null;
  sent_at?: string | null;
  updated_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  replied_at?: string | null;
}

export interface QueueContext {
  now?: number;
  /** Trimiterile automate sunt oprite din setări (outbound_paused). */
  paused?: boolean;
  /** Suntem în orele/zilele permise de trimitere. */
  withinSendingHours?: boolean;
}

/** Erori de cont Meta: oricât reîncerci, nu pleacă până nu se rezolvă în Meta. */
export const CRITICAL_ERROR = /\b(131042|131031|131048|368)\b|payment issue|business eligibility|account (?:has been |is )?locked/i;
/** Cazuri normale, fără acțiune: număr fără WhatsApp, dublură refuzată, excluderi, mesaje expirate. */
export const BENIGN_ERROR =
  /131026|undeliverable|duplicat|blocat:|lista de excludere|num[aă]r intern|num[aă]r propriu|interac[țt]iune anterioar[aă]|stale_over_\d+_days|anulat manual/i;
/** Trimiterea a fost întreruptă după apelul către Meta — mesajul poate fi deja la client. */
export const UNCERTAIN_ERROR = /posibil trimis/i;

export const STUCK_PENDING_MINUTES = 30;
export const STUCK_SENDING_MINUTES = 10;

const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);

/** Codul Meta din mesajul de eroare (ex. 131042), dacă există. */
export function metaErrorCode(err: string | null | undefined): string | null {
  const m = String(err ?? "").match(/\b(13\d{4}|368|190|100)\b/);
  return m ? m[1] : null;
}

export function classifyQueueItem(item: QueueItemLike, ctx: QueueContext = {}): QueueBucket {
  const now = ctx.now ?? Date.now();
  const err = item.last_error ?? "";
  switch (item.status) {
    case "sent":
    case "replied":
      return "sent";
    case "cancelled":
      return "benign";
    case "failed":
      if (UNCERTAIN_ERROR.test(err)) return "uncertain";
      if (CRITICAL_ERROR.test(err)) return "critical";
      if (BENIGN_ERROR.test(err)) return "benign";
      return "retryable";
    case "sending": {
      const since = ms(item.updated_at ?? item.scheduled_at);
      return Number.isFinite(since) && now - since > STUCK_SENDING_MINUTES * 60_000 ? "stuck" : "waiting";
    }
    case "pending": {
      const due = ms(item.scheduled_at);
      if (Number.isFinite(due) && due > now) return "scheduled";
      const overdue = Number.isFinite(due) ? now - due : 0;
      if (ctx.paused) return "stuck";
      if (ctx.withinSendingHours === false) return "waiting";
      return overdue > STUCK_PENDING_MINUTES * 60_000 ? "stuck" : "waiting";
    }
    default:
      return "waiting";
  }
}

export type RetryMode = "bulk" | "single";

/**
 * Doar mesajele eșuate pot fi reluate. „Reîncearcă coada” (bulk) ia numai
 * eșecurile tehnice; un mesaj cu eroare de cont Meta se poate relua doar
 * individual, după ce problema e rezolvată în Meta. Cazurile benigne și
 * „posibil trimis” nu se reiau niciodată (dubluri / numere fără WhatsApp).
 */
export function isRetryEligible(item: QueueItemLike, mode: RetryMode = "bulk", ctx: QueueContext = {}): boolean {
  if (item.status !== "failed") return false;
  const b = classifyQueueItem(item, ctx);
  return b === "retryable" || (mode === "single" && b === "critical");
}

export const BUCKET_LABELS: Record<QueueBucket, string> = {
  critical: "Eroare de cont Meta",
  retryable: "Eșuat — se poate relua",
  uncertain: "Posibil trimis — verifică",
  stuck: "Blocat",
  scheduled: "Programat",
  waiting: "În așteptare",
  benign: "Normal, fără acțiune",
  sent: "Trimis",
};

export type QueueFilter = "all" | "action" | QueueBucket;

export function filterQueue<T extends QueueItemLike & { phone_normalized?: string | null; template_name?: string | null; source?: string | null }>(
  items: T[],
  filter: QueueFilter,
  search = "",
  ctx: QueueContext = {},
): T[] {
  const s = search.trim().toLowerCase();
  const digits = s.replace(/\D/g, "");
  return items.filter((it) => {
    const b = classifyQueueItem(it, ctx);
    if (filter === "action" && !["critical", "retryable", "uncertain", "stuck"].includes(b)) return false;
    if (filter !== "all" && filter !== "action" && b !== filter) return false;
    if (!s) return true;
    const phone = String(it.phone_normalized ?? "");
    return (
      (digits.length >= 3 && phone.replace(/\D/g, "").includes(digits)) ||
      String(it.template_name ?? "").toLowerCase().includes(s) ||
      String(it.source ?? "").toLowerCase().includes(s) ||
      String(it.last_error ?? "").toLowerCase().includes(s)
    );
  });
}

export function countBuckets(items: QueueItemLike[], ctx: QueueContext = {}): Record<QueueBucket, number> {
  const out: Record<QueueBucket, number> = {
    critical: 0, retryable: 0, uncertain: 0, stuck: 0, scheduled: 0, waiting: 0, benign: 0, sent: 0,
  };
  for (const it of items) out[classifyQueueItem(it, ctx)]++;
  return out;
}

/** Ora și ziua din România, pentru orele de trimitere din setări. */
export function isWithinSendingHours(
  at: Date,
  startHour: number,
  endHour: number,
  days: number[] | null | undefined,
): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest", hour: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
  if (days && days.length && !days.includes(day)) return false;
  return hour >= startHour && hour < endHour;
}

// ── Metrici compacte ────────────────────────────────────────────────────────
export interface QueueMetrics {
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failedReal: number;
  critical: number;
  benign: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  errorRate: number;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

/** Metrici pe mesajele create în ultimele `days` zile. Benignele nu intră în rata de eroare. */
export function computeQueueMetrics(items: QueueItemLike[], days: number, now = Date.now()): QueueMetrics {
  const since = now - days * 86_400_000;
  const inWindow = items.filter((it) => {
    const t = ms(it.created_at ?? it.scheduled_at);
    return Number.isFinite(t) && t >= since;
  });
  const sentRows = inWindow.filter((it) => !!it.sent_at && (it.status === "sent" || it.status === "replied"));
  const delivered = sentRows.filter((it) => it.delivered_at).length;
  const read = sentRows.filter((it) => it.read_at).length;
  const replied = sentRows.filter((it) => it.replied_at || it.status === "replied").length;
  let failedReal = 0, critical = 0, benign = 0;
  for (const it of inWindow) {
    const b = classifyQueueItem(it, { now });
    if (b === "benign") benign++;
    else if (b === "critical") { critical++; failedReal++; }
    else if (b === "retryable" || b === "uncertain") failedReal++;
  }
  return {
    sent: sentRows.length, delivered, read, replied, failedReal, critical, benign,
    deliveryRate: pct(delivered, sentRows.length),
    readRate: pct(read, sentRows.length),
    replyRate: pct(replied, sentRows.length),
    errorRate: pct(failedReal, sentRows.length + failedReal),
  };
}

// ── Atenție manuală ─────────────────────────────────────────────────────────
export type AttentionCategory = "commission" | "negotiation" | "owner_change" | "handover";

export interface AttentionInput {
  status: string | null;
  handoff_reason: string | null;
  last_inbound_text?: string | null;
}

export const ATTENTION_LABELS: Record<AttentionCategory, string> = {
  commission: "Întrebare despre comision",
  negotiation: "Negociere preț",
  owner_change: "Modificare de la proprietar",
  handover: "Predare către operator",
};

const COMMISSION = /comision|procent|\b(?:1[5-9]|20)\s*%|c[aâ]t (?:lua[țt]i|cost[aă]|percepe[țt]i)|costuri|tax[aă]|onorariu|administrare (?:cost|pre[țt])/i;
const NEGOTIATION = /negoci|reducere|ultimul pre[țt]|pre[țt] final|discount|mai ieftin|sc[aă]de[țt]i|las[aă]\s+(?:din|la)\s+pre[țt]|contraofert/i;
const OWNER_CHANGE = /modific|corect|schimb|actualiz|gre[sș]it|alt pre[țt]|pre[țt]ul (?:nou|e acum|este acum)|nu mai (?:e|este) disponibil|v[aâ]ndut|[iî]nchiriat deja|retrag/i;

/** Conversația cere intervenția unui om? */
export function needsAttention(c: Pick<AttentionInput, "status" | "handoff_reason">): boolean {
  if (c.status === "closed") return false;
  return c.status === "awaiting_human" || c.status === "escalated_to_call" || !!(c.handoff_reason && c.handoff_reason.trim());
}

export function classifyAttention(c: AttentionInput): AttentionCategory {
  const reason = String(c.handoff_reason ?? "");
  const text = `${reason} ${c.last_inbound_text ?? ""}`;
  if (/^owner_custom_notes/i.test(reason)) return "owner_change";
  if (COMMISSION.test(text)) return "commission";
  if (NEGOTIATION.test(text)) return "negotiation";
  if (OWNER_CHANGE.test(text)) return "owner_change";
  return "handover";
}

const REASON_LABELS: Array<[RegExp, string]> = [
  [/^outside_office_hours/i, "Mesaj în afara programului"],
  [/^outside_24h_window/i, "Fereastra de 24h a expirat"],
  [/^assistant_handoff/i, "Asistentul a cerut un operator"],
  [/^owner_question_handoff/i, "Întrebare de la proprietar"],
  [/^owner_custom_notes/i, "Proprietarul a trimis corecturi"],
  [/^owner_income_analysis_request/i, "Cere analiza de venit"],
  [/^owner_consent_unverified/i, "Acord de verificat"],
  [/^(admin_paused|manual_reply_from_admin)/i, "Preluată de tine"],
  [/^admin_escalated/i, "Trimisă la apel"],
];

/** Motivul afișat, fără codul intern. */
export function handoffReasonLabel(c: Pick<AttentionInput, "status" | "handoff_reason">): string {
  const r = String(c.handoff_reason ?? "");
  for (const [re, label] of REASON_LABELS) if (re.test(r)) return label;
  if (c.status === "escalated_to_call") return "De sunat";
  if (c.status === "awaiting_human") return "Așteaptă operator";
  return "Marcată pentru verificare";
}

/** Textul mesajului din motivul salvat („cod: mesaj”). */
export function handoffMessage(reason: string | null | undefined): string {
  const r = String(reason ?? "");
  const i = r.indexOf(": ");
  return i > 0 && /^[a-z_]+$/i.test(r.slice(0, i)) ? r.slice(i + 2) : "";
}

/** După „Rezolvat”: conversația revine la Andrei; cea trimisă la apel rămâne la apel. */
export function resolvedConversationPatch(status: string | null): { handoff_reason: null; status?: string } {
  return status === "awaiting_human" ? { handoff_reason: null, status: "active" } : { handoff_reason: null };
}

// ── Mesaj de test ───────────────────────────────────────────────────────────
export const TEST_TEMPLATES = [
  { name: "prospect_intro_premium_v6", label: "Prim contact v6" },
  { name: "andrei_followup_ro", label: "Reamintire Andrei" },
] as const;

export const MAX_TEST_SENDS_PER_HOUR = 5;

export function isAllowedTestTemplate(name: unknown): boolean {
  return TEST_TEMPLATES.some((t) => t.name === name);
}

export function canSendTest(sentLastHour: number): boolean {
  return sentLastHour < MAX_TEST_SENDS_PER_HOUR;
}

/** Afișează doar ultimele 3 cifre: „+40 7•• ••• 520”. */
export function maskPhone(phone: string | null | undefined): string {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (d.length < 6) return "•••";
  const last = d.slice(-3);
  const national = d.startsWith("40") ? d.slice(2) : d.replace(/^0/, "");
  return `+40 ${national.charAt(0)}•• ••• ${last}`;
}

export const ADMIN_ACTIONS = {
  retry: "wa_hub.retry_queue",
  testSend: "wa_hub.test_send",
  resolve: "wa_hub.resolve_attention",
} as const;
