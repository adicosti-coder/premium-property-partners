// Poartă unică pentru mesajele WhatsApp AUTOMATE (anti-spam).
// Reguli:
//  1. DNC / refuz / conversație retrasă → nimic automat (doar confirmarea refuzului).
//  2. Mesaje proactive (fără inbound nou): maximum 1 la 24h per număr (toate variantele).
//  3. Mesaje reactive (răspuns la inbound): maximum 1 automat per mesaj primit.
//  4. Un singur „intro” per număr, odată ce unul a plecat cu succes.
import { phoneVariants } from "./waPhone.ts";
import { detectPublishIntent, isClearRefusal } from "./waAutoReply.ts";

// deno-lint-ignore no-explicit-any
type Sb = any;

const BLOCKED_STATUSES = new Set(["closed", "opted_out", "rejected", "refused", "withdrawn", "retras", "dnc"]);
/** Confirmările de refuz/retragere trebuie să plece chiar și după STOP/NU. */
const REFUSAL_ACK_RE = /^(quick_(no|stop)|publish_revoke|revoke|opt_?out|refusal_ack)/;
const INTRO_RE = /intro|prospect_intro|acord_publicare|publish_consent_request/i;
const DAY_MS = 24 * 3_600_000;

export type GuardResult = { allowed: true } | { allowed: false; reason: string };

export function isRefusalAckKind(kind?: string | null): boolean {
  return !!kind && REFUSAL_ACK_RE.test(kind);
}

export function isIntroKind(kind?: string | null, template?: string | null): boolean {
  return INTRO_RE.test(`${kind || ""} ${template || ""}`);
}

export async function checkAutoSend(
  sb: Sb,
  opts: { phone?: string | null; conversationId?: string | null; kind?: string | null; template?: string | null },
): Promise<GuardResult> {
  let phone = opts.phone || null;
  if (!phone && opts.conversationId) {
    const { data } = await sb.from("wa_conversations").select("phone_normalized").eq("id", opts.conversationId).maybeSingle();
    phone = data?.phone_normalized || null;
  }
  if (!phone) return { allowed: false, reason: "no_phone" };
  if (isRefusalAckKind(opts.kind)) return { allowed: true };
  const variants = phoneVariants(phone);
  if (!variants.length) return { allowed: false, reason: "no_phone" };

  // 1. DNC
  const { data: dnc } = await sb.from("wa_dnc_list").select("id").in("phone_normalized", variants).limit(1);
  if (dnc?.length) return { allowed: false, reason: "dnc" };

  // 2. Conversații retrase / refuzate
  const { data: convs } = await sb.from("wa_conversations")
    .select("id, status, last_inbound_at").in("phone_normalized", variants);
  const convIds: string[] = (convs ?? []).map((c: { id: string }) => c.id);
  const blocked = (convs ?? []).find((c: { status?: string }) => c.status && BLOCKED_STATUSES.has(String(c.status)));
  if (blocked) return { allowed: false, reason: `conversation_${blocked.status}` };
  if (!convIds.length) return { allowed: true };

  // 3. Ultimul mesaj al proprietarului este un refuz?
  const { data: lastIn } = await sb.from("wa_messages")
    .select("content, created_at").in("conversation_id", convIds).eq("direction", "inbound")
    .order("created_at", { ascending: false }).limit(1);
  const inbound = lastIn?.[0];
  if (inbound?.content) {
    const txt = String(inbound.content);
    if (isClearRefusal(txt) || detectPublishIntent(txt, { pendingConsent: true }) === "revoke") {
      return { allowed: false, reason: "owner_refused" };
    }
  }

  // Mesaje automate trimise cu succes (template sau marcate auto) în ultimele 24h.
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { data: autoOut } = await sb.from("wa_messages")
    .select("created_at, template_name, tool_call")
    .in("conversation_id", convIds).eq("direction", "outbound").is("error", null)
    .gte("created_at", since)
    .or("template_name.not.is.null,tool_call.not.is.null")
    .order("created_at", { ascending: false }).limit(1);
  const lastAuto = autoOut?.[0];
  const inboundAt = inbound?.created_at ? Date.parse(inbound.created_at) : 0;

  if (lastAuto) {
    const lastAutoAt = Date.parse(lastAuto.created_at);
    // Reactiv: există inbound după ultimul automat → permis un singur răspuns.
    if (!(inboundAt > lastAutoAt)) return { allowed: false, reason: "rate_limit_24h" };
  }

  // 4. Intro deja trimis cu succes → niciun alt intro pe același profil.
  if (isIntroKind(opts.kind, opts.template)) {
    const { data: intro } = await sb.from("wa_messages")
      .select("id, template_name, tool_call")
      .in("conversation_id", convIds).eq("direction", "outbound").is("error", null)
      .not("template_name", "is", null).limit(50);
    if ((intro ?? []).some((m: { template_name?: string }) => isIntroKind(null, m.template_name))) {
      return { allowed: false, reason: "intro_already_sent" };
    }
  }
  return { allowed: true };
}
