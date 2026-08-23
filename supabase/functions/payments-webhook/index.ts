// payments-webhook
// Stripe webhook handler. Marks a signed contract as paid, stores payment
// details, generates the owner portal access code, and notifies both the team
// and the owner. Also handles refunds and async payment failures.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";
import { logLeadEvent } from "../_shared/leadEvents.ts";
import { logAudit } from "../_shared/auditLog.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function generatePortalCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => chars[b % chars.length])
    .join("");
}

async function findContractBySessionId(sessionId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("owner_contracts")
    .select("id, status, lead_id, owner_name, owner_email, property_address, payment_amount_cents, currency, paid_at, owner_portal_code")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  return data;
}

async function markContractPaid(session: any, env: StripeEnv) {
  const contractId = session?.metadata?.contract_id;
  if (!contractId) {
    // Fallback lookup by session id if metadata is missing.
    const bySession = await findContractBySessionId(session.id);
    if (!bySession) {
      console.log("payments-webhook: session without contract_id and no matching session_id — nothing to fulfil");
      return;
    }
  }

  const supabase = getSupabase();
  const { data: contract } = await supabase
    .from("owner_contracts")
    .select("id, status, lead_id, owner_name, owner_email, property_address, payment_amount_cents, currency, paid_at, owner_portal_code")
    .eq("id", contractId)
    .maybeSingle();
  if (!contract) return;
  if ((contract as any).paid_at) return; // idempotent

  const paymentIntentId = session.payment_intent;
  const chargeId = session.charges?.data?.[0]?.id;
  const receiptUrl = session.charges?.data?.[0]?.receipt_url;
  const customerId = session.customer;
  const amountTotal = session.amount_total;

  const portalCode = (contract as any).owner_portal_code || generatePortalCode();

  await supabase
    .from("owner_contracts")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
      stripe_customer_id: typeof customerId === "string" ? customerId : null,
      payment_intent_id: typeof paymentIntentId === "string" ? paymentIntentId : null,
      charge_id: typeof chargeId === "string" ? chargeId : null,
      receipt_url: typeof receiptUrl === "string" ? receiptUrl : null,
      payment_amount_cents: amountTotal ?? (contract as any).payment_amount_cents ?? null,
      owner_portal_code: portalCode,
    })
    .eq("id", contractId);

  const leadId = (contract as any).lead_id as string | null;
  if (leadId) {
    await supabase
      .from("leads")
      .update({ crm_status: "contract_semnat_platit" })
      .eq("id", leadId);
    await logLeadEvent({
      leadId,
      type: "contract_paid",
      status: "success",
      message: "Contract semnat & plătit — status CRM actualizat",
      actor: "payments-webhook",
      metadata: { contract_id: contractId, environment: env, session_id: session.id, amount_total: amountTotal },
    }, supabase as any);
  }

  await logAudit(supabase, {
    action: "payment_succeeded",
    actor_label: "stripe-webhook",
    entity_type: "owner_contract",
    entity_id: String(contractId),
    details: {
      lead_id: leadId,
      environment: env,
      session_id: session.id,
      amount_total: amountTotal,
      currency: session.currency ?? null,
    },
    severity: "warning",
  });

  const amount = ((amountTotal ?? 0) / 100).toFixed(2);
  const currency = String(session.currency ?? (contract as any).currency ?? "").toUpperCase();

  // ── Invoice / receipt data ────────────────────────────────────────────────
  const invoiceNumber = `RT-${new Date().getFullYear()}-${String(contractId).slice(0, 8).toUpperCase()}`;
  const lineItems = (((contract as any).line_items ?? []) as { label: string; amount_cents: number }[]);
  const itemRows = (lineItems.length
    ? lineItems
    : [{ label: "Taxă onboarding", amount_cents: (contract as any).onboarding_fee_cents ?? amountTotal ?? 0 }]
  )
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${item.label}</td>
         <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${((item.amount_cents ?? 0) / 100).toFixed(2)} ${currency}</td></tr>`,
    )
    .join("");

  // Signed link (7 days) to the signed-contract PDF, for the team + owner.
  let pdfLink: string | null = null;
  const pdfPath = (contract as any).contract_pdf_path as string | null;
  if (pdfPath) {
    const { data: signedUrl } = await supabase.storage
      .from("owner-contracts")
      .createSignedUrl(pdfPath, 7 * 24 * 3600);
    pdfLink = signedUrl?.signedUrl ?? null;
  }

  await supabase
    .from("owner_contracts")
    .update({ invoice_number: invoiceNumber, invoice_sent_at: new Date().toISOString() })
    .eq("id", contractId);

  // Team alert
  await sendTeamEmail({
    to: Deno.env.get("ADMIN_ALERT_EMAIL") || "info@realtrust.ro",
    subject: `✅ Contract semnat & plătit — ${(contract as any).owner_name}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="color:#1a365d">Contract semnat & plătit</h2>
      <p>Proprietar: <strong>${(contract as any).owner_name}</strong></p>
      <p>Proprietate: ${(contract as any).property_address ?? "—"}</p>
      <p>Sumă încasată: <strong>${amount} ${currency}</strong> (${env})</p>
      <p>Cod acces portal proprietar: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${portalCode}</code></p>
      <p>Factură: <strong>${invoiceNumber}</strong></p>
      ${pdfLink ? `<p><a href="${pdfLink}">Descarcă contractul semnat (PDF)</a></p>` : "<p>PDF contract indisponibil — regenerează din /admin.</p>"}
    </div>`,
    leadId,
    contractId,
    source: "payments-webhook",
  }, getSupabase() as any);

  // Owner receipt
  const ownerEmail = (contract as any).owner_email;
  if (ownerEmail) {
    await sendTeamEmail({
      to: ownerEmail,
      subject: `Chitanță ${invoiceNumber} — ${amount} ${currency} | RealTrust Timișoara`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px">
        <h2 style="color:#1a365d">Mulțumim, ${(contract as any).owner_name}!</h2>
        <p>Am primit plata de <strong>${amount} ${currency}</strong>. Mai jos ai chitanța detaliată.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
          <tbody>
            ${itemRows}
            <tr><td style="padding:8px 0;font-weight:700">Total plătit</td>
                <td style="padding:8px 0;text-align:right;font-weight:700">${amount} ${currency}</td></tr>
          </tbody>
        </table>
        <p style="font-size:13px;color:#6b7280">Document fiscal: <strong>${invoiceNumber}</strong> · Data: ${new Date().toLocaleDateString("ro-RO")}</p>
        ${pdfLink ? `<p><a href="${pdfLink}" style="color:#1a365d;font-weight:600">Descarcă contractul semnat (PDF)</a> — link valabil 7 zile.</p>` : ""}
        <p>Proprietatea ta din <strong>${(contract as any).property_address ?? "—"}</strong> intră acum în administrarea RealTrust.</p>
        <p>Codul tău de acces în portalul proprietarului este: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:18px">${portalCode}</code></p>
        <p>Accesează portalul la: <a href="https://realtrust.ro/owner">realtrust.ro/owner</a></p>
        <p style="font-size:12px;color:#6b7280;margin-top:24px">Dacă ai întrebări, răspunde la acest email sau contactează-ne pe WhatsApp.</p>
      </div>`,
      leadId,
      contractId,
      source: "payments-webhook-receipt",
    }, getSupabase() as any);
  }
}

async function handleRefund(session: any, env: StripeEnv) {
  const contractId = session?.metadata?.contract_id;
  if (!contractId) return;
  const supabase = getSupabase();
  const refundAmount = session.refunds?.[0]?.amount ?? session.amount_refunded ?? 0;
  await supabase
    .from("owner_contracts")
    .update({
      refunded_at: new Date().toISOString(),
      refund_amount_cents: refundAmount,
    })
    .eq("id", contractId);

  await logAudit(supabase, {
    action: "payment_refunded",
    actor_label: "stripe-webhook",
    entity_type: "owner_contract",
    entity_id: String(contractId),
    details: {
      environment: env,
      session_id: session.id,
      refund_amount_cents: refundAmount,
    },
    severity: "warning",
  });

  const leadId = session?.metadata?.lead_id;
  if (leadId) {
    await logLeadEvent({
      leadId,
      type: "contract_refunded",
      status: "warning",
      message: `Rambursare înregistrată: ${(refundAmount / 100).toFixed(2)}`,
      actor: "payments-webhook",
      metadata: { contract_id: contractId, environment: env, session_id: session.id, refund_amount_cents: refundAmount },
    }, supabase as any);
  }
}

async function handlePaymentFailure(session: any, env: StripeEnv) {
  const contractId = session?.metadata?.contract_id;
  if (!contractId) return;
  const supabase = getSupabase();
  const leadId = session?.metadata?.lead_id;
  await logAudit(supabase, {
    action: "payment_failed",
    actor_label: "stripe-webhook",
    entity_type: "owner_contract",
    entity_id: String(contractId),
    details: { lead_id: leadId ?? null, environment: env, session_id: session.id },
    severity: "error",
  });
  if (leadId) {
    await logLeadEvent({
      leadId,
      type: "contract_payment_failed",
      status: "error",
      message: "Plata online a eșuat sau a expirat",
      actor: "payments-webhook",
      metadata: { contract_id: contractId, environment: env, session_id: session.id },
    }, supabase as any);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("payments-webhook: invalid env query parameter:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);
    const eventId = String((event as unknown as { id?: string }).id ?? "");

    // ── Idempotency: claim the Stripe event id before doing any work. Stripe
    // retries for up to 3 days, so a duplicate delivery must not re-issue an
    // invoice, a receipt email or a refund entry. The primary key on
    // stripe_webhook_events makes the claim atomic across parallel deliveries.
    if (eventId) {
      const { error: claimError } = await getSupabase()
        .from("stripe_webhook_events")
        .insert({ event_id: eventId, event_type: event.type, environment: env });
      if (claimError) {
        if (claimError.code === "23505") {
          console.log("payments-webhook: duplicate event ignored", eventId, event.type);
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        // Ledger unavailable → fail open; markContractPaid stays paid_at-guarded.
        console.error("payments-webhook: idempotency claim failed (failing open):", claimError.message);
      }
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status !== "unpaid") await markContractPaid(session, env);
        break;
      }
      case "checkout.session.async_payment_succeeded":
        await markContractPaid(event.data.object, env);
        break;
      case "checkout.session.async_payment_failed":
        await handlePaymentFailure(event.data.object, env);
        break;
      case "charge.refunded":
      case "checkout.session.expired":
        await handleRefund(event.data.object, env);
        break;
      default:
        console.log("payments-webhook: unhandled event", event.type);
    }

    if (eventId) {
      await getSupabase()
        .from("stripe_webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("event_id", eventId);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("payments-webhook error:", (e as Error)?.message);
    return new Response("Webhook error", { status: 400 });
  }
});
