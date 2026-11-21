import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { needsAttention } from "../../supabase/functions/_shared/waHubRules";

export type HubQueueRow = {
  id: string;
  phone_normalized: string;
  prospect_listing_id: string | null;
  template_name: string;
  status: string;
  attempts: number;
  last_error: string | null;
  source: string | null;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  replied_at: string | null;
};

export type HubSettings = {
  outbound_paused: boolean;
  outbound_pause_reason: string | null;
  outbound_send_start_hour: number;
  outbound_send_end_hour: number;
  outbound_send_days: number[];
};

export type HubAttentionRow = {
  id: string;
  phone_normalized: string;
  status: string | null;
  handoff_reason: string | null;
  wa_profile_name: string | null;
  last_inbound_at: string | null;
  updated_at: string | null;
  prospect_id: string | null;
  last_inbound_text: string | null;
  prospect_title: string | null;
};

const QUEUE_COLS =
  "id, phone_normalized, prospect_listing_id, template_name, status, attempts, last_error, source, scheduled_at, sent_at, created_at, delivered_at, read_at, replied_at";

export const HUB_KEYS = {
  queue: ["wa-hub", "queue"] as const,
  settings: ["wa-hub", "settings"] as const,
  attention: ["wa-hub", "attention"] as const,
  inbound: ["wa-hub", "inbound"] as const,
};

/** Ultimele 30 de zile + tot ce e încă activ (în așteptare, se trimite, eșuat). */
export function useHubQueue() {
  return useQuery({
    queryKey: HUB_KEYS.queue,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("wa_outbound_queue")
        .select(QUEUE_COLS)
        .or(`created_at.gte.${since},status.in.(pending,sending,failed)`)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as HubQueueRow[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useHubSettings() {
  return useQuery({
    queryKey: HUB_KEYS.settings,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_agent_settings")
        .select("outbound_paused, outbound_pause_reason, outbound_send_start_hour, outbound_send_end_hour, outbound_send_days")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as HubSettings | null;
    },
    staleTime: 30_000,
  });
}

export function useHubAttention() {
  return useQuery({
    queryKey: HUB_KEYS.attention,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_conversations")
        .select("id, phone_normalized, status, handoff_reason, wa_profile_name, last_inbound_at, updated_at, prospect_id")
        .or("status.in.(awaiting_human,escalated_to_call),handoff_reason.not.is.null")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const convs = (data ?? []).filter((c) => needsAttention(c));
      const ids = convs.map((c) => c.id);
      const lastText = new Map<string, string>();
      if (ids.length) {
        const { data: msgs } = await supabase
          .from("wa_messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", ids)
          .eq("direction", "inbound")
          .order("created_at", { ascending: false })
          .limit(400);
        for (const m of msgs ?? []) if (!lastText.has(m.conversation_id)) lastText.set(m.conversation_id, m.content ?? "");
      }
      const pids = [...new Set(convs.map((c) => c.prospect_id).filter(Boolean))] as string[];
      const titles = new Map<string, string>();
      if (pids.length) {
        const { data: pls } = await supabase.from("prospect_listings").select("id, title").in("id", pids);
        for (const p of pls ?? []) titles.set(p.id, p.title ?? "");
      }
      return convs.map((c) => ({
        ...c,
        last_inbound_text: lastText.get(c.id) ?? null,
        prospect_title: c.prospect_id ? titles.get(c.prospect_id) ?? null : null,
      })) as HubAttentionRow[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Mesaje primite de la clienți și proprietari (7 / 30 de zile). */
export function useHubInbound() {
  return useQuery({
    queryKey: HUB_KEYS.inbound,
    queryFn: async () => {
      const count = async (days: number) => {
        const { count } = await supabase
          .from("wa_messages")
          .select("id", { count: "exact", head: true })
          .eq("direction", "inbound")
          .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString());
        return count ?? 0;
      };
      const [d7, d30] = await Promise.all([count(7), count(30)]);
      return { d7, d30 };
    },
    staleTime: 5 * 60_000,
  });
}
