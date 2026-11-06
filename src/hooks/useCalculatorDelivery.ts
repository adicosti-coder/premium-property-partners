import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isConfirmedDelivery } from "../../supabase/functions/_shared/calculatorNotificationPolicy";

export function useCalculatorDelivery(receipt: { leadId: string; reportToken?: string } | null) {
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    setConfirmed(false);
    if (!receipt?.reportToken) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const check = async () => {
      const { data } = await supabase.functions.invoke("calculator-notifications", { body: { action: "status", lead_id: receipt.leadId, report_token: receipt.reportToken } }).catch(() => ({ data: null }));
      if (cancelled) return;
      if (isConfirmedDelivery(data?.wa_admin_status)) { setConfirmed(true); return; }
      if (++attempts < 40) timer = setTimeout(check, 3000);
    };
    void check();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [receipt]);
  return confirmed;
}