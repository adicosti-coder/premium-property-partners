// Acordul proprietarului NU publică singur: după „DA”, anunțul rămâne
// `pending_approval` până când administratorul răspunde 1 (aprob) / 2 (respinge)
// pe WhatsApp. Dacă adminul aprobase deja anunțul, acordul devine direct `granted`.

/** Stările inspecției în care adminul a aprobat deja anunțul. */
const ADMIN_APPROVED = new Set(["approved", "approved_waiting_consent", "published"]);

export type ConsentStatusAfterYes = "pending_approval" | "granted" | "published";

/** Starea acordului după un „DA” valid, în funcție de decizia adminului și de starea existentă. */
export function consentStatusAfterOwnerYes(
  inspectionStatus: string | null | undefined,
  existingStatus?: string | null,
): ConsentStatusAfterYes {
  if (existingStatus === "published") return "published";
  if (existingStatus === "granted") return "granted";
  return ADMIN_APPROVED.has(String(inspectionStatus ?? "")) ? "granted" : "pending_approval";
}

/** Adminul trebuie să primească mesajul de inspecție (1/2) dacă nu l-a primit încă. */
export function needsInspectionDispatch(insp: { status?: string | null; sent_at?: string | null } | null | undefined): boolean {
  if (!insp) return true;
  if (insp.status === "no_phone") return true;
  return insp.status === "pending" && !insp.sent_at;
}

/**
 * Salvează acordul proprietarului și decide pasul următor:
 *  - `granted` → pornește publicarea (adminul aprobase deja);
 *  - `pending_approval` → nu publică; trimite inspecția adminului dacă lipsește.
 */
export async function recordOwnerConsent(
  supabase: any,
  args: {
    phone: string;
    prospectId: string | null;
    consentId?: string | null;
    message: string;
    trigger: string;
    requestTemplate?: string | null;
    supabaseUrl: string;
    serviceKey: string;
    triggeredBy?: string;
  },
): Promise<{ consentId: string | null; status: ConsentStatusAfterYes | null; waitingAdmin: boolean }> {
  const nowIso = new Date().toISOString();
  let existing: { id: string; status: string; request_template: string | null } | null = null;
  if (args.consentId) {
    const { data } = await supabase.from("wa_publish_consents")
      .select("id, status, request_template").eq("id", args.consentId).maybeSingle();
    existing = data;
  } else if (args.prospectId) {
    const { data } = await supabase.from("wa_publish_consents")
      .select("id, status, request_template").eq("prospect_listing_id", args.prospectId)
      .neq("status", "revoked").order("created_at", { ascending: false }).limit(1).maybeSingle();
    existing = data;
  }

  let insp: { status?: string | null; sent_at?: string | null } | null = null;
  if (args.prospectId) {
    const { data } = await supabase.from("listing_inspections")
      .select("status, sent_at").eq("prospect_listing_id", args.prospectId).maybeSingle();
    insp = data;
  }
  const status = consentStatusAfterOwnerYes(insp?.status, existing?.status);

  const row: Record<string, unknown> = {
    status,
    consent_text: args.message.slice(0, 1000),
    consented_at: nowIso,
    revoked_at: null,
    consent_trigger: args.trigger,
    source: "whatsapp",
  };
  if (args.requestTemplate) row.request_template = args.requestTemplate;

  let consentId: string | null = existing?.id ?? null;
  if (existing) {
    const { error } = await supabase.from("wa_publish_consents").update(row).eq("id", existing.id);
    if (error) console.error("[owner-consent] update failed:", error);
  } else {
    const { data, error } = await supabase.from("wa_publish_consents")
      .upsert({ ...row, phone_normalized: args.phone, prospect_listing_id: args.prospectId }, { onConflict: "phone_normalized,prospect_listing_id" })
      .select("id").maybeSingle();
    if (error) console.error("[owner-consent] upsert failed:", error);
    consentId = data?.id ?? null;
  }

  if (!args.prospectId) return { consentId, status, waitingAdmin: false };

  if (status === "granted") {
    fetch(`${args.supabaseUrl}/functions/v1/auto-publish-listing-worker`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${args.serviceKey}`, "x-cron-secret": args.serviceKey },
      body: JSON.stringify({ prospect_id: args.prospectId, triggered_by: args.triggeredBy ?? "wa_owner_consent", consent_id: consentId }),
    }).catch((e) => console.error("[owner-consent] publish trigger failed:", e));
    return { consentId, status, waitingAdmin: false };
  }

  if (status === "pending_approval" && needsInspectionDispatch(insp)) {
    fetch(`${args.supabaseUrl}/functions/v1/listing-inspection-dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": args.serviceKey },
      body: JSON.stringify({ prospect_id: args.prospectId }),
    }).catch((e) => console.error("[owner-consent] inspection dispatch failed:", e));
  }
  return { consentId, status, waitingAdmin: status === "pending_approval" };
}

/** Decizia adminului (1/2) mută acordurile în așteptare: aprob → granted, respinge → rejected. */
export async function applyAdminDecisionToConsents(
  supabase: any,
  prospectId: string,
  action: "approve" | "reject",
): Promise<number> {
  const { data, error } = await supabase.from("wa_publish_consents")
    .update(action === "approve"
      ? { status: "granted" }
      : { status: "rejected", notes: "admin_rejected" })
    .eq("prospect_listing_id", prospectId)
    .eq("status", "pending_approval")
    .is("revoked_at", null)
    .select("id");
  if (error) console.error("[owner-consent] admin decision update failed:", error);
  return data?.length ?? 0;
}
