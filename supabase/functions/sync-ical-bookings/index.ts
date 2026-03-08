import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseIcal(icsText: string) {
  const events: {
    uid: string;
    summary: string;
    dtstart: string;
    dtend: string;
    description: string;
  }[] = [];

  const blocks = icsText.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];

    const getValue = (key: string): string => {
      const unfoldedBlock = block.replace(/\r?\n[ \t]/g, "");
      const regex = new RegExp(`^${key}[;:](.*)$`, "m");
      const match = unfoldedBlock.match(regex);
      if (!match) return "";
      const val = match[1];
      if (key === "DTSTART" || key === "DTEND") {
        return val.includes(":") ? val.split(":").pop()! : val;
      }
      return val.trim();
    };

    const uid = getValue("UID");
    const summary = getValue("SUMMARY")
      .replace(/\\n/g, " ")
      .replace(/\\,/g, ",")
      .trim();
    const dtstart = getValue("DTSTART");
    const dtend = getValue("DTEND");
    const description = getValue("DESCRIPTION")
      .replace(/\\n/g, "\n")
      .replace(/\\,/g, ",")
      .trim();

    if (uid && dtstart) {
      events.push({ uid, summary, dtstart, dtend, description });
    }
  }
  return events;
}

function icalDateToISO(dateStr: string): string {
  if (!dateStr || dateStr.length < 8) return "";
  const y = dateStr.substring(0, 4);
  const m = dateStr.substring(4, 6);
  const d = dateStr.substring(6, 8);
  return `${y}-${m}-${d}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let sourceFilter: string | null = null;
    let syncType = "auto";
    try {
      const body = await req.json();
      sourceFilter = body?.source_id || null;
      syncType = body?.sync_type || "manual";
    } catch {
      // No body — sync all (cron)
    }

    let query = supabase
      .from("ical_sources")
      .select("id, property_id, ical_url, label, pynbooking_room")
      .eq("is_active", true);

    if (sourceFilter) {
      query = query.eq("id", sourceFilter);
    }

    const { data: sources, error: srcErr } = await query;
    if (srcErr) throw srcErr;

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active iCal sources", synced: 0 }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: { source_id: string; label: string; events: number; new: number; updated: number; error?: string }[] = [];

    for (const source of sources) {
      const startTime = Date.now();
      try {
        console.log(`Fetching iCal: ${source.ical_url}`);
        const res = await fetch(source.ical_url, {
          headers: { "User-Agent": "RealTrust-iCal-Sync/1.0" },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const icsText = await res.text();
        const events = parseIcal(icsText);

        let newCount = 0;
        let updatedCount = 0;

        const { data: prop } = await supabase
          .from("properties")
          .select("id, name, property_code")
          .eq("id", source.property_id)
          .single();

        if (!prop) {
          throw new Error(`Property ${source.property_id} not found`);
        }

        const { data: existingBookings } = await supabase
          .from("bookings")
          .select("id, ical_event_uid, check_in, check_out, guest_name")
          .eq("ical_source_id", source.id);

        const existingMap = new Map(
          (existingBookings || []).map((b) => [b.ical_event_uid, b])
        );

        for (const event of events) {
          const checkIn = icalDateToISO(event.dtstart);
          const checkOut = icalDateToISO(event.dtend);

          if (!checkIn) continue;

          const guestName = event.summary || "iCal Guest";
          const existing = existingMap.get(event.uid);

          if (existing) {
            if (existing.check_in !== checkIn || existing.check_out !== (checkOut || checkIn) || existing.guest_name !== guestName) {
              const { error: updErr } = await supabase
                .from("bookings")
                .update({
                  check_in: checkIn,
                  check_out: checkOut || checkIn,
                  guest_name: guestName,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);

              if (!updErr) updatedCount++;
            }
            existingMap.delete(event.uid);
          } else {
            const propertyIdNum = parseInt(prop.id.replace(/-/g, "").substring(0, 8), 16) % 1000000;

            const { error: insErr } = await supabase.from("bookings").insert({
              property_id: propertyIdNum,
              check_in: checkIn,
              check_out: checkOut || checkIn,
              guest_name: guestName,
              status: "confirmed",
              source: "pynbooking",
              ical_event_uid: event.uid,
              ical_source_id: source.id,
            });

            if (!insErr) newCount++;
            else console.error("Insert error:", insErr.message);
          }
        }

        // Update source metadata
        await supabase
          .from("ical_sources")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_error: null,
            events_count: events.length,
            updated_at: new Date().toISOString(),
          })
          .eq("id", source.id);

        // Log sync result
        await supabase.from("ical_sync_logs").insert({
          source_id: source.id,
          property_id: source.property_id,
          events_found: events.length,
          new_bookings: newCount,
          updated_bookings: updatedCount,
          deleted_bookings: 0,
          sync_type: syncType,
          duration_ms: Date.now() - startTime,
        });

        // Notify owners about new bookings
        if (newCount > 0) {
          const { data: owners } = await supabase
            .from("owner_properties")
            .select("user_id")
            .eq("property_id", source.property_id);

          if (owners && owners.length > 0) {
            const notifications = owners.map((o) => ({
              user_id: o.user_id,
              title: `📅 ${newCount} rezervări noi sincronizate`,
              message: `Au fost importate ${newCount} rezervări noi din PynBooking pentru ${prop.name}${updatedCount > 0 ? ` și actualizate ${updatedCount} existente` : ""}.`,
              type: "success",
              action_url: "/portal-proprietar",
              action_label: "Vezi Calendar",
            }));

            await supabase.from("user_notifications").insert(notifications);
          }
        }

        results.push({
          source_id: source.id,
          label: source.label || source.pynbooking_room || "unknown",
          events: events.length,
          new: newCount,
          updated: updatedCount,
        });
      } catch (err: any) {
        console.error(`Error syncing source ${source.id}:`, err.message);

        await supabase
          .from("ical_sources")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_error: err.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", source.id);

        // Log error
        await supabase.from("ical_sync_logs").insert({
          source_id: source.id,
          property_id: source.property_id,
          events_found: 0,
          new_bookings: 0,
          updated_bookings: 0,
          deleted_bookings: 0,
          error_message: err.message,
          sync_type: syncType,
          duration_ms: Date.now() - startTime,
        });

        results.push({
          source_id: source.id,
          label: source.label || source.pynbooking_room || "unknown",
          events: 0,
          new: 0,
          updated: 0,
          error: err.message,
        });
      }
    }

    const totalNew = results.reduce((s, r) => s + r.new, 0);
    const totalUpdated = results.reduce((s, r) => s + r.updated, 0);

    console.log(`iCal sync complete: ${totalNew} new, ${totalUpdated} updated across ${results.length} sources`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: results.length,
        totalNew,
        totalUpdated,
        results,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("iCal sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
