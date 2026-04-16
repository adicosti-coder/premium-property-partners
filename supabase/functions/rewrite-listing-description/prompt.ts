export interface PropertyData {
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
  kitchens?: number;
  comfort_level?: string;
  property_subtype?: string;
  height_regime?: string;
  destination?: string;
}

export function buildPrompt(data: PropertyData, listingType: string, tone: string): string {
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
    data.kitchens ? `${data.kitchens} bucătării` : null,
    data.comfort_level ? `confort ${data.comfort_level}` : null,
    data.property_subtype ? `tip imobil: ${data.property_subtype}` : null,
    data.height_regime ? `regim înălțime: ${data.height_regime}` : null,
    data.destination ? `destinație: ${data.destination}` : null,
  ].filter(Boolean).join(", ");

  const featuresList = data.features?.length ? data.features.join(", ") : "N/A";
  const priceInfo = data.price ? `${data.price.toLocaleString()} ${data.currency || "EUR"}` : "preț nedefinit";

  const typeContextMap: Record<string, string> = {
    vanzare: `CONTEXT VÂNZARE:\nEști copywriter imobiliar specializat în vânzări rezidențiale premium. Scopul tău este să convingi un potențial cumpărător să solicite o vizionare.\nACCENT PE: potențialul de investiție, randamentul estimat (ROI), aprecierea valorii pe termen mediu-lung, infrastructura din zonă, calitatea construcției, eficiența energetică, costurile reduse de întreținere, proximitatea față de centre de afaceri, universități, spitale.\nINCLUDE: o secțiune scurtă "💰 Potențial de investiție" care estimează randamentul chiriei (ex: "Cu o chirie lunară estimată de X €/lună, randamentul brut anual ajunge la Y%"). Menționează cum RealTrust poate administra proprietatea pentru maximizarea veniturilor.\nLIMBAJ: profesional, încrezător, orientat spre valoare. Folosește termeni ca: "randament", "apreciere", "cash-flow pozitiv", "activ imobiliar", "eficiență energetică", "amortizare", "lichiditate".`,

    inchiriere: `CONTEXT ÎNCHIRIERE TERMEN LUNG:\nEști copywriter imobiliar specializat în închirieri premium. Scopul tău este să atragi chiriași de calitate.\nACCENT PE: confortul locuirii, dotări premium, siguranța zonei, accesibilitate transport, proximitate magazine/restaurante, raport calitate-preț, flexibilitatea contractului.\nINCLUDE: o secțiune "🏠 De ce să alegi această proprietate?" care evidențiază avantajele vs alternative. Menționează cum RealTrust oferă management profesionist și suport continuu.\nLIMBAJ: cald dar profesional, orientat spre experiența de locuire. Termeni: "standard de locuire", "randament locativ", "finisaje premium", "costuri de operare", "utilități incluse/excluse".\nIMPORTANT: NU include secțiuni despre regim hotelier, randament din short-term rental, Booking/Airbnb, dynamic pricing, self check-in cu smart lock, sau comparații cu închirierea clasică. Această proprietate este pentru ÎNCHIRIERE PE TERMEN LUNG, nu regim hotelier.`,

    cazare: `CONTEXT CAZARE REGIM HOTELIER:\nEști copywriter premium pentru proprietăți short-term rental. Scopul tău este să maximizezi rata de ocupare și valoarea percepută.\nACCENT PE: experiența oaspetelui, locația strategică pentru turism/business, echipamente premium (smart lock, Netflix, WiFi rapid), curățenie profesionistă, self check-in, flexibilitate.\nINCLUDE: o secțiune "✨ Experiența ApArt Hotel" care subliniază standardul hotelier la preț de apartament. Menționează rating-ul 4.9/5 și ocuparea de 98%.\nLIMBAJ: ospitalier, entuziast dar elegant. Termeni: "experiență premium", "concierge digital", "cazare boutique", "raport preț-confort", "destinație urbană".`,

    investitie: `CONTEXT INVESTIȚIE PREMIUM:\nEști analist imobiliar și copywriter specializat în pachete de investiții. Publicul țintă: investitori sofisticați care caută randament.\nACCENT PE: ROI calculat precis, flux de numerar (cash-flow), rate de ocupare istorice, management profesionist RealTrust, diversificarea portofoliului, avantaje fiscale, comparație cu alte clase de active (depozite bancare, acțiuni, obligațiuni).\nINCLUDE: o secțiune "📊 Analiză Financiară" cu metrici: randament brut/net estimat, cash-flow lunar, perioadă de amortizare, aprecierea estimată a capitalului. Menționează Ghidul Investitorului 2026 disponibil pe realtrust.ro.\nLIMBAJ: analitic, bazat pe date, autoritar. Termeni: "yield", "cap rate", "cash-on-cash return", "amortizare", "EBITDA imobiliar", "activ tangibil", "hedging inflaționist".`,
  };

  const toneMap: Record<string, string> = {
    premium: "Ton premium: sofisticat, exclusivist, fiecare cuvânt contează. Structură editorială cu paragrafe scurte și titluri secțiuni cu emoji.",
    persuasiv: "Ton persuasiv: orientat spre acțiune, cu apeluri la acțiune clare, urgență subtilă, beneficii concrete cuantificate.",
    informativ: "Ton informativ: detaliat, factual, structurat cu bullet points, tabele conceptuale, ideal pentru publicul analitic.",
  };

  // Hotel regime and RealTrust collaboration sections only for cazare/investitie/vanzare
  const hotelRegimeInstructions = (listingType === 'cazare' || listingType === 'investitie' || listingType === 'vanzare')
    ? `6. OBLIGATORIU: Include o secțiune dedicată "🏨 Regim Hotelier — Randament Superior" care explică avantajele administrării în regim hotelier vs. închiriere clasică: ocupare optimizată, dynamic pricing, vizibilitate pe Booking/Airbnb, self check-in cu smart lock, curățenie profesionistă după fiecare sejur, rating-uri ridicate. Menționează randamentul net de 9%+ vs 3-4% închiriere clasică.
7. OBLIGATORIU: Include o secțiune "🤝 Avantajele Colaborării cu RealTrust" care detaliază: management complet (fotografii profesionale, guest relations, dynamic pricing), comision transparent 15-25%, raportare lunară detaliată, asigurare 3M EUR, echipă dedicată, 180+ recenzii cu scor 9.4/10, ocupare 98%, proprietarul doar încasează profitul.`
    : `6. NU include secțiuni despre regim hotelier, Booking/Airbnb, dynamic pricing, sau avantajele colaborării cu RealTrust pentru administrare în regim hotelier. Focusul este exclusiv pe închirierea pe termen lung.
7. Menționează doar că RealTrust oferă suport profesionist pentru administrarea închirierii pe termen lung.`;

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
${hotelRegimeInstructions}
8. Ultimul paragraf: call-to-action clar care menționează RealTrust ca partener de încredere.
9. Generează și un TITLU optimizat SEO (max 80 caractere) și o DESCRIERE SCURTĂ (max 200 caractere).

FORMAT RĂSPUNS (obligatoriu):
---TITLU---
[titlu optimizat]
---SCURT---
[descriere scurtă / meta description]
---COMPLET---
[descrierea completă premium, formatată cu markdown]`;
}
