import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   Phone Lookup Enrich — Twilio Lookup v2 (Line Type Intelligence)

   Lookup API trăiește pe lookups.twilio.com (NU api.twilio.com), deci
   nu putem trece prin gateway-ul standard care prefixează Account SID.
   Folosim Basic Auth direct:
     - TWILIO_ACCOUNT_SID
     - TWILIO_AUTH_TOKEN
   Dacă lipsesc, returnăm 400 cu instrucțiuni pentru admin.

   Marchează numerele ca:
     - line_type: mobile | landline | voip | unknown
     - is_unreachable: true dacă Twilio raportează 60600/60601/404
   Autopilot filtrează apoi numerele voip/landline/unreachable.

   Body:
     { mode: "batch", limit?: number }   → procesează coada (max 200)
     { mode: "single", phone: "+407..." } → enrich on-demand
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(phone: string): string {
  const raw = phone.replace(/[^\d+]/g, "");
  if (raw.startsWith("+")) return raw;
  if (raw.startsWith("004")) return "+" + raw.slice(2);
  if (raw.startsWith("0") && raw.length === 10) return "+4" + raw;
  if (raw.startsWith("40") && raw.length === 11) return "+" + raw;
  if (raw.startsWith("7") && raw.length === 9) return "+40" + raw;
  return phone; // fallback: trimis ca este
}

async function lookupPhone(phone: string, sid: string, token: string) {
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}?Fields=line_type_intelligence`;
  const auth = btoa(`${sid}:${token}`);
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return new Response(JSON.stringify({
        error: "Twilio Lookup nu este configurat. Adaugă secretele TWILIO_ACCOUNT_SID și TWILIO_AUTH_TOKEN (din Twilio Console → Account → API keys & tokens).",
        missing: { TWILIO_ACCOUNT_SID: !TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN: !TWILIO_AUTH_TOKEN },
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || "batch";
    const limit = Math.min(Math.max(1, Number(body?.limit) || 50), 200);

    // Auth: admin OR service-role internal call OR x-lovable-api-key
    const authHeader = req.headers.get("Authorization") || "";
    const lovableApiKey = req.headers.get("x-lovable-api-key") || "";
    const expectedLovableKey = Deno.env.get("LOVABLE_API_KEY");
    const isService = authHeader === `Bearer ${SERVICE_KEY}`;
    const isLovableKey = expectedLovableKey && lovableApiKey === expectedLovableKey;
    if (!isService && !isLovableKey) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Auth required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let phones: string[] = [];

    if (mode === "single" && body?.phone) {
      // Ensure row exists
      await supabase.from("phone_intelligence").upsert(
        { phone_number: String(body.phone), last_seen: new Date().toISOString() },
        { onConflict: "phone_number" },
      );
      phones = [String(body.phone)];
    } else {
      const { data: pending } = await supabase
        .from("phone_intelligence")
        .select("phone_number")
        .is("lookup_at", null)
        .eq("is_blacklisted", false)
        .order("last_seen", { ascending: false })
        .limit(limit);
      phones = (pending || []).map((p: any) => p.phone_number).filter(Boolean);
    }

    if (phones.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "No phones pending lookup" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { processed: 0, mobile: 0, landline: 0, voip: 0, unreachable: 0, errors: 0 };

    for (const phone of phones) {
      try {
        const { ok, status, data } = await lookupPhone(phone, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        if (!ok) {
          const code = data?.code || data?.error_code;
          const isUnreachable = code === 60600 || code === 60601 || status === 404;
          await supabase.from("phone_intelligence").update({
            lookup_at: new Date().toISOString(),
            lookup_error: `${status}:${code || "unknown"}:${(data?.message || "").slice(0, 120)}`,
            is_unreachable: isUnreachable,
          }).eq("phone_number", phone);
          if (isUnreachable) results.unreachable++;
          else results.errors++;
        } else {
          const lti = data?.line_type_intelligence || {};
          const rawType = String(lti.type || "unknown").toLowerCase();
          const isVoip = /voip/.test(rawType);
          const lineType = isVoip ? "voip" : (rawType === "mobile" || rawType === "landline" ? rawType : "unknown");
          const carrier = lti.carrier_name || data?.carrier?.name || null;
          const country = data?.country_code || null;

          await supabase.from("phone_intelligence").update({
            line_type: lineType,
            carrier_name: carrier,
            country_code: country,
            lookup_at: new Date().toISOString(),
            lookup_error: null,
            is_unreachable: false,
          }).eq("phone_number", phone);

          if (lineType === "mobile") results.mobile++;
          else if (lineType === "landline") results.landline++;
          else if (isVoip) results.voip++;

          results.processed++;
        }
      } catch (e) {
        results.errors++;
        await supabase.from("phone_intelligence").update({
          lookup_at: new Date().toISOString(),
          lookup_error: `exception:${(e as Error).message.slice(0, 120)}`,
        }).eq("phone_number", phone);
      }
      // Tier-1 Lookup quota — gentle pace
      await new Promise((r) => setTimeout(r, 120));
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("phone-lookup-enrich error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
