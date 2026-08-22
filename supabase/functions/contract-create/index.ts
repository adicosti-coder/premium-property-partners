// contract-create
// Admin-only: generates a draft management contract pre-filled from a lead and
// returns the public signing token/link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { logLeadEvent } from "../_shared/leadEvents.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const clean = (v: unknown, max = 300) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

function buildContractBody(input: {
  owner_name: string;
  owner_tax_id: string | null;
  owner_address: string | null;
  property_address: string | null;
  management_fee_percent: number;
  onboarding_fee_cents: number;
  photo_session_included: boolean;
  photo_session_fee_cents: number;
  currency: string;
}) {
  const onboardingFee = (input.onboarding_fee_cents / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 });
  const photoFee = (input.photo_session_fee_cents / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 });
  const total = ((input.onboarding_fee_cents + (input.photo_session_included ? input.photo_session_fee_cents : 0)) / 100)
    .toLocaleString("ro-RO", { minimumFractionDigits: 2 });
  const photoClause = input.photo_session_included
    ? `\n\n4.2. ȘEDINȚĂ FOTO PROFESIONALĂ\nProprietarul achită separat suma de ${photoFee} ${input.currency.toUpperCase()} pentru ședința foto profesională a proprietății (fotografiere, selecție și editare imagini), plătibilă odată cu taxa de onboarding.`
    : "\n\n4.2. ȘEDINȚĂ FOTO PROFESIONALĂ\nȘedința foto profesională nu este inclusă în taxa de onboarding și se poate achita separat la solicitare, la prețul de ${photoFee} ${input.currency.toUpperCase()}.";
  return `CONTRACT DE ADMINISTRARE ÎN REGIM HOTELIER
RealTrust Timișoara

1. PĂRȚILE
Prestator: RealTrust Timișoara, reprezentat de Adrian Costi.
Proprietar: ${input.owner_name}${input.owner_tax_id ? ` (CNP/CUI: ${input.owner_tax_id})` : ""}${input.owner_address ? `, cu domiciliul/sediul în ${input.owner_address}` : ""}.

2. OBIECTUL CONTRACTULUI
Administrarea completă în regim hotelier a proprietății situate în ${input.property_address ?? "(adresă de completat)"}: listare pe platformele de rezervări, pricing dinamic, comunicarea cu oaspeții, curățenie, mentenanță și raportare financiară lunară.

3. COMISION
Prestatorul reține un comision de ${input.management_fee_percent}% din încasările brute realizate din exploatarea proprietății. Restul se virează Proprietarului lunar, împreună cu raportul detaliat.

4. TAXĂ DE ONBOARDING
Proprietarul achită o taxă unică de setup de ${onboardingFee} ${input.currency.toUpperCase()}, care acoperă crearea și optimizarea anunțurilor pe platformele de rezervări, configurarea sistemului de acces și integrarea proprietății în platforma de management. Ședința foto profesională este facturată separat.${photoClause}

Total de plată la semnare: ${total} ${input.currency.toUpperCase()}.

5. DURATĂ ȘI ÎNCETARE
Contractul se încheie pe o perioadă de 12 luni, cu reînnoire automată. Proprietarul beneficiază de o perioadă de probă de 90 de zile, în care poate denunța unilateral contractul fără penalități, cu o notificare de 30 de zile.

6. RĂSPUNDERE PENTRU DAUNE
Daunele produse de oaspeți sunt gestionate pe trei niveluri: garanția oaspetelui, asigurarea platformei de rezervări și, în subsidiar, fondul de reparații al Prestatorului, conform politicii de daune comunicate Proprietarului.

7. PROTECȚIA DATELOR
Părțile prelucrează datele personale conform GDPR și a Politicii de confidențialitate publicate pe realtrust.ro.

8. SEMNARE
Prezentul contract se semnează digital, prin confirmarea unui cod unic transmis pe adresa de email a Proprietarului. Semnătura digitală are aceeași valoare juridică ca semnătura olografă.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));

    const owner_name = clean(body?.owner_name, 160);
    if (!owner_name || owner_name.length < 3) return json({ error: "Numele proprietarului este obligatoriu." }, 400);

    const leadId = clean(body?.lead_id, 64);
    const email = clean(body?.owner_email, 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json({ error: "Adresa de email nu este validă." }, 400);
    }

    const feePercent = Number(body?.management_fee_percent);
    const management_fee_percent = Number.isFinite(feePercent) && feePercent > 0 && feePercent <= 50 ? feePercent : 20;

    const feeCents = Number(body?.onboarding_fee_cents);
    const onboarding_fee_cents =
      Number.isFinite(feeCents) && feeCents >= 0 && feeCents <= 10_000_000 ? Math.round(feeCents) : 50_000;

    const photoSessionCents = Number(body?.photo_session_fee_cents);
    const photo_session_fee_cents =
      Number.isFinite(photoSessionCents) && photoSessionCents >= 0 && photoSessionCents <= 10_000_000
        ? Math.round(photoSessionCents)
        : 50_000;
    const photo_session_included = body?.photo_session_included === true || body?.photo_session_included === "true";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const line_items = [
      { price_id: "onboarding_fee_standard", label: "Taxă onboarding administrare RealTrust", amount_cents: onboarding_fee_cents },
      ...(photo_session_included
        ? [{ price_id: "photo_session_standard", label: "Ședință foto profesională", amount_cents: photo_session_fee_cents }]
        : []),
    ];

    const payload = {
      token: randomToken(),
      lead_id: leadId,
      owner_name,
      owner_email: email,
      owner_tax_id: clean(body?.owner_tax_id, 32),
      owner_address: clean(body?.owner_address),
      property_address: clean(body?.property_address),
      management_fee_percent,
      onboarding_fee_cents,
      photo_session_included,
      photo_session_fee_cents,
      currency: "ron",
      status: "draft",
      line_items,
      created_by: auth.userId ?? null,
    };

    const contract_body = buildContractBody({
      owner_name,
      owner_tax_id: payload.owner_tax_id,
      owner_address: payload.owner_address,
      property_address: payload.property_address,
      management_fee_percent,
      onboarding_fee_cents,
      photo_session_included,
      photo_session_fee_cents,
      currency: payload.currency,
    });

    const { data, error } = await admin
      .from("owner_contracts")
      .insert({ ...payload, contract_body })
      .select("id, token, status")
      .single();

    if (error) throw error;

    if (leadId) {
      await logLeadEvent({
        leadId,
        type: "contract_created",
        status: "success",
        message: "Draft contract de administrare generat",
        actor: "contract-create",
        metadata: { contract_id: (data as { id: string }).id },
      }, admin);
    }

    return json({ contract: data });
  } catch (err) {
    console.error("contract-create error:", (err as Error)?.message);
    return json({ error: "Nu am putut genera contractul." }, 500);
  }
});
