// lead-status-public
// Token-authenticated (contract token) public status timeline for an owner.
// Returns only non-sensitive, masked data — never emails, phones, OTP or ids of
// other records. Used by the /status-lead page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** a***@domain.ro */
const maskEmail = (email?: string | null) => {
  if (!email || !email.includes("@")) return null;
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
};

type Stage = {
  key: string;
  label: string;
  description: string;
  state: "done" | "current" | "pending";
  at: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const { data: contract, error } = await admin
      .from("owner_contracts")
      .select(
        "id, lead_id, owner_name, owner_email, property_address, status, created_at, signed_at, paid_at, invoice_number, contract_pdf_path, management_fee_percent, currency, payment_amount_cents",
      )
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;
    if (!contract) return json({ error: "Link inexistent sau expirat" }, 404);

    const c = contract as Record<string, any>;

    // Lead-side milestones (best effort, only coarse status).
    let leadStatus: string | null = null;
    let leadCreatedAt: string | null = null;
    if (c.lead_id) {
      const { data: lead } = await admin
        .from("leads")
        .select("crm_status, created_at")
        .eq("id", c.lead_id)
        .maybeSingle();
      leadStatus = (lead as any)?.crm_status ?? null;
      leadCreatedAt = (lead as any)?.created_at ?? null;
    }

    const paid = !!c.paid_at;
    const signed = !!c.signed_at;
    const sent = !!c.signed_at || (!!c.status && c.status !== "draft");

    const mk = (
      key: string,
      label: string,
      description: string,
      at: string | null,
      done: boolean,
    ): Stage => ({ key, label, description, at, state: done ? "done" : "pending" });

    const stages: Stage[] = [
      mk(
        "lead",
        "Cerere înregistrată",
        "Am primit solicitarea ta și proprietatea a intrat în evaluare.",
        leadCreatedAt ?? c.created_at ?? null,
        true,
      ),
      mk(
        "evaluare",
        "Evaluare & ofertă",
        "Am analizat potențialul de randament și am pregătit oferta de administrare.",
        c.created_at ?? null,
        true,
      ),
      mk(
        "contract_trimis",
        "Contract trimis",
        "Contractul de administrare este disponibil pentru semnare digitală.",
        sent ? c.created_at ?? null : null,
        sent,
      ),
      mk(
        "contract_semnat",
        "Contract semnat",
        "Semnătura digitală a fost înregistrată.",
        c.signed_at ?? null,
        signed,
      ),
      mk(
        "plata",
        "Plată onboarding confirmată",
        "Taxa de onboarding a fost încasată și factura trimisă pe email.",
        c.paid_at ?? null,
        paid,
      ),
      mk(
        "listare",
        "Pregătire & listare",
        "Ședință foto, configurare tarife dinamice și publicare pe platforme.",
        null,
        paid && leadStatus === "listat",
      ),
    ];

    const firstPending = stages.findIndex((s) => s.state === "pending");
    if (firstPending > 0) stages[firstPending].state = "current";
    else if (firstPending === -1) stages[stages.length - 1].state = "done";

    return json({
      status: {
        owner_name: c.owner_name ?? null,
        owner_email_masked: maskEmail(c.owner_email),
        property_address: c.property_address ?? null,
        contract_status: c.status ?? null,
        invoice_number: paid ? c.invoice_number ?? null : null,
        management_fee_percent: c.management_fee_percent ?? null,
        currency: c.currency ?? "RON",
        payment_amount_cents: paid ? c.payment_amount_cents ?? null : null,
        can_sign: !signed,
        stages,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("lead-status-public error:", (err as Error)?.message);
    return json({ error: "Eroare internă" }, 500);
  }
});
