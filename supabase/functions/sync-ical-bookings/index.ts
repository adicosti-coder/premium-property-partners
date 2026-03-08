import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Parse an iCal (.ics) string and extract VEVENT blocks.
 * Returns an array of { uid, summary, dtstart, dtend, description }.
 */
function parseIcal(icsText: string) {
  const events: {
    uid: string;
    summary: string;
    dtstart: string;
    dtend: string;
    description: string;
  }[] = [];

  // Split into VEVENT blocks
  const blocks = icsText.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];

    const getValue = (key: string): string => {
      // Handle folded lines (lines starting with space/tab are continuations)
      const unfoldedBlock = block.replace(/\r?\n[ \t]/g, "");
      const regex = new RegExp(`^${key}[;:](.*)$`, "m");
      const match = unfoldedBlock.match(regex);
      if (!match) return "";
      // For properties with parameters like DTSTART;VALUE=DATE:20260101
      const val = match[1];
      const colonIdx = val.indexOf(":");
      // If the regex captured after the first colon already, just return
      // But if there are parameters (;), the value is after the last colon
      if (key === "DTSTART" || key === "DTEND") {
        // Could be DTSTART;VALUE=DATE:20260308 or DTSTART:20260308T150000Z
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

/**
 * Convert iCal date string to ISO date (YYYY-MM-DD).
 * Handles: 20260308, 20260308T150000, 20260308T150000Z
 */
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

    // Optional: sync only a specific source
    let sourceFilter: string | null = null;
    try {
      const body = await req.json();
      sourceFilter = body?.source_id || null;
    } catch {
      // No body — sync all
    }

    // Fetch active iCal sources
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

        // We need the property's integer ID for the bookings table
        // The bookings table uses property_id as integer, but properties uses uuid
        // We need to find the mapping
        const { data: prop } = await supabase
          .from("properties")
          .select("id, name, property_code")
          .eq("id", source.property_id)
          .single();

        if (!prop) {
          throw new Error(`Property ${source.property_id} not found`);
        }

        // Get existing bookings for this source to detect updates
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

          // Extract guest name from SUMMARY (PynBooking usually puts guest name there)
          const guestName = event.summary || "iCal Guest";

          const existing = existingMap.get(event.uid);

          if (existing) {
            // Check if dates changed → update
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
            // New booking — insert
            // property_id in bookings is integer type, we need a numeric identifier
            // Use a hash or the display_order. For now, use a deterministic number from UUID
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

        results.push({
          source_id: source.id,
          label: source.label || source.pynbooking_room || "unknown",
          events: events.length,
          new: newCount,
          updated: updatedCount,
        });
      } catch (err: any) {
        console.error(`Error syncing source ${source.id}:`, err.message);

        // Update source with error
        await supabase
          .from("ical_sources")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_error: err.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", source.id);

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
