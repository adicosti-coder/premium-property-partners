import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import {
  applyStaleness, offlineSnapshot, overallStatus,
  type HealthStatus, type ServiceHealth,
} from "../../supabase/functions/_shared/connectionHealthRules";

export interface ConnectionHealthData {
  overall: HealthStatus;
  services: ServiceHealth[];
  /** True when the backend itself could not be reached. */
  offline: boolean;
}

const KEY = ["admin-connection-health"] as const;

async function fetchHealth(force: boolean): Promise<ConnectionHealthData> {
  try {
    const { data, error } = await supabase.functions.invoke("connection-health", { body: { force } });
    if (error) {
      // A non-2xx from the function means it ran: report it, but only a
      // transport failure means the backend itself is down.
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.status === "number" && ctx.status > 0 && ctx.status < 500 && ctx.status !== 402) {
        throw new Error(`HTTP ${ctx.status}`);
      }
      const services = offlineSnapshot(`${error.message}${ctx?.status ? ` (HTTP ${ctx.status})` : ""}`);
      return { overall: overallStatus(services), services, offline: true };
    }
    const services = applyStaleness((data?.services ?? []) as ServiceHealth[]);
    return { overall: overallStatus(services), services, offline: false };
  } catch (e) {
    if (e instanceof Error && /^HTTP \d+/.test(e.message)) throw e;
    const services = offlineSnapshot(e instanceof Error ? e.message : String(e));
    return { overall: overallStatus(services), services, offline: true };
  }
}

/** Shared by the status-bar pill and the „Astăzi” card (one request, one cache). */
export function useConnectionHealth() {
  const qc = useQueryClient();
  const [rechecking, setRechecking] = useState(false);
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => fetchHealth(false),
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
    refetchOnWindowFocus: true,
    retry: 0,
  });
  const recheck = useCallback(async () => {
    setRechecking(true);
    try {
      qc.setQueryData(KEY, await fetchHealth(true));
    } finally {
      setRechecking(false);
    }
  }, [qc]);
  return { ...query, recheck, rechecking };
}
