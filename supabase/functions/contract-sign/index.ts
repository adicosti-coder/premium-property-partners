// contract-sign
// Token-authenticated digital signing of an owner contract.
//
// Actions:
//   send_code  → generates a 6-digit code, emails it to the owner (Resend, with
//                verified-sender + DB fallback) and stores only its SHA-256 hash.
//   sign       → validates the code + terms acceptance, stores the signature
//                (name, IP, user agent, timestamp) and flips the status to
//                "signed", ready for checkout.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTeamEmail } from "../_shared/teamEmail.ts";
import { logLeadEvent } from "../_shared/leadEvents.ts";
import { generateAndStoreContractPdf } from "../_shared/contractPdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    const action = body?.action === "sign" ? "sign" : "send_code";
    if (!/^[a-f0-9]{32,64}$/i.test(token)) return json({ error: "Token invalid" }, 400);

    const { data: contract, error } = await admin
      .from("owner_contracts")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;
    if (!contract) return json({ error: "Contract inexistent" }, 404);
    if (contract.status === "paid") return json({ error: "Contractul este deja plătit" }, 409);

    // ── send_code ─────────────────────────────────────────────────────────────
    if (action === "send_code") {
      const email = typeof body?.email === "string" && body.email.includes("@")
        ? body.email.trim().slice(0, 200)
        : contract.owner_email;
      if (!email) return json({ error: "Adresă de email lipsă" }, 400);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      await admin
        .from("owner_contracts")
        .update({
          owner_email: email,
          otp_code_hash: await sha256(`${contract.id}:${code}`),
          otp_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
          otp_attempts: 0,
          status: contract.status === "draft" ? "sent" : contract.status,
        })
        .eq("id", contract.id);

      const result = await sendTeamEmail({
        to: email,
        subject: `Cod de semnare contract RealTrust: ${code}`,
        html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px">
          <h2 style="color:#1a365d;margin:0 0 8px">Codul tău de semnare</h2>
          <p style="color:#6e7480;margin:0 0 16px">Introdu acest cod în pagina de semnare pentru a confirma contractul de administrare.</p>
          <p style="font-size:32px;letter-spacing:6px;font-weight:700;color:#1a365d;margin:0 0 16px">${code}</p>
          <p style="color:#6e7480;font-size:13px">Codul expiră în 15 minute. Dacă nu ai solicitat acest cod, ignoră emailul.</p>
          <p style="color:#6e7480;font-size:12px">RealTrust Timișoara · ${escapeHtml(contract.owner_name)}</p>
        </div>`,
        contractId: contract.id,
        leadId: contract.lead_id,
        source: "contract-sign-otp",
      }, admin);

      return json({ ok: true, email_sent: result.sent, stored_fallback: !!result.storedFallback });
    }

    // ── sign ──────────────────────────────────────────────────────────────────
    const code = String(body?.code ?? "").trim();
    const signatureName = String(body?.signature_name ?? "").trim().slice(0, 120);
    if (body?.accepted_terms !== true) return json({ error: "Trebuie să accepți termenii" }, 400);
    if (signatureName.length < 3) return json({ error: "Nume semnatar invalid" }, 400);
    if (!/^\d{6}$/.test(code)) return json({ error: "Cod invalid" }, 400);
    if (!contract.otp_code_hash || !contract.otp_expires_at) {
      return json({ error: "Solicită mai întâi un cod de confirmare" }, 400);
    }
    if (new Date(contract.otp_expires_at).getTime() < Date.now()) {
      return json({ error: "Codul a expirat. Solicită unul nou." }, 400);
    }
    if ((contract.otp_attempts ?? 0) >= 5) {
      return json({ error: "Prea multe încercări. Solicită un cod nou." }, 429);
    }

    const hash = await sha256(`${contract.id}:${code}`);
    if (hash !== contract.otp_code_hash) {
      await admin
        .from("owner_contracts")
        .update({ otp_attempts: (contract.otp_attempts ?? 0) + 1 })
        .eq("id", contract.id);
      return json({ error: "Cod greșit" }, 400);
    }

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
    await admin
      .from("owner_contracts")
      .update({
        status: "signed",
        signature_name: signatureName,
        signature_ip: ip,
        signature_user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
        signed_at: new Date().toISOString(),
        otp_code_hash: null,
        otp_expires_at: null,
      })
      .eq("id", contract.id);

    if (contract.lead_id) {
      await admin.from("leads").update({ crm_status: "contract_semnat" }).eq("id", contract.lead_id);
      await logLeadEvent({
        leadId: contract.lead_id,
        type: "contract_signed",
        status: "success",
        message: `Contract semnat digital de ${signatureName}`,
        actor: "contract-sign",
        metadata: { contract_id: contract.id },
      }, admin);
    }

    return json({ ok: true, status: "signed" });
  } catch (err) {
    console.error("contract-sign error:", (err as Error)?.message);
    return json({ error: "Eroare internă" }, 500);
  }
});
