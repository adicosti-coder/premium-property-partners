// contract-public
// Public (token-authenticated) read of a contract for the digital signing page.
// Never exposes internal columns (otp hash, ids of other records).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token") ?? "";
    if (!token && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = typeof body?.token === "string" ? body.token : "";
    }
    if (!/^[a-f0-9]{32,64}$/i.test(token)) return json({ error: "Token invalid" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin
      .from("owner_contracts")
      .select(
        "id, token, owner_name, owner_email, owner_tax_id, owner_address, property_address, management_fee_percent, onboarding_fee_cents, currency, contract_body, status, signed_at, signature_name, paid_at",
      )
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ error: "Contract inexistent" }, 404);

    return json({ contract: data });
  } catch (err) {
    console.error("contract-public error:", (err as Error)?.message);
    return json({ error: "Eroare internă" }, 500);
  }
});
