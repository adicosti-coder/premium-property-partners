// create-contract-checkout
// Creates a Stripe Embedded Checkout session for the onboarding fee of a signed
// contract. Token-authenticated (the signing page holds the token).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    const environment: StripeEnv = body?.environment === "live" ? "live" : "sandbox";
    const returnUrl = typeof body?.returnUrl === "string" ? body.returnUrl : "";
    if (!/^[a-f0-9]{32,64}$/i.test(token)) return json({ error: "Token invalid" }, 400);
    if (!/^https?:\/\//.test(returnUrl)) return json({ error: "returnUrl invalid" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: contract, error } = await admin
      .from("owner_contracts")
      .select("id, status, owner_name, owner_email, onboarding_fee_cents, currency, lead_id, property_address")
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;
    if (!contract) return json({ error: "Contract inexistent" }, 404);
    if (contract.status !== "signed") {
      return json({ error: "Contractul trebuie semnat înainte de plată" }, 409);
    }

    const amount = Number(contract.onboarding_fee_cents ?? 0);
    if (!Number.isFinite(amount) || amount < 200) {
      return json({ error: "Sumă de plată invalidă" }, 400);
    }

    const stripe = createStripeClient(environment);
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: String(contract.currency || "ron").toLowerCase(),
          product_data: {
            name: "Taxă onboarding administrare RealTrust",
            description: contract.property_address
              ? `Proprietate: ${String(contract.property_address).slice(0, 180)}`
              : undefined,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(contract.owner_email ? { customer_email: contract.owner_email } : {}),
      payment_intent_data: { description: "Taxă onboarding administrare RealTrust" },
      metadata: {
        contract_id: contract.id,
        lead_id: contract.lead_id ?? "",
      },
    });

    await admin
      .from("owner_contracts")
      .update({ stripe_session_id: session.id, payment_amount_cents: amount })
      .eq("id", contract.id);

    return json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("create-contract-checkout error:", (err as Error)?.message);
    return json({ error: (err as Error)?.message ?? "Eroare internă" }, 500);
  }
});
