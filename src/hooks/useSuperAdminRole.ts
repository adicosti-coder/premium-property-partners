import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

/**
 * Verifică dacă user-ul are rolul de SuperAdmin (`super_admin` în public.user_roles).
 * Folosit pentru gating-ul acțiunilor distructive (ex: reset contoare phone-fetch).
 *
 * SuperAdmin ⊃ Admin: rolul este distinct și trebuie acordat explicit.
 * Eșecul interogării ⇒ tratat ca "nu e super admin" (fail-closed).
 */
export function useSuperAdminRole(user: User | null) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) {
          setIsSuperAdmin(false);
          setIsLoading(false);
        }
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin" as any)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.warn("[useSuperAdminRole] check failed:", error.message);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(!!data);
        }
      } catch (e) {
        console.warn("[useSuperAdminRole] threw:", e);
        if (!cancelled) setIsSuperAdmin(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { isSuperAdmin, isLoading };
}
