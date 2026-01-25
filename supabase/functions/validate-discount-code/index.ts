import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  code: string;
  nights?: number;
  totalAmount?: number;
}

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_booking_nights: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code, nights = 1, totalAmount = 0 }: ValidationRequest = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Codul promoțional este obligatoriu' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize code to uppercase
    const normalizedCode = code.trim().toUpperCase();

    console.log(`Validating discount code: ${normalizedCode} for ${nights} nights, amount: ${totalAmount}`);

    // Fetch the discount code
    const { data: discountCode, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching discount code:', error);
      throw error;
    }

    if (!discountCode) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Codul promoțional nu există sau nu este activ' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const codeData = discountCode as DiscountCode;
    const now = new Date();

    // Check validity period
    const validFrom = new Date(codeData.valid_from);
    if (now < validFrom) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Codul promoțional nu este încă valabil' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (codeData.valid_until) {
      const validUntil = new Date(codeData.valid_until);
      if (now > validUntil) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Codul promoțional a expirat' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check max uses
    if (codeData.max_uses !== null && codeData.current_uses >= codeData.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Codul promoțional a atins limita de utilizări' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check minimum nights
    if (nights < codeData.min_booking_nights) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Codul promoțional necesită minim ${codeData.min_booking_nights} nopți` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (codeData.discount_type === 'percentage') {
      discountAmount = (totalAmount * codeData.discount_value) / 100;
    } else {
      discountAmount = codeData.discount_value;
    }

    // Ensure discount doesn't exceed total
    discountAmount = Math.min(discountAmount, totalAmount);

    console.log(`Code ${normalizedCode} is valid. Discount: ${discountAmount}`);

    return new Response(
      JSON.stringify({
        valid: true,
        code: codeData.code,
        codeId: codeData.id,
        description: codeData.description,
        discountType: codeData.discount_type,
        discountValue: codeData.discount_value,
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalAmount: Math.round((totalAmount - discountAmount) * 100) / 100,
        minNights: codeData.min_booking_nights,
        usesRemaining: codeData.max_uses ? codeData.max_uses - codeData.current_uses : null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-discount-code function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
