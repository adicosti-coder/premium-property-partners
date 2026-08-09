// wa-outbound-enqueue — pune proprietarii extrași din scraper în coada de mesaj
// inițial (marketing template) pentru Andrei pe WhatsApp.
// Admin-only (sau apel intern din automatizări cu service role / x-webhook-secret).
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DEFAULT_TEMPLATE = Deno.env.get("WA_OUTBOUND_TEMPLATE") || "realtrust_owner_intro";

/** RO phone → +40XXXXXXXXX, or null when unusable. */
function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "40" + d.slice(1);
  if (d.startsWith("7") && d.length === 9) d = "40" + d;
  return /^40[237]\d{8}$/.test(d) ? `+${d}` : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  let body: {
    prospect_ids?: string[];
    template_name?: string;
    template_language?: string;
    limit?: number;
    priority?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const templateName = (body.template_name || DEFAULT_TEMPLATE).trim();
  const templateLanguage = (body.template_language || "ro").trim();
  const priority = Number.isFinite(body.priority) ? Number(body.priority) : 0;
  const limit = Math.min(200, Math.max(1, Number(body.limit) || 50));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Candidați: prospecți cu telefon valid, care nu sunt agenții și nu sunt deja contactați.
  let query = supabase
    .from("prospect_listings")
    .select("id, title, zone, rooms, phone_normalized, contact_phone, lifecycle_status")
    .limit(limit);

  if (body.prospect_ids?.length) {
    query = query.in("id", body.prospect_ids.slice(0, limit));
  } else {
    query = query
      .in("lifecycle_status", ["new", "interested", "callback"])
      .order("created_at", { ascending: false });
  }

  const { data: prospects, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const rows: Record<string, unknown>[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const p of prospects ?? []) {
    const phone = normalizePhone(p.phone_normalized || p.contact_phone);
    if (!phone) {
      skipped.push({ id: p.id, reason: "invalid_phone" });
      continue;
    }

    // DNC / blocklist check pe phone_intelligence
    const { data: intel } = await supabase
      .from("phone_intelligence")
      .select("is_blacklisted, is_unreachable")
      .eq("phone_number", phone)
      .maybeSingle();
    if (intel?.is_blacklisted || intel?.is_unreachable) {
      skipped.push({ id: p.id, reason: intel?.is_blacklisted ? "blacklisted" : "unreachable" });
      continue;
    }


    rows.push({
      phone_normalized: phone,
      prospect_listing_id: p.id,
      template_name: templateName,
      template_language: templateLanguage,
      template_params: [p.zone || "Timișoara", p.rooms ? `${p.rooms} camere` : "proprietatea"],
      status: "pending",
      priority,
      source: "scraper",
    });
  }

  if (rows.length === 0) {
    return json({ ok: true, enqueued: 0, skipped });
  }

  // Unique partial index pe (phone_normalized) where status='pending' → ignoră duplicatele.
  const { data: inserted, error: insErr } = await supabase
    .from("wa_outbound_queue")
    .upsert(rows, { onConflict: "phone_normalized", ignoreDuplicates: true })
    .select("id, phone_normalized");

  if (insErr) {
    console.error("wa_outbound_queue insert failed:", insErr);
    return json({ error: insErr.message }, 500);
  }

  return json({
    ok: true,
    enqueued: inserted?.length ?? 0,
    candidates: rows.length,
    skipped,
    template: templateName,
  });
});
