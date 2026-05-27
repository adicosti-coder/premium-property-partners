// simulate-prospect-routing — Mod Simulare for the Keyword Radar admin UI.
// Takes a hypothetical listing (title + description + originating query +
// optional price/category override) and returns EXACTLY the same routing
// decision the production pipeline would take:
//   • category detection (vanzare / inchiriere / hotelier)
//   • whether auto-publish-listings would publish it on realtrust.ro
//   • whether it would be routed to Andrei's call queue
//   • the tags + admin_notes that would be written
//
// READ-ONLY: never inserts/updates anything. Pure dry-run.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Category = "vanzare" | "inchiriere" | "hotelier";

interface RoutingDecision {
  category: Category;
  detection_signals: string[];
  route: "site_realtrust" | "andrei_call_queue";
  blocked_from_publish: boolean;
  block_reason: string | null;
  computed_tags: string[];
  admin_notes: string;
  recruitment_pitch: string | null;
  monthly_extra_est: number | null;
  extra_profit_3y_est: number | null;
}

function detect(title: string, description: string, query: string, categoryOverride?: string): {
  category: Category;
  signals: string[];
} {
  if (categoryOverride && ["vanzare", "inchiriere", "hotelier"].includes(categoryOverride)) {
    return { category: categoryOverride as Category, signals: [`override manual → ${categoryOverride}`] };
  }
  const blob = `${title} ${description} ${query}`.toLowerCase();
  const signals: string[] = [];

  const hotelierRe = /(regim\s*hotelier|short[-\s]?term|nightly|pe\s*noapte|airbnb|booking\.com|cazare\s*timi[șs]oara)/i;
  const rentalRe = /(inchiriere|închiriere|chirie|de\s*inchiriat|de\s*închiriat|\/lun[ăa])/i;

  const hotelierMatch = blob.match(hotelierRe);
  if (hotelierMatch) {
    signals.push(`semnal hotelier: "${hotelierMatch[0]}"`);
    return { category: "hotelier", signals };
  }
  const rentalMatch = blob.match(rentalRe);
  if (rentalMatch) {
    signals.push(`semnal închiriere: "${rentalMatch[0]}"`);
    return { category: "inchiriere", signals };
  }
  signals.push("nicio cheie de închiriere/regim hotelier detectată → implicit vânzare");
  return { category: "vanzare", signals };
}

function routeDecision(
  cat: Category,
  signals: string[],
  price: number | null,
  size: number | null,
): RoutingDecision {
  const isRental = cat === "inchiriere" || cat === "hotelier";

  let monthlyExtra: number | null = null;
  let extraProfit3Y: number | null = null;
  if (isRental && price) {
    monthlyExtra = Math.round(price * 0.7);
    extraProfit3Y = monthlyExtra * 36;
  } else if (cat === "vanzare" && price && size) {
    const estRent = Math.round(price * 0.004);
    monthlyExtra = Math.round(estRent * 0.7);
    extraProfit3Y = monthlyExtra * 36;
  }

  if (cat === "vanzare") {
    return {
      category: cat,
      detection_signals: signals,
      route: "site_realtrust",
      blocked_from_publish: false,
      block_reason: null,
      computed_tags: ["scrape-prospects", "auto-import", "filtru-proprietari"],
      admin_notes: "Import automat: rezultat din query filtrat pe proprietari/persoane fizice; eligibil pentru publicare pe realtrust.ro.",
      recruitment_pitch: null,
      monthly_extra_est: monthlyExtra,
      extra_profit_3y_est: extraProfit3Y,
    };
  }

  const subTag = cat === "hotelier" ? "regim-hotelier" : "inchiriere-proprietar";
  const pitch = cat === "hotelier"
    ? "Andrei sună proprietarul și propune preluarea în administrare totală regim hotelier (RealTrust gestionează cazarea, prețurile dinamice, curățenia, raportarea fiscală)."
    : "Andrei sună proprietarul și propune administrare totală sau parțială pentru închiriere clasică sau conversie la regim hotelier (ROI net 9.4%).";

  return {
    category: cat,
    detection_signals: signals,
    route: "andrei_call_queue",
    blocked_from_publish: true,
    block_reason: `Categorie "${cat}" — politică strictă: nu se publică pe realtrust.ro proprietățile de închiriere / regim hotelier preluate de la proprietari (lead de recrutare exclusiv).`,
    computed_tags: [
      "scrape-prospects",
      "recrutare-management",
      subTag,
      "andrei-call-queue",
      "blocked-from-publish",
    ],
    admin_notes: `[simulare] BLOCAT publicare: categorie "${cat}" — lead recrutare exclusiv pentru Andrei (${pitch}).`,
    recruitment_pitch: pitch,
    monthly_extra_est: monthlyExtra,
    extra_profit_3y_est: extraProfit3Y,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Admin auth
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Auth required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: u } = await userClient.auth.getUser(token);
    if (!u?.user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleRow } = await svc.from("user_roles").select("role")
      .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ success: false, error: "Admin required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const samples: Array<{
      label?: string;
      title?: string;
      description?: string;
      query?: string;
      price?: number | null;
      size?: number | null;
      category_override?: string;
    }> = Array.isArray(body?.samples) ? body.samples : [body];

    const results = samples.map((s, idx) => {
      const title = String(s.title || "").slice(0, 500);
      const description = String(s.description || "").slice(0, 4000);
      const query = String(s.query || "").slice(0, 500);
      const price = typeof s.price === "number" ? s.price : null;
      const size = typeof s.size === "number" ? s.size : null;
      const { category, signals } = detect(title, description, query, s.category_override);
      const decision = routeDecision(category, signals, price, size);
      return {
        index: idx,
        label: s.label || `Sample #${idx + 1}`,
        input: { title, description, query, price, size, category_override: s.category_override ?? null },
        decision,
      };
    });

    const summary = {
      total: results.length,
      to_site: results.filter((r) => r.decision.route === "site_realtrust").length,
      to_andrei: results.filter((r) => r.decision.route === "andrei_call_queue").length,
    };

    return new Response(JSON.stringify({ success: true, mode: "simulation", summary, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
