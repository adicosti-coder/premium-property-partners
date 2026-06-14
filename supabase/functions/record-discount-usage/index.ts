import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/securityHeaders.ts";

interface UsageRequest {
  codeId: string;
  userEmail?: string;
  propertyName?: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  nights: number;
}

// Sanitize string input
const sanitizeString = (input: string | undefined, maxLength: number): string | null => {
  if (!input || typeof input !== 'string') return null;
  return input.trim().slice(0, maxLength);
};

// Validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Require authentication to prevent discount-code exhaustion via anonymous abuse
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(jwt);
      userId = user?.id || null;
    }
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: UsageRequest = await req.json();
    const { codeId, userEmail, propertyName, originalAmount, discountAmount, finalAmount, nights } = body;

    // Validate required fields
    if (!codeId || !isValidUUID(codeId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid discount code ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof originalAmount !== 'number' || typeof discountAmount !== 'number' || 
        typeof finalAmount !== 'number' || typeof nights !== 'number') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid numeric values' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email if provided
    const sanitizedEmail = sanitizeString(userEmail, 255);
    if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize property name
    const sanitizedPropertyName = sanitizeString(propertyName, 100);

    // Verify the discount code exists and is active
    const { data: discountCode, error: codeError } = await supabase
      .from('discount_codes')
      .select('id, is_active, max_uses, current_uses, discount_type, discount_value')
      .eq('id', codeId)
      .single();

    // Server-side recompute of discount/final amounts to prevent tampering
    if (discountCode) {
      const expectedDiscount = discountCode.discount_type === 'percentage'
        ? (originalAmount * Number(discountCode.discount_value)) / 100
        : Number(discountCode.discount_value);
      const cappedDiscount = Math.min(expectedDiscount, originalAmount);
      if (Math.abs(discountAmount - cappedDiscount) > 0.01) {
        return new Response(
          JSON.stringify({ success: false, error: 'Discount amount mismatch' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const expectedFinal = Math.max(0, originalAmount - cappedDiscount);
      if (Math.abs(finalAmount - expectedFinal) > 0.01) {
        return new Response(
          JSON.stringify({ success: false, error: 'Final amount mismatch' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (codeError || !discountCode) {
      console.error('Discount code not found:', codeError);
      return new Response(
        JSON.stringify({ success: false, error: 'Discount code not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!discountCode.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Discount code is no longer active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (discountCode.max_uses !== null && discountCode.current_uses >= discountCode.max_uses) {
      return new Response(
        JSON.stringify({ success: false, error: 'Discount code has reached maximum uses' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Recording discount usage for user=${userId}`);

    // Insert usage record using service role (bypasses RLS)
    const { error: insertError } = await supabase
      .from('discount_code_uses')
      .insert({
        code_id: codeId,
        user_id: userId,
        user_email: sanitizedEmail,
        property_name: sanitizedPropertyName,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        nights: nights,
      });

    if (insertError) {
      console.error('Error recording discount usage:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record usage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: The increment_discount_code_uses trigger will automatically update current_uses

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in record-discount-usage:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
