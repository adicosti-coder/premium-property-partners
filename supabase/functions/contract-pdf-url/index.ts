// contract-pdf-url
// Admin-only: returns a short-lived signed URL for a signed-contract PDF stored
// in the private `owner-contracts` bucket. Regenerates the PDF on demand
// (?regenerate=true) if it is missing or the contract data changed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { BUCKET, generateAndStoreContractPdf } from "../_shared/contractPdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const contractId = String(body?.contract_id ?? "");
    const regenerate = body?.regenerate === true;
    if (!UUID.test(contractId)) return json({ error: "contract_id invalid" }, 400);

    const { data: contract, error } = await admin
      .from("owner_contracts")
      .select("*")
      .eq("id", contractId)
      .maybeSingle();
    if (error) throw error;
    if (!contract) return json({ error: "Contract inexistent" }, 404);
    if (!(contract as any).signed_at) return json({ error: "Contractul nu este semnat încă" }, 409);

    let path = (contract as any).contract_pdf_path as string | null;
    if (!path || regenerate) {
      const result = await generateAndStoreContractPdf(contract as any, admin);
      if (!result.ok || !result.path) return json({ error: result.error ?? "Generare PDF eșuată" }, 500);
      path = result.path;
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, 600);
    if (signErr || !signed?.signedUrl) return json({ error: signErr?.message ?? "Signed URL eșuat" }, 500);

    return json({ ok: true, url: signed.signedUrl, path, expires_in: 600 });
  } catch (err) {
    console.error("contract-pdf-url error:", (err as Error)?.message);
    return json({ error: "Eroare internă" }, 500);
  }
});
