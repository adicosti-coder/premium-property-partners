import { supabase } from "@/lib/supabaseClient";

/** Înregistrează clicuri din listele de anunțuri (fire-and-forget, fără date personale). */
export const trackListingClick = (
  ctaType: "listing_cazare_click" | "listing_details_click" | "listing_contact_click" | "cazare_page_view" | "listing_view",
  property?: { id: number | string; name: string },
) => {
  try {
    let sid = sessionStorage.getItem("rt_sid");
    if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem("rt_sid", sid); }
    void supabase.from("cta_analytics").insert({
      cta_type: ctaType,
      page_path: window.location.pathname,
      property_id: property ? String(property.id) : null,
      property_name: property?.name ?? null,
      session_id: sid,
    });
  } catch { /* ignore */ }
};
