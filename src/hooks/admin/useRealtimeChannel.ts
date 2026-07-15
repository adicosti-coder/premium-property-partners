import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface RealtimeSub {
  event: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  table: string;
  filter?: string;
  handler: (payload: any) => void;
}

/**
 * Creates exactly one Supabase realtime channel with a stable key.
 * - Deduplicates against StrictMode double-mount.
 * - Removes the channel on unmount.
 * - `deps` should include ONLY primitive keys that require a channel recreate.
 */
export function useRealtimeChannel(
  key: string,
  subs: RealtimeSub[],
  deps: ReadonlyArray<unknown> = [],
) {
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Keep the latest handlers in a ref so we don't recreate the channel on every render.
  const subsRef = useRef(subs);
  subsRef.current = subs;

  useEffect(() => {
    // Tear down any prior instance for this key (StrictMode safety).
    const existing = channelRef.current;
    if (existing) {
      supabase.removeChannel(existing);
      channelRef.current = null;
    }

    const channel = supabase.channel(key);
    subsRef.current.forEach((s, i) => {
      channel.on(
        "postgres_changes" as any,
        {
          event: s.event,
          schema: s.schema ?? "public",
          table: s.table,
          ...(s.filter ? { filter: s.filter } : {}),
        },
        (payload) => subsRef.current[i]?.handler(payload),
      );
    });

    channel.subscribe((status) => setConnected(status === "SUBSCRIBED"));
    channelRef.current = channel;

    return () => {
      setConnected(false);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  return { connected };
}
