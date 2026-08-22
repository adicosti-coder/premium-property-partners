// create-contract-checkout
// Creates a Stripe Embedded Checkout session for the onboarding fee (+ optional
// photo session) of a signed contract. Token-authenticated (the signing page
// holds the token). Uses the registered Stripe product catalog so the dashboard
// and reporting show real product names instead of ad-hoc price_data.
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

interface LineItem {
  price_id: string;
  label?: string;
  amount_cents?: number;
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string | undefined> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (!options.email && !options.userId) return undefined;

  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

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
      .select("id, status, owner_name, owner_email, lead_id, property_address, currency, line_items, onboarding_fee_cents, photo_session_included, photo_session_fee_cents")
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;
    if (!contract) return json({ error: "Contract inexistent" }, 404);
    if (contract.status !== "signed") {
      return json({ error: "Contractul trebuie semnat înainte de plată" }, 409);
    }

    const lineItems = Array.isArray(contract.line_items) && contract.line_items.length
      ? (contract.line_items as LineItem[])
      : [{ price_id: "onboarding_fee_standard", label: "Taxă onboarding administrare RealTrust", amount_cents: Number(contract.onboarding_fee_cents ?? 0) }];

    const stripe = createStripeClient(environment);

    // Resolve each line item to a Stripe price via lookup_key, falling back to
    // price_data for custom amounts when the catalog price doesn't exist yet.
    const stripeLineItems = [];
    let totalAmountCents = 0;
    for (const item of lineItems) {
      if (!/^[a-zA-Z0-9_-]+$/.test(item.price_id)) {
        return json({ error: `Invalid price_id: ${item.price_id}` }, 400);
      }
      const prices = await stripe.prices.list({ lookup_keys: [item.price_id], limit: 1 });
      const amountCents = Number(item.amount_cents ?? 0);
      if (!Number.isFinite(amountCents) || amountCents < 200) {
        return json({ error: `Sumă invalidă pentru ${item.price_id}` }, 400);
      }
      totalAmountCents += amountCents;

      if (prices.data.length) {
        stripeLineItems.push({ price: prices.data[0].id, quantity: 1 });
      } else {
        // Fallback until the catalog is live in this environment.
        stripeLineItems.push({
          price_data: {
            currency: String(contract.currency || "ron").toLowerCase(),
            product_data: { name: item.label || item.price_id },
            unit_amount: amountCents,
          },
          quantity: 1,
        });
      }
    }

    if (!stripeLineItems.length || totalAmountCents < 200) {
      return json({ error: "Sumă de plată invalidă" }, 400);
    }

    const customerId = await resolveOrCreateCustomer(stripe, {
      email: contract.owner_email ?? undefined,
      userId: contract.lead_id ?? undefined,
    });

    const session = await stripe.checkout.sessions.create({
      line_items: stripeLineItems,
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(customerId ? { customer: customerId } : {}),
      payment_intent_data: {
        description: "Taxă onboarding administrare RealTrust",
        metadata: {
          contract_id: contract.id,
          lead_id: contract.lead_id ?? "",
        },
      },
      metadata: {
        contract_id: contract.id,
        lead_id: contract.lead_id ?? "",
      },
      managed_payments: { enabled: true },
    } as any);

    await admin
      .from("owner_contracts")
      .update({
        stripe_session_id: session.id,
        stripe_customer_id: customerId ?? null,
        payment_amount_cents: totalAmountCents,
      })
      .eq("id", contract.id);

    return json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("create-contract-checkout error:", (err as Error)?.message);
    return json({ error: (err as Error)?.message ?? "Eroare internă" }, 500);
  }
});
