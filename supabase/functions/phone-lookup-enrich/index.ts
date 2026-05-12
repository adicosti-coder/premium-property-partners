import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   Phone Lookup Enrich — Twilio Lookup v2 (Line Type Intelligence)
   - Fetch line_type (mobile / landline / voip / unknown), carrier name
     and country code for phone numbers stored in phone_intelligence.
   - Marks unreachable numbers (lookup error 60601, 60600 etc) so the
     autopilot won't call them anymore.
   - Modes:
       { mode: "batch", limit?: number }  → processes oldest non-enriched
       { mode: "single", phone: "+407..." } → enrich one number on demand
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Twilio Lookup v2 is at base /v2/PhoneNumbers and is NOT prefixed with the
// Account SID, so we must call lookups.twilio.com directly via the gateway.
const LOOKUPS_GATEWAY = "https://connector-gateway.lovable.dev/twilio_lookup/v2/PhoneNumbers";
// Fallback: the standard Twilio gateway exposes Lookup under /Lookups/v2/PhoneNumbers in some setups.
const STANDARD_LOOKUP_GATEWAY = "https://connector-gateway.lovable.dev/twilio/2010-04-01/Accounts";

async function lookupPhone(phone: string, lovableKey: string, twilioKey: string) {
  // Direct lookup endpoint via REST (preferred). Use api.twilio.com? No — must use gateway.
  // We hit the path /v2/PhoneNumbers/{phone}?Fields=line_type_intelligence using the
  // Twilio gateway's pass-through. The Lovable gateway forwards arbitrary Twilio
  // sub-paths, including lookups.twilio.com via the configured connector.
  const url = `${LOOKUPS_GATEWAY}/${encodeURIComponent(phone)}?Fields=line_type_intelligence`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      return new Response(JSON.stringify({ error: "Twilio connector not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || "batch";
    const limit = Math.min(Math.max(1, Number(body?.limit) || 50), 200);

    // Auth: admin or service_role
    const authHeader = req.headers.get("Authorization") || "";
    const isService = authHeader === `Bearer ${SERVICE_KEY}`;
    if (!isService) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return new Response(JSON.stringify({ error: "Auth required" }), { status: 401, headers: corsHeaders });
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return new Response(JSON.stringify({ error: "Admin required" }), { status: 403, headers: corsHeaders });
    }

    let phones: string[] = [];

    if (mode === "single" && body?.phone) {
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
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "No phones pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { processed: 0, mobile: 0, landline: 0, voip: 0, unreachable: 0, errors: 0 };

    for (const phone of phones) {
      try {
        const { ok, status, data } = await lookupPhone(phone, LOVABLE_API_KEY, TWILIO_API_KEY);

        if (!ok) {
          // 60600 = invalid number, 60601 = unprovisioned, 20404 = not found
          const code = data?.code || data?.error_code;
          const isUnreachable = code === 60600 || code === 60601 || status === 404;
          await supabase.from("phone_intelligence").update({
            lookup_at: new Date().toISOString(),
            lookup_error: `${status}:${code || "unknown"}:${(data?.message || "").slice(0, 120)}`,
            is_unreachable: isUnreachable,
          }).eq("phone_number", phone);
          if (isUnreachable) results.unreachable++;
          else results.errors++;
          continue;
        }

        const lti = data?.line_type_intelligence || {};
        const lineType = String(lti.type || "unknown").toLowerCase(); // mobile, landline, fixedVoip, nonFixedVoip, ...
        const carrier = lti.carrier_name || data?.carrier?.name || null;
        const country = data?.country_code || null;
        const isVoip = /voip/i.test(lineType);

        await supabase.from("phone_intelligence").update({
          line_type: isVoip ? "voip" : lineType,
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
      } catch (e) {
        results.errors++;
        await supabase.from("phone_intelligence").update({
          lookup_at: new Date().toISOString(),
          lookup_error: `exception:${(e as Error).message.slice(0, 120)}`,
        }).eq("phone_number", phone);
      }
      // Twilio Lookup tier 1 quota — gentle pace
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
