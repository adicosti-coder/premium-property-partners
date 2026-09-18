// wa-request-publish-consent — trimite proprietarului, pe WhatsApp, cererea de
// acord pentru preluarea anunțului pe realtrust.ro. Dacă fereastra de 24h este
// deschisă, mesajul pleacă direct; altfel prospectul intră în coada de mesaj
// inițial (șablon aprobat), iar cererea rămâne marcată ca „solicitată”.
// Admin-only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isExpressOptOut } from "../_shared/dncPolicy.ts";
import { publishConsentRequestText } from "../_shared/waAutoReply.ts";
import { resolveApprovedTemplate } from "../_shared/waPreferredTemplate.ts";

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

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "40" + d.slice(1);
  if (d.startsWith("7") && d.length === 9) d = "40" + d;
  return /^407\d{8}$/.test(d) ? `+${d}` : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Apel intern (cron / declanșare din baza de date) cu secretul de cron; altfel admin autentificat.
  const cronHeader = req.headers.get("x-cron-secret") || "";
  let internalOk = false;
  if (cronHeader) {
    const { data: secret } = await supabase.rpc("get_cron_reconcile_secret");
    internalOk = typeof secret === "string" && secret.length > 0 && secret === cronHeader;
  }
  if (!internalOk) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  let body: { prospect_ids?: string[] } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const ids = (body.prospect_ids || []).filter((x) => typeof x === "string").slice(0, 50);
  if (ids.length === 0) return json({ error: "prospect_ids required" }, 400);

  const { data: prospects, error } = await supabase
    .from("prospect_listings")
    .select("id, title, zone, rooms, phone_normalized, contact_phone, do_not_call, do_not_call_reason")
    .in("id", ids);
  if (error) return json({ error: error.message }, 500);

  const results: { id: string; status: string }[] = [];
  const nowIso = new Date().toISOString();

  for (const p of prospects ?? []) {
    if (p.do_not_call && isExpressOptOut(p.do_not_call_reason)) {
      results.push({ id: p.id, status: "express_opt_out" });
      continue;
    }
    const phone = normalizePhone(p.phone_normalized || p.contact_phone);
    if (!phone) {
      results.push({ id: p.id, status: "invalid_phone" });
      continue;
    }

    await supabase.from("wa_publish_consents").upsert({
      phone_normalized: phone,
      prospect_listing_id: p.id,
      status: "requested",
      requested_at: nowIso,
      source: "whatsapp",
    }, { onConflict: "phone_normalized,prospect_listing_id", ignoreDuplicates: true });

    // Fereastra de 24h deschisă → mesaj text direct.
    const { data: conv } = await supabase
      .from("wa_conversations")
      .select("id, window_expires_at")
      .eq("phone_normalized", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const windowOpen = conv?.window_expires_at &&
      new Date(conv.window_expires_at).getTime() > Date.now();

    if (conv?.id && windowOpen) {
      const resp = await fetch(`${supabaseUrl}/functions/v1/wa-andrei-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "",
        },
        body: JSON.stringify({
          conversation_id: conv.id,
          text: publishConsentRequestText(p),
          auto_kind: "publish_consent_request",
        }),
      });
      results.push({ id: p.id, status: resp.ok ? "sent" : "send_failed" });
      continue;
    }

    // Fereastră închisă → coada de mesaj inițial cu șablonul aprobat.
    // Indexul unic este parțial (doar status='pending'), deci verificăm manual
    // și inserăm; un upsert pe phone_normalized nu poate folosi acel index.
    const { data: pendingRow } = await supabase
      .from("wa_outbound_queue")
      .select("id")
      .eq("phone_normalized", phone)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (pendingRow) {
      results.push({ id: p.id, status: "already_queued" });
      continue;
    }
    const tpl = await resolveApprovedTemplate(
      Deno.env.get("WA_OUTBOUND_TEMPLATE") || "intake_prospect_apartments",
      "ro",
    );
    const { error: qErr } = await supabase.from("wa_outbound_queue").insert({
      phone_normalized: phone,
      prospect_listing_id: p.id,
      template_name: tpl.name,
      template_language: "ro",
      template_params: [],
      status: "pending",
      priority: 5,
      source: "publish_consent_request",
    });
    if (qErr) console.error("[wa-request-publish-consent] queue insert failed:", qErr);
    results.push({ id: p.id, status: qErr ? "queue_failed" : "queued" });
  }

  return json({ ok: true, results });
});
