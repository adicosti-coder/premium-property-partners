import { supabase } from "@/lib/supabaseClient";

/**
 * Fetches a short-lived signed URL for a signed-contract PDF (private bucket)
 * and opens it in a new tab. Generates the PDF on the fly if it is missing.
 */
export async function openContractPdf(contractId: string, regenerate = false): Promise<void> {
  const { data, error } = await supabase.functions.invoke("contract-pdf-url", {
    body: { contract_id: contractId, regenerate },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Link PDF indisponibil.");
  window.open(data.url as string, "_blank", "noopener,noreferrer");
}
