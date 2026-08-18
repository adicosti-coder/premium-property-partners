// payments-webhook
// Stripe webhook handler. Marks a signed contract as paid and moves the lead in
// the CRM to "Contract Semnat & Plătit" once the payment settles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";
import { logLeadEvent } from "../_shared/leadEvents.ts";

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

async function markContractPaid(session: any, env: StripeEnv) {
  const contractId = session?.metadata?.contract_id;
  if (!contractId) {
    console.log("payments-webhook: session without contract_id — nothing to fulfil");
    return;
  }
  const supabase = getSupabase();

  const { data: contract } = await supabase
    .from("owner_contracts")
    .select("id, status, lead_id, owner_name, property_address, payment_amount_cents, currency, paid_at")
    .eq("id", contractId)
    .maybeSingle();
  if (!contract) return;
  if ((contract as any).paid_at) return; // idempotent

  await supabase
    .from("owner_contracts")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
      payment_amount_cents: session.amount_total ?? (contract as any).payment_amount_cents ?? null,
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
      metadata: { contract_id: contractId, environment: env, session_id: session.id },
    }, supabase as any);
  }

  const amount = ((session.amount_total ?? 0) / 100).toFixed(2);
  await sendTeamEmail({
    to: Deno.env.get("ADMIN_ALERT_EMAIL") || "info@realtrust.ro",
    subject: `✅ Contract semnat & plătit — ${(contract as any).owner_name}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="color:#1a365d">Contract semnat & plătit</h2>
      <p>Proprietar: <strong>${(contract as any).owner_name}</strong></p>
      <p>Proprietate: ${(contract as any).property_address ?? "—"}</p>
      <p>Sumă încasată: <strong>${amount} ${String(session.currency ?? (contract as any).currency ?? "").toUpperCase()}</strong> (${env})</p>
    </div>`,
    leadId,
    contractId,
    source: "payments-webhook",
  }, getSupabase() as any);
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
        console.warn("payments-webhook: async payment failed", event.data.object?.id);
        break;
      default:
        console.log("payments-webhook: unhandled event", event.type);
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
