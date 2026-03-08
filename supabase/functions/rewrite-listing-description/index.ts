import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PropertyData {
  title?: string;
  description_short?: string;
  description_full?: string;
  price?: number;
  currency?: string;
  location?: string;
  size?: number;
  rooms?: number;
  bathrooms?: number;
  floor?: string;
  year_built?: number;
  parking?: string;
  heating_type?: string;
  energy_class?: string;
  furnished?: string;
  construction_type?: string;
  compartimentare?: string;
  features?: string[];
}

function buildPrompt(data: PropertyData, listingType: string, tone: string): string {
  const specs = [
    data.rooms ? `${data.rooms} camere` : null,
    data.bathrooms ? `${data.bathrooms} băi` : null,
    data.size ? `${data.size} m²` : null,
    data.floor ? `etaj ${data.floor}` : null,
    data.year_built ? `construit în ${data.year_built}` : null,
    data.parking || null,
    data.heating_type ? `încălzire: ${data.heating_type}` : null,
    data.energy_class ? `clasă energetică ${data.energy_class}` : null,
    data.furnished || null,
    data.construction_type || null,
    data.compartimentare || null,
  ].filter(Boolean).join(", ");

  const featuresList = data.features?.length ? data.features.join(", ") : "N/A";
  const priceInfo = data.price ? `${data.price.toLocaleString()} ${data.currency || "EUR"}` : "preț nedefinit";

  const typeContextMap: Record<string, string> = {
    vanzare: `CONTEXT VÂNZARE:
Ești copywriter imobiliar specializat în vânzări rezidențiale premium. Scopul tău este să convingi un potențial cumpărător să solicite o vizionare.
ACCENT PE: potențialul de investiție, randamentul estimat (ROI), aprecierea valorii pe termen mediu-lung, infrastructura din zonă, calitatea construcției, eficiența energetică, costurile reduse de întreținere, proximitatea față de centre de afaceri, universități, spitale.
INCLUDE: o secțiune scurtă "💰 Potențial de investiție" care estimează randamentul chiriei (ex: "Cu o chirie lunară estimată de X €/lună, randamentul brut anual ajunge la Y%"). Menționează cum RealTrust poate administra proprietatea pentru maximizarea veniturilor.
LIMBAJ: profesional, încrezător, orientat spre valoare. Folosește termeni ca: "randament", "apreciere", "cash-flow pozitiv", "activ imobiliar", "eficiență energetică", "amortizare", "lichiditate".`,

    inchiriere: `CONTEXT ÎNCHIRIERE TERMEN LUNG:
Ești copywriter imobiliar specializat în închirieri premium. Scopul tău este să atragi chiriași de calitate.
ACCENT PE: confortul locuirii, dotări premium, siguranța zonei, accesibilitate transport, proximitate magazine/restaurante, raport calitate-preț, flexibilitatea contractului.
INCLUDE: o secțiune "🏠 De ce să alegi această proprietate?" care evidențiază avantajele vs alternative. Menționează cum RealTrust oferă management profesionist și suport continuu.
LIMBAJ: cald dar profesional, orientat spre experiența de locuire. Termeni: "standard de locuire", "randament locativ", "finisaje premium", "costuri de operare", "utilități incluse/excluse".`,

    cazare: `CONTEXT CAZARE REGIM HOTELIER:
Ești copywriter premium pentru proprietăți short-term rental. Scopul tău este să maximizezi rata de ocupare și valoarea percepută.
ACCENT PE: experiența oaspetelui, locația strategică pentru turism/business, echipamente premium (smart lock, Netflix, WiFi rapid), curățenie profesionistă, self check-in, flexibilitate.
INCLUDE: o secțiune "✨ Experiența ApArt Hotel" care subliniază standardul hotelier la preț de apartament. Menționează rating-ul 4.9/5 și ocuparea de 98%.
LIMBAJ: ospitalier, entuziast dar elegant. Termeni: "experiență premium", "concierge digital", "cazare boutique", "raport preț-confort", "destinație urbană".`,

    investitie: `CONTEXT INVESTIȚIE PREMIUM:
Ești analist imobiliar și copywriter specializat în pachete de investiții. Publicul țintă: investitori sofisticați care caută randament.
ACCENT PE: ROI calculat precis, flux de numerar (cash-flow), rate de ocupare istorice, management profesionist RealTrust, diversificarea portofoliului, avantaje fiscale, comparație cu alte clase de active (depozite bancare, acțiuni, obligațiuni).
INCLUDE: o secțiune "📊 Analiză Financiară" cu metrici: randament brut/net estimat, cash-flow lunar, perioadă de amortizare, aprecierea estimată a capitalului. Menționează Ghidul Investitorului 2026 disponibil pe realtrust.ro.
LIMBAJ: analitic, bazat pe date, autoritar. Termeni: "yield", "cap rate", "cash-on-cash return", "amortizare", "EBITDA imobiliar", "activ tangibil", "hedging inflaționist".`,
  };

  const toneMap: Record<string, string> = {
    premium: "Ton premium: sofisticat, exclusivist, fiecare cuvânt contează. Structură editorială cu paragrafe scurte și titluri secțiuni cu emoji.",
    persuasiv: "Ton persuasiv: orientat spre acțiune, cu apeluri la acțiune clare, urgență subtilă, beneficii concrete cuantificate.",
    informativ: "Ton informativ: detaliat, factual, structurat cu bullet points, tabele conceptuale, ideal pentru publicul analitic.",
  };

  return `${typeContextMap[listingType] || typeContextMap.vanzare}

TONUL: ${toneMap[tone] || toneMap.premium}

PROPRIETATE:
- Titlu original: "${data.title || "N/A"}"
- Locație: ${data.location || "N/A"}
- Preț: ${priceInfo}
- Specificații: ${specs || "N/A"}
- Facilități: ${featuresList}
- Descriere originală: "${data.description_full || data.description_short || "N/A"}"

INSTRUCȚIUNI DE SCRIERE:
1. Rescrie complet descrierea — NU copia textul original, ci reformulează totul cu limbaj premium de specialitate imobiliară.
2. Structurează cu secțiuni clare (emoji + titlu bold), paragrafe scurte (max 3 rânduri).
3. Folosește ortografie și gramatică impecabilă în limba română, cu diacritice corecte (ă, â, î, ș, ț).
4. Include termeni economici și imobiliari de specialitate, potriviți contextului.
5. Evidențiază USP-uri (Unique Selling Points) — ce face proprietatea specială.
6. Ultimul paragraf: call-to-action clar care menționează RealTrust ca partener de încredere.
7. Generează și un TITLU optimizat SEO (max 80 caractere) și o DESCRIERE SCURTĂ (max 200 caractere).

FORMAT RĂSPUNS (obligatoriu):
---TITLU---
[titlu optimizat]
---SCURT---
[descriere scurtă / meta description]
---COMPLET---
[descrierea completă premium, formatată cu markdown]`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyData, listingType = "vanzare", tone = "premium" } = await req.json();

    if (!propertyData) {
      return new Response(
        JSON.stringify({ success: false, error: "propertyData is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = buildPrompt(propertyData, listingType, tone);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Ești cel mai bun copywriter imobiliar din România, cu experiență de 15 ani în marketing premium. Scrii exclusiv în limba română cu diacritice corecte, folosind limbaj de specialitate economic și imobiliar. Fiecare text pe care îl produci este impecabil gramatical, persuasiv și orientat spre conversie.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.75,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limită de cereri depășită. Reîncearcă în câteva secunde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Credit insuficient pentru AI. Adaugă fonduri în workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: "Eroare la generarea textului" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const fullText = aiData.choices?.[0]?.message?.content || "";

    // Parse structured response
    let rewrittenTitle = "";
    let rewrittenShort = "";
    let rewrittenFull = "";

    const titleMatch = fullText.match(/---TITLU---\s*([\s\S]*?)(?=---SCURT---|$)/);
    const shortMatch = fullText.match(/---SCURT---\s*([\s\S]*?)(?=---COMPLET---|$)/);
    const fullMatch = fullText.match(/---COMPLET---\s*([\s\S]*?)$/);

    rewrittenTitle = titleMatch?.[1]?.trim() || "";
    rewrittenShort = shortMatch?.[1]?.trim() || "";
    rewrittenFull = fullMatch?.[1]?.trim() || fullText;

    return new Response(
      JSON.stringify({
        success: true,
        rewritten: {
          title: rewrittenTitle,
          description_short: rewrittenShort,
          description_full: rewrittenFull,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Rewrite error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
