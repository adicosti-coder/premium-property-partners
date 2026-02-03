import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

interface DiscountValidation {
  valid: boolean;
  code?: string;
  codeId?: string;
  description?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  finalAmount?: number;
  minNights?: number;
  usesRemaining?: number | null;
  error?: string;
}

interface UseDiscountCodeReturn {
  isValidating: boolean;
  discount: DiscountValidation | null;
  validateCode: (code: string, nights: number, totalAmount: number) => Promise<DiscountValidation>;
  recordUsage: (params: {
    codeId: string;
    userEmail?: string;
    propertyName?: string;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    nights: number;
  }) => Promise<boolean>;
  clearDiscount: () => void;
}

export function useDiscountCode(): UseDiscountCodeReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [discount, setDiscount] = useState<DiscountValidation | null>(null);

  const validateCode = useCallback(async (
    code: string,
    nights: number,
    totalAmount: number
  ): Promise<DiscountValidation> => {
    if (!code.trim()) {
      const result = { valid: false, error: "Introduceți un cod promoțional" };
      setDiscount(result);
      return result;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-discount-code", {
        body: { code: code.trim().toUpperCase(), nights, totalAmount },
      });

      if (error) {
        console.error("Error validating discount code:", error);
        const result = { valid: false, error: "Eroare la validare" };
        setDiscount(result);
        return result;
      }

      setDiscount(data);
      return data;
    } catch (err) {
      console.error("Error:", err);
      const result = { valid: false, error: "Eroare de conexiune" };
      setDiscount(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const recordUsage = useCallback(async (params: {
    codeId: string;
    userEmail?: string;
    propertyName?: string;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    nights: number;
  }): Promise<boolean> => {
    try {
      // Use edge function for secure server-side insertion
      const { data, error } = await supabase.functions.invoke("record-discount-usage", {
        body: {
          codeId: params.codeId,
          userEmail: params.userEmail,
          propertyName: params.propertyName,
          originalAmount: params.originalAmount,
          discountAmount: params.discountAmount,
          finalAmount: params.finalAmount,
          nights: params.nights,
        },
      });

      if (error) {
        console.error("Error recording discount usage:", error);
        return false;
      }
      
      if (!data?.success) {
        console.error("Failed to record discount usage:", data?.error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Error:", err);
      return false;
    }
  }, []);

  const clearDiscount = useCallback(() => {
    setDiscount(null);
  }, []);

  return {
    isValidating,
    discount,
    validateCode,
    recordUsage,
    clearDiscount,
  };
}
