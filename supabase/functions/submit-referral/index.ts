import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function validateString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d+\s()-]/g, "").trim().slice(0, 30);
  return cleaned.length ? cleaned : null;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

type SubmitReferralBody = {
  referrerName: string;
  referrerEmail: string;
  referrerPhone?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyLocation?: string;
  propertyType?: string;
  propertyRooms?: number;
  ownerMessage?: string;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = (await req.json()) as Partial<SubmitReferralBody>;

    // Optional auth: if user is logged in, trust token over provided email.
    const authHeader = req.headers.get("Authorization");
    let authedUser: { id: string; email: string | null } | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
      if (!authError && user) {
        authedUser = { id: user.id, email: user.email ?? null };
      }
    }

    const referrerName = validateString(body.referrerName, 100);
    const referrerEmailRaw = validateString(body.referrerEmail, 255);
    const referrerEmail = authedUser?.email ?? referrerEmailRaw;
    const referrerUserId = authedUser?.id ?? null;
    const referrerPhone = sanitizePhone(body.referrerPhone);

    const ownerName = validateString(body.ownerName, 100);
    const ownerEmail = validateString(body.ownerEmail, 255);
    const ownerPhoneRaw = validateString(body.ownerPhone, 30);

    const ownerMessage = validateString(body.ownerMessage, 2000) || null;
    const propertyLocation = validateString(body.propertyLocation, 120) || null;
    const propertyType = validateString(body.propertyType, 50) || null;
    const propertyRooms = Number.isFinite(body.propertyRooms as number)
      ? Math.max(0, Math.min(99, Number(body.propertyRooms)))
      : null;

    if (!referrerName || referrerName.length < 2) {
      return new Response(JSON.stringify({ error: "Invalid referrer name" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!referrerEmail || !isValidEmail(referrerEmail)) {
      return new Response(JSON.stringify({ error: "Invalid referrer email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!ownerName || ownerName.length < 2) {
      return new Response(JSON.stringify({ error: "Invalid owner name" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!ownerEmail || !isValidEmail(ownerEmail)) {
      return new Response(JSON.stringify({ error: "Invalid owner email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!ownerPhoneRaw || ownerPhoneRaw.length < 5) {
      return new Response(JSON.stringify({ error: "Invalid owner phone" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data, error } = await supabase
      .from("referrals")
      .insert({
        referrer_name: referrerName,
        referrer_email: referrerEmail,
        referrer_phone: referrerPhone,
        referrer_user_id: referrerUserId,
        owner_name: ownerName,
        owner_email: ownerEmail,
        owner_phone: ownerPhoneRaw,
        owner_message: ownerMessage,
        property_location: propertyLocation,
        property_type: propertyType,
        property_rooms: propertyRooms,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("submit-referral insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to submit referral" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("submit-referral error:", e);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
