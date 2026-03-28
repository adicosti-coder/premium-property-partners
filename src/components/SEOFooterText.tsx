import { useLanguage } from "@/i18n/LanguageContext";

interface SEOFooterTextProps {
  city?: string;
  neighborhood?: string;
  pageType: "listings" | "catalog";
}

const seoContent = {
  ro: {
    listings: (city: string, neighborhood: string) => `
Piața imobiliară din ${city} continuă să fie una dintre cele mai dinamice din România, oferind oportunități atractive atât pentru investitori experimentați, cât și pentru cei aflați la început de drum. ${city}, desemnată Capitala Culturală Europeană 2023, beneficiază în continuare de un efect pozitiv asupra cererii turistice și a prețurilor proprietăților. Infrastructura modernizată, incluzând tramvaie noi, regenerarea zonei centrale și extinderea aeroportului internațional, contribuie semnificativ la creșterea valorii imobiliare pe termen lung.

${neighborhood ? `Zona ${neighborhood} este una dintre cele mai căutate din ${city}, datorită accesibilității excelente, proximității față de centrele comerciale și universitare, și calității ridicate a construcțiilor noi. Proprietățile din ${neighborhood} oferă un echilibru ideal între confortul urban și randamentul investițional, cu o cerere constantă atât pentru închirieri pe termen lung, cât și pentru regimul hotelier pe termen scurt.` : `Cartierele din ${city} oferă o diversitate remarcabilă de oportunități imobiliare, de la apartamente moderne în complexuri rezidențiale noi până la proprietăți istorice în centrul orașului. Fiecare zonă are un profil unic de cerere și randament, permițând investitorilor să aleagă în funcție de strategia lor specifică.`}

Prețurile din ${city} rămân cu 30-50% mai mici comparativ cu București sau Cluj-Napoca, ceea ce creează un potențial semnificativ de apreciere a capitalului. Randamentul mediu în regim hotelier se situează între 8% și 11% net anual, semnificativ peste media chiriei clasice de 3-4%. Această diferență face din administrarea profesională în regim hotelier o alternativă viabilă și profitabilă.

RealTrust Imobiliare oferă servicii complete de intermediere, consultanță și administrare în ${city}. Cu o experiență de peste 25 de ani pe piața locală, echipa noastră cunoaște în profunzime dinamica fiecărui cartier, tendințele de preț și oportunitățile de investiție. Fie că doriți să cumpărați, să vindeți sau să închiriați o proprietate, vă oferim suport complet: evaluare de piață, negociere, asistență juridică și optimizare fiscală.

Piața de închirieri pe termen scurt din ${city} a înregistrat o creștere consistentă în ultimii ani, alimentată de turismul cultural, medical și de afaceri. Evenimentele internaționale, conferințele IT și festivalurile culturale generează o cerere sezonieră predictibilă, iar platforma noastră de administrare ApArt Hotel asigură maximizarea veniturilor prin pricing dinamic, marketing profesional și gestionarea completă a operațiunilor zilnice.

Investiția imobiliară în ${city} oferă nu doar randament financiar, ci și diversificare a portofoliului și protecție împotriva inflației. Proprietățile bine poziționate, administrate profesional, pot genera venituri pasive stabile și o apreciere a capitalului pe termen mediu și lung. Consultanța noastră personalizată vă ajută să identificați cele mai bune oportunități adaptate profilului dumneavoastră de risc și obiectivelor financiare.
`,
    catalog: (city: string) => `
Catalogul de investiții ${city} 2026 prezintă o selecție curatoriată de proprietăți premium cu randament verificat, disponibile atât pentru achiziție directă, cât și pentru administrare în regim hotelier. Fiecare proprietate din catalog a fost evaluată după criterii riguroase: localizare strategică, calitatea construcției, potențialul de ocupare și randamentul net estimat.

${city}, ca al doilea hub IT din România și fostă Capitală Culturală Europeană, beneficiază de o cerere diversificată și stabilă. Turiștii de afaceri, studenții internaționali, participanții la conferințe și vizitatorii culturali generează o cerere de cazare pe tot parcursul anului, reducând riscul de sezonalitate care afectează alte piețe turistice.

Analiza noastră financiară comparativă demonstrează că proprietățile administrate în regim hotelier profesional generează un randament net de 8-11% anual, comparativ cu 3-4% în cazul chiriei clasice. Această diferență semnificativă se datorează tarifelor pe noapte mai mari, optimizării continue a prețurilor în funcție de cerere și reducerii perioadelor de vacanță între chiriași.

Portofoliul nostru activ include proprietăți în cele mai căutate zone ale orașului ${city}: de la apartamente studio eficiente energetic, ideale pentru investitori cu buget accesibil, până la apartamente cu 2-3 camere în complexuri rezidențiale premium, potrivite pentru familii și grupuri. Fiecare proprietate vine cu o analiză detaliată: capital necesar, venit estimat, cheltuieli operaționale și proiecție ROI pe 5 ani.

Serviciul nostru all-inclusive de administrare elimină complet efortul proprietarului: de la listarea pe platformele de booking și gestionarea rezervărilor, până la curățenie profesională, întreținere și comunicarea cu oaspeții. Transparența totală prin rapoarte lunare detaliate și acces la dashboard-ul proprietarului asigură vizibilitate completă asupra performanței investiției.

Piața imobiliară din ${city} este poziționată pentru o creștere susținută, susținută de investiții majore în infrastructură, dezvoltarea sectorului IT și creșterea turismului. Prețurile actuale, încă accesibile comparativ cu alte capitale europene de dimensiuni similare, oferă o fereastră de oportunitate pentru investitorii care doresc să intre pe piață înainte de maturizarea completă a ciclului de creștere.
`,
  },
  en: {
    listings: (city: string, neighborhood: string) => `
The real estate market in ${city} continues to be one of the most dynamic in Romania, offering attractive opportunities for both experienced investors and newcomers. ${city}, designated European Capital of Culture 2023, continues to benefit from a positive effect on tourist demand and property prices. Modernized infrastructure, including new trams, central area regeneration, and international airport expansion, significantly contributes to long-term real estate value growth.

${neighborhood ? `The ${neighborhood} area is one of the most sought-after in ${city}, thanks to excellent accessibility, proximity to commercial and university centers, and the high quality of new construction. Properties in ${neighborhood} offer an ideal balance between urban comfort and investment returns, with constant demand for both long-term rentals and short-term hospitality.` : `${city}'s neighborhoods offer a remarkable diversity of real estate opportunities, from modern apartments in new residential complexes to historic properties in the city center. Each area has a unique demand and yield profile, allowing investors to choose according to their specific strategy.`}

Prices in ${city} remain 30-50% lower compared to Bucharest or Cluj-Napoca, creating significant capital appreciation potential. Average returns in hotel-style management range between 8% and 11% net annually, significantly above the classic rental average of 3-4%. This difference makes professional hotel-style management a viable and profitable alternative.

RealTrust Real Estate offers complete brokerage, consulting and management services in ${city}. With over 25 years of local market experience, our team deeply understands the dynamics of each neighborhood, price trends and investment opportunities. Whether you want to buy, sell or rent a property, we provide complete support: market evaluation, negotiation, legal assistance and tax optimization.

The short-term rental market in ${city} has recorded consistent growth in recent years, driven by cultural, medical and business tourism. International events, IT conferences and cultural festivals generate predictable seasonal demand, and our ApArt Hotel management platform ensures revenue maximization through dynamic pricing, professional marketing and complete daily operations management.

Real estate investment in ${city} offers not only financial returns, but also portfolio diversification and inflation protection. Well-positioned, professionally managed properties can generate stable passive income and medium to long-term capital appreciation. Our personalized consulting helps you identify the best opportunities adapted to your risk profile and financial objectives.
`,
    catalog: (city: string) => `
The ${city} 2026 Investment Catalog presents a curated selection of premium properties with verified returns, available for both direct purchase and hotel-style management. Each property in the catalog has been evaluated according to rigorous criteria: strategic location, construction quality, occupancy potential and estimated net yield.

${city}, as Romania's second IT hub and former European Capital of Culture, benefits from diversified and stable demand. Business tourists, international students, conference participants and cultural visitors generate accommodation demand throughout the year, reducing the seasonality risk that affects other tourist markets.

Our comparative financial analysis demonstrates that professionally managed hotel-style properties generate a net yield of 8-11% annually, compared to 3-4% for classic rentals. This significant difference is due to higher nightly rates, continuous price optimization based on demand and reduced vacancy periods between tenants.

Our active portfolio includes properties in the most sought-after areas of ${city}: from energy-efficient studio apartments, ideal for budget-conscious investors, to 2-3 bedroom apartments in premium residential complexes, suitable for families and groups. Each property comes with a detailed analysis: required capital, estimated income, operational expenses and 5-year ROI projection.

Our all-inclusive management service completely eliminates owner effort: from listing on booking platforms and reservation management, to professional cleaning, maintenance and guest communication. Total transparency through detailed monthly reports and access to the owner dashboard ensures complete visibility into investment performance.

The ${city} real estate market is positioned for sustained growth, supported by major infrastructure investments, IT sector development and tourism growth. Current prices, still accessible compared to other European capitals of similar size, offer a window of opportunity for investors looking to enter the market before the full maturation of the growth cycle.
`,
  },
};

const SEOFooterText = ({ city = "Timișoara", neighborhood = "", pageType }: SEOFooterTextProps) => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";
  
  const content = pageType === "catalog" 
    ? seoContent[lang].catalog(city)
    : seoContent[lang].listings(city, neighborhood);

  return (
    <section className="py-12 bg-muted/20 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="prose prose-sm dark:prose-invert max-w-4xl mx-auto text-muted-foreground/80">
          {content.trim().split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed mb-4 last:mb-0">
              {paragraph.trim()}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SEOFooterText;
