import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const isValidBookingId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{10,80}$/.test(value);

const isValidAccessToken = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { bookingId } = await req.json();
    const authHeader = req.headers.get("Authorization") || "";
    if (!isValidAccessToken(bookingId) && !isValidBookingId(bookingId)) {
      return new Response(JSON.stringify({ error: "Invalid booking link" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let isAdmin = false;
    if (authHeader.startsWith("Bearer ")) {
      const jwt = authHeader.replace("Bearer ", "").trim();
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) {
        const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        isAdmin = !!data;
      }
    }

    const query = supabase
      .from("guest_guides")
      .select("*");

    const { data: guide, error } = await (isValidAccessToken(bookingId)
      ? query.eq("public_access_token", bookingId)
      : isAdmin
        ? query.eq("booking_id", bookingId)
        : query.eq("public_access_token", "00000000-0000-4000-8000-000000000000")
    ).maybeSingle();

    if (error) throw error;
    if (!guide) {
      return new Response(JSON.stringify({ guide: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const canShowAccessCode = guide.check_in_date && guide.check_out_date
      ? today >= guide.check_in_date && today <= guide.check_out_date
      : false;

    return new Response(JSON.stringify({
      guide: {
        ...guide,
        pin_code: canShowAccessCode ? guide.pin_code : null,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("guest-guide error", error);
    return new Response(JSON.stringify({ error: "Could not load guest guide" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});