// PM Leads Scan — discovers Booking/Airbnb hosts in Timișoara for Property
// Management outreach. These leads are NEVER published on realtrust.ro —
// they go to `pm_collaboration_leads` for Andrei's outreach pipeline.
//
// Uses Lovable AI Gateway (Gemini 2.5 Flash with google_search grounding)
// to find listings + extract host info in a single call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScanRequest {
  keyword?: string;
  platform?: "booking" | "airbnb" | "both";
  keyword_id?: string;
  max_results?: number;
  triggered_by?: string;
}

const LOVABLE_API = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function discoverViaGemini(query: string, platform: string, maxResults: number) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const platformDomain = platform === "airbnb" ? "airbnb.com" : "booking.com";
  const prompt = `Caută pe ${platformDomain} maxim ${maxResults} anunțuri de cazare în Timișoara, România care se potrivesc cu: "${query}".

Pentru fiecare anunț găsit, returnează JSON strict cu această structură (fără markdown, fără text adițional):

{
  "leads": [
    {
      "source_url": "URL complet către anunț",
      "property_name": "nume proprietate",
      "host_name": "nume gazdă (dacă vizibil)",
      "zone": "zonă Timișoara (ex: Centru, Iosefin, Fabric, Dumbrăvița)",
      "rating": 8.5,
      "reviews_count": 120,
      "price_per_night": 45,
      "currency": "EUR",
      "property_type": "apartament/studio/casă",
      "rooms": 2,
      "capacity": 4,
      "description": "scurtă descriere"
    }
  ]
}

Reguli:
- DOAR proprietari persoane fizice / gazde individuale (NU lanțuri hoteliere, NU hoteluri mari)
- DOAR Timișoara (jud. Timiș) — exclude București/alte orașe
- Dacă nu găsești date sigure pentru un câmp, folosește null
- Răspunsul TREBUIE să fie JSON valid, fără text înainte sau după`;

  const resp = await fetch(LOVABLE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Ești un asistent care găsește anunțuri reale de cazare și returnează doar JSON valid." },
        { role: "user", content: prompt },
      ],
      tools: [{ type: "google_search_retrieval" }],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const j = await resp.json();
  const content = j?.choices?.[0]?.message?.content || "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed?.leads) ? parsed.leads : [];
  } catch {
    return [];
  }
}

function scorePmPotential(lead: any): number {
  let s = 0;
  const rating = Number(lead.rating) || 0;
  const reviews = Number(lead.reviews_count) || 0;
  const price = Number(lead.price_per_night) || 0;
  const premiumZones = ["Centru", "Cetate", "Iosefin", "Fabric"];
  if (rating >= 9) s += 30; else if (rating >= 8) s += 20; else if (rating >= 7) s += 10;
  if (reviews >= 100) s += 25; else if (reviews >= 30) s += 15; else if (reviews >= 5) s += 5;
  if (premiumZones.includes(lead.zone)) s += 25; else if (lead.zone) s += 10;
  if (price >= 60) s += 20; else if (price >= 35) s += 10;
  return Math.min(100, s);
}

function buildPitch(lead: any): string {
  const z = lead.zone || "Timișoara";
  const r = lead.rating ? `${lead.rating}/10` : "rating necunoscut";
  const rev = lead.reviews_count ? `${lead.reviews_count} recenzii` : "fără recenzii";
  return `Salut! Am observat anunțul "${lead.property_name || 'proprietatea ta'}" în ${z} (${r}, ${rev}). ` +
    `La RealTrust gestionăm regim hotelier pentru investitori în Timișoara cu ocupare 75%+ și ROI net ~9.4%. ` +
    `Te-ar interesa să preluăm noi managementul (curățenie, check-in, prețuri dinamice, multi-platform) pe comision?`;
}

// Hard-coded fallback if DB blocklist is empty — local Timișoara PM competitors
// + generic agency/property-manager indicators in EN/RO.
const STATIC_BLOCKLIST = [
  "apartments", "apart hotel", "aparthotel", "rentals", "rent ", "for rent",
  "management", "property management", "agency", "agenție", "agentie",
  "imobiliare", "real estate", "broker", "regim hotelier",
  // Common Timișoara competitors / aggregators
  "timisoara stays", "timisoara apartments", "bookalike", "hotelo",
  "guestready", "airhost", "sweetinn",
];

function normalizeText(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadCompetitorBlocklist(supabase: any): Promise<string[]> {
  const phrases = new Set<string>();
  try {
    const { data: kw } = await supabase
      .from("agency_keywords")
      .select("keyword,type,enabled")
      .eq("enabled", true)
      .in("type", ["hard", "soft"]);
    for (const k of (kw || [])) {
      const v = normalizeText(k.keyword);
      if (v.length >= 3) phrases.add(v);
    }
  } catch (_) { /* ignore */ }
  try {
    const { data: cfg } = await supabase
      .from("listing_import_config")
      .select("pattern,kind,enabled,is_regex")
      .eq("enabled", true)
      .eq("is_regex", false)
      .in("kind", ["forbidden_phrase", "refusal_phrase"]);
    for (const c of (cfg || [])) {
      const v = normalizeText(c.pattern);
      if (v.length >= 3) phrases.add(v);
    }
  } catch (_) { /* ignore */ }
  for (const s of STATIC_BLOCKLIST) phrases.add(normalizeText(s));
  return Array.from(phrases);
}

function matchCompetitor(lead: any, blocklist: string[]): string | null {
  const haystack = normalizeText(
    [lead.host_name, lead.property_name, lead.description, lead.host_profile_url]
      .filter(Boolean)
      .join(" | ")
  );
  if (!haystack) return null;
  for (const phrase of blocklist) {
    if (!phrase) continue;
    // Token-aware match: wrap short phrases in word boundaries to avoid false hits
    if (phrase.length <= 4) {
      const re = new RegExp(`(^|\\W)${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\W|$)`);
      if (re.test(haystack)) return phrase;
    } else if (haystack.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );


  let body: ScanRequest = {};
  try { body = await req.json(); } catch { /* empty */ }
  const keyword = body.keyword?.trim() || "apartament cazare regim hotelier Timișoara";
  const platform = body.platform || "both";
  const maxResults = Math.min(Math.max(body.max_results || 8, 1), 15);

  // Load live filter settings (set in admin → PM Leads → Setări Scanare)
  const { data: settingsRow } = await supabase
    .from("pm_scan_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  const settings = settingsRow || {
    min_rating_airbnb: 4.5,
    min_rating_booking: 8.5,
    price_min: 35,
    price_max: 200,
    priority_zones: [] as string[],
  };
  const zoneAllowList: string[] = Array.isArray(settings.priority_zones) ? settings.priority_zones : [];
  const zoneMatch = (z: string | null | undefined): boolean => {
    if (zoneAllowList.length === 0) return true;
    if (!z) return false;
    const norm = String(z).toLowerCase();
    return zoneAllowList.some((allow) => norm.includes(String(allow).toLowerCase()) || String(allow).toLowerCase().includes(norm));
  };

  const platforms = platform === "both" ? ["booking", "airbnb"] : [platform];
  const allInserted: any[] = [];
  const blocked: any[] = [];
  const errors: string[] = [];
  let skippedByFilter = 0;

  // Load competitor blocklist ONCE per scan (agency_keywords + listing_import_config + static)
  const blocklist = await loadCompetitorBlocklist(supabase);

  for (const p of platforms) {
    try {
      const leads = await discoverViaGemini(keyword, p, maxResults);
      for (const lead of leads) {
        if (!lead?.source_url) continue;

        // Step 1: Competitor / agency block — silent log, NO Gemini pitch
        const hit = matchCompetitor(lead, blocklist);
        if (hit) {
          const blockedRow = {
            platform: p,
            source_url: String(lead.source_url).trim(),
            property_name: lead.property_name || null,
            host_name: lead.host_name || null,
            zone: lead.zone || null,
            rating: lead.rating ? Number(lead.rating) : null,
            reviews_count: lead.reviews_count ? Number(lead.reviews_count) : null,
            price_per_night: lead.price_per_night ? Number(lead.price_per_night) : null,
            currency: lead.currency || "EUR",
            property_type: lead.property_type || null,
            rooms: lead.rooms ? Number(lead.rooms) : null,
            capacity: lead.capacity ? Number(lead.capacity) : null,
            description: lead.description || null,
            pm_potential_score: 0,
            ai_pitch: null,
            discovered_via: body.keyword_id || keyword,
            raw_data: { ...lead, _block_reason: hit },
            status: "competitor_blocked",
            notes: `Auto-blocat: match cuvânt-cheie agenție/competitor "${hit}"`,
          };
          const { data } = await supabase
            .from("pm_collaboration_leads")
            .upsert(blockedRow, { onConflict: "source_url", ignoreDuplicates: false })
            .select("id, source_url")
            .maybeSingle();
          if (data) blocked.push({ ...data, matched: hit });
          continue;
        }

        // Step 2: Apply live filters: rating, price, zone
        const rating = lead.rating != null ? Number(lead.rating) : null;
        const price = lead.price_per_night != null ? Number(lead.price_per_night) : null;
        const minRating = p === "airbnb"
          ? Number(settings.min_rating_airbnb)
          : Number(settings.min_rating_booking);
        if (rating != null && rating < minRating) { skippedByFilter++; continue; }
        if (price != null) {
          if (price < Number(settings.price_min) || price > Number(settings.price_max)) {
            skippedByFilter++; continue;
          }
        }
        if (!zoneMatch(lead.zone)) { skippedByFilter++; continue; }

        const row = {
          platform: p,
          source_url: String(lead.source_url).trim(),
          property_name: lead.property_name || null,
          host_name: lead.host_name || null,
          zone: lead.zone || null,
          rating: lead.rating ? Number(lead.rating) : null,
          reviews_count: lead.reviews_count ? Number(lead.reviews_count) : null,
          price_per_night: lead.price_per_night ? Number(lead.price_per_night) : null,
          currency: lead.currency || "EUR",
          property_type: lead.property_type || null,
          rooms: lead.rooms ? Number(lead.rooms) : null,
          capacity: lead.capacity ? Number(lead.capacity) : null,
          description: lead.description || null,
          pm_potential_score: scorePmPotential(lead),
          ai_pitch: buildPitch(lead),
          discovered_via: body.keyword_id || keyword,
          raw_data: lead,
          status: "new",
        };
        const { data, error } = await supabase
          .from("pm_collaboration_leads")
          .upsert(row, { onConflict: "source_url", ignoreDuplicates: false })
          .select("id, source_url")
          .maybeSingle();
        if (error) {
          errors.push(`${p}/${row.source_url}: ${error.message}`);
        } else if (data) {
          allInserted.push(data);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${p}: ${msg}`);
    }
  }


  return new Response(JSON.stringify({
    success: true,
    inserted: allInserted.length,
    skipped_by_filter: skippedByFilter,
    filters_applied: {
      min_rating_airbnb: settings.min_rating_airbnb,
      min_rating_booking: settings.min_rating_booking,
      price_min: settings.price_min,
      price_max: settings.price_max,
      priority_zones: zoneAllowList,
    },
    leads: allInserted,
    errors,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
