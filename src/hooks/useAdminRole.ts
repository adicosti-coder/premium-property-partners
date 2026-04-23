import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

export function useAdminRole(user: User | null) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAdminRole = async () => {
      setIsLoading(true);

      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        if (error) {
          console.error("Error checking admin role:", error);
          if (!cancelled) {
            setIsAdmin(false);
          }
        } else {
          if (!cancelled) {
            setIsAdmin(data === true);
          }
        }
      } catch (err) {
        console.error("Error checking admin role:", err);
        if (!cancelled) {
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    checkAdminRole();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { isAdmin, isLoading };
}
