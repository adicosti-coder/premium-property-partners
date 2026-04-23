import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

/**
 * Verifică dacă user-ul are rol admin.
 *
 * Strategie robustă:
 * 1. Întâi încercăm SELECT direct pe public.user_roles (RLS permite user-ului
 *    să-și vadă propriile roluri prin clauza `auth.uid() = user_id`).
 * 2. Dacă SELECT-ul eșuează, fallback pe RPC has_role().
 * 3. Retry automat o dată dacă primul răspuns e neconcludent.
 * 4. Expune `recheck()` pentru retry manual din UI.
 */
export function useAdminRole(user: User | null) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (uid: string): Promise<boolean | null> => {
    // 1) SELECT direct (cel mai fiabil — fără RPC)
    try {
      const { data, error: selErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (!selErr) {
        return !!data;
      }
      console.warn("[useAdminRole] SELECT user_roles failed:", selErr.message);
    } catch (e) {
      console.warn("[useAdminRole] SELECT user_roles threw:", e);
    }

    // 2) Fallback RPC
    try {
      const { data, error: rpcErr } = await supabase.rpc("has_role", {
        _user_id: uid,
        _role: "admin",
      });
      if (rpcErr) {
        console.error("[useAdminRole] RPC has_role failed:", rpcErr.message);
        return null; // neconcludent
      }
      return data === true;
    } catch (e) {
      console.error("[useAdminRole] RPC has_role threw:", e);
      return null;
    }
  }, []);

  const run = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);

    let result = await check(user.id);
    if (result === null) {
      // retry o dată după 600ms
      await new Promise((r) => setTimeout(r, 600));
      result = await check(user.id);
    }

    if (result === null) {
      setError("Verificare admin eșuată — verifică conexiunea.");
      setIsAdmin(false);
    } else {
      setIsAdmin(result);
    }
    setIsLoading(false);
  }, [user, check]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await run();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { isAdmin, isLoading, error, recheck: run };
}
