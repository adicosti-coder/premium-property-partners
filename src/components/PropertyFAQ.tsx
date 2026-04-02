import { useLanguage } from "@/i18n/LanguageContext";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface PropertyFAQProps {
  propertyName: string;
  location: string;
  capacity?: number;
  bedrooms?: number;
  pricePerNight?: number;
  isInvestment?: boolean;
  listingType?: string | null;
  amenities?: string[];
  houseRules?: string[];
}

const PropertyFAQ = ({
  propertyName,
  location,
  capacity,
  bedrooms,
  pricePerNight,
  isInvestment,
  listingType,
  amenities = [],
  houseRules = [],
}: PropertyFAQProps) => {
  const { language } = useLanguage();

  const isLocationUrl = location?.startsWith("http");
  const isClassicRental = listingType === "inchiriere";

  const locationAnswer = (lang: "ro" | "en") => {
    if (isLocationUrl) {
      return lang === "ro"
        ? { before: `${propertyName} este situat în: Timișoara, `, linkText: "vezi pe hartă", after: ", într-o zonă cu acces facil la transport public, restaurante și atracții turistice.", url: location }
        : { before: `${propertyName} is located in: Timișoara, `, linkText: "view on map", after: ", in an area with easy access to public transport, restaurants, and tourist attractions.", url: location };
    }
    return null;
  };

  // Dynamic amenity-based FAQ items
  const getAmenityFAQs = () => {
    const items: { q: string; a: string }[] = [];
    const amenityStr = amenities.join(" ").toLowerCase();
    const rulesStr = houseRules.join(" ").toLowerCase();

    if (language === "ro") {
      if (amenityStr.includes("parcare") || amenityStr.includes("parking")) {
        items.push({ q: `Există loc de parcare?`, a: `Da, ${propertyName} dispune de loc de parcare. Verificați disponibilitatea la momentul rezervării deoarece locurile pot fi limitate.` });
      }
      if (amenityStr.includes("netflix") || amenityStr.includes("smart tv")) {
        items.push({ q: `Există Netflix sau Smart TV?`, a: `Da, apartamentul este echipat cu Smart TV cu acces la Netflix și alte platforme de streaming. WiFi-ul de mare viteză este inclus.` });
      }
      if (amenityStr.includes("mașină de spălat") || amenityStr.includes("washing")) {
        items.push({ q: `Pot spăla haine în apartament?`, a: `Da, apartamentul dispune de mașină de spălat și uscător/suport de uscat. Detergent și balsam sunt furnizate gratuit.` });
      }
      if (amenityStr.includes("balcon") || amenityStr.includes("terasa") || amenityStr.includes("balcony")) {
        items.push({ q: `Apartamentul are balcon sau terasă?`, a: `Da, ${propertyName} dispune de balcon/terasă unde puteți savura cafeaua de dimineață cu priveliște.` });
      }
      if (rulesStr.includes("fumat") || rulesStr.includes("smoking")) {
        items.push({ q: `Se poate fuma în apartament?`, a: `Fumatul este interzis în interiorul apartamentului. Există spații desemnate pentru fumat în exteriorul clădirii.` });
      }
      if (rulesStr.includes("animal") || rulesStr.includes("pet")) {
        items.push({ q: `Sunt acceptate animalele de companie?`, a: `Acceptarea animalelor se discută de la caz la caz. Contactați-ne înainte de rezervare pentru a verifica disponibilitatea.` });
      }
    } else {
      if (amenityStr.includes("parcare") || amenityStr.includes("parking")) {
        items.push({ q: `Is parking available?`, a: `Yes, ${propertyName} has parking available. Check availability at the time of booking as spaces may be limited.` });
      }
      if (amenityStr.includes("netflix") || amenityStr.includes("smart tv")) {
        items.push({ q: `Is Netflix or Smart TV available?`, a: `Yes, the apartment is equipped with Smart TV with access to Netflix and other streaming platforms. High-speed WiFi is included.` });
      }
      if (amenityStr.includes("washing") || amenityStr.includes("mașină de spălat")) {
        items.push({ q: `Can I do laundry?`, a: `Yes, the apartment has a washing machine and dryer/drying rack. Detergent and fabric softener are provided free of charge.` });
      }
      if (amenityStr.includes("balcon") || amenityStr.includes("terasa") || amenityStr.includes("balcony")) {
        items.push({ q: `Does the apartment have a balcony?`, a: `Yes, ${propertyName} has a balcony/terrace where you can enjoy your morning coffee with a view.` });
      }
      if (rulesStr.includes("smoking") || rulesStr.includes("fumat")) {
        items.push({ q: `Is smoking allowed?`, a: `Smoking is not allowed inside the apartment. There are designated smoking areas outside the building.` });
      }
      if (rulesStr.includes("pet") || rulesStr.includes("animal")) {
        items.push({ q: `Are pets allowed?`, a: `Pet acceptance is discussed on a case-by-case basis. Contact us before booking to check availability.` });
      }
    }

    return items;
  };

  const isSale = listingType === "vanzare";
  const isInvestmentType = listingType === "investitie";

  const getBaseFaqItems = () => {
    const locationItem = {
      q: language === "ro" ? `Unde este situat ${propertyName}?` : `Where is ${propertyName} located?`,
      a: isLocationUrl ? null : (language === "ro"
        ? `${propertyName} este situat în ${location}, Timișoara, într-o zonă cu acces facil la transport public, restaurante și atracții turistice.`
        : `${propertyName} is located in ${location}, Timișoara, in an area with easy access to public transport, restaurants, and tourist attractions.`),
      richAnswer: locationAnswer(language === "ro" ? "ro" : "en"),
    };

    if (isSale) {
      return language === "ro" ? [
        locationItem,
        { q: `Care este prețul de vânzare?`, a: pricePerNight ? `Prețul solicitat este de €${pricePerNight.toLocaleString('ro-RO')}. Contactați-ne pentru detalii despre negociere și modalități de plată.` : `Contactați-ne pentru a afla prețul actual și condițiile de vânzare.` },
        { q: `Ce acte sunt necesare pentru achiziție?`, a: `Pentru cumpărarea unui apartament aveți nevoie de: act de identitate, certificat fiscal, extras de carte funciară actualizat. Vă putem recomanda un notar de încredere din Timișoara.` },
        { q: `Se poate achiziționa cu credit ipotecar?`, a: `Da, apartamentul este eligibil pentru credit ipotecar. Colaborăm cu brokeri de credite care pot obține cele mai bune dobânzi. Avansul minim este de 15-25%.` },
        { q: `Care este potențialul zonei pentru investiție?`, a: `Zona ${location} din Timișoara are un trend ascendent al valorii imobiliare. Proximitatea față de centre comerciale, universități și transport public asigură cerere constantă.` },
        { q: `Apartamentul poate fi dat în regim hotelier?`, a: `Da! RealTrust oferă servicii complete de administrare în regim hotelier cu randament net de 9-10%. Proprietatea poate genera venit imediat după achiziție.` },
      ] : [
        locationItem,
        { q: `What is the sale price?`, a: pricePerNight ? `The asking price is €${pricePerNight.toLocaleString('en-US')}. Contact us for negotiation details and payment options.` : `Contact us to find out the current price and sale conditions.` },
        { q: `What documents are needed for purchase?`, a: `To buy an apartment you need: valid ID, tax certificate, updated land registry extract. We can recommend a trusted notary in Timișoara.` },
        { q: `Can it be purchased with a mortgage?`, a: `Yes, the apartment is eligible for mortgage financing. We work with credit brokers who can secure the best rates. Minimum down payment is 15-25%.` },
        { q: `What is the area's investment potential?`, a: `The ${location} area in Timișoara has an upward trend in real estate values. Proximity to shopping centers, universities, and public transport ensures constant demand.` },
        { q: `Can the apartment be rented short-term?`, a: `Yes! RealTrust offers complete short-term rental management with 9-10% net yield. The property can generate income immediately after purchase.` },
      ];
    }

    if (isInvestmentType) {
      return language === "ro" ? [
        locationItem,
        ...(pricePerNight ? [{ q: `Care este prețul de achiziție și cum se calculează randamentul?`, a: `Prețul de achiziție este de €${pricePerNight.toLocaleString('ro-RO')}. Randamentul net se calculează pe baza venitului anual din regim hotelier minus costurile de administrare (20%) și impozit (7%).` }] : []),
        { q: `Ce randament net pot obține în regim hotelier?`, a: `Proprietățile administrate de RealTrust generează un randament net de 9-10% pe an, cu o rată de ocupare medie de 85-98%. Rezultatul depinde de sezon, locație și calitatea finisajelor.` },
        { q: `Cum funcționează administrarea de către RealTrust?`, a: `RealTrust se ocupă de tot: listare pe Booking.com și Airbnb, fotografii profesionale, dynamic pricing, comunicare cu oaspeții, curățenie profesionistă, mentenanță și raportare lunară transparentă.` },
        { q: `Care sunt costurile de administrare?`, a: `Comisionul de management este de 15-25% din venitul brut, în funcție de pachetul ales. Nu există costuri ascunse — totul este transparent în raportarea lunară.` },
        { q: `Cât de rapid poate genera venit proprietatea?`, a: `Apartamentele sunt operaționale în 2-4 săptămâni de la predare. RealTrust se ocupă de amenajare, fotografiere și listare pe toate platformele majore.` },
        { q: `Proprietatea este asigurată?`, a: `Da, toate proprietățile administrate beneficiază de asigurare de 3 milioane EUR prin programele Booking.com și Airbnb, plus asigurare suplimentară RealTrust.` },
      ] : [
        locationItem,
        ...(pricePerNight ? [{ q: `What is the purchase price and how is the yield calculated?`, a: `The purchase price is €${pricePerNight.toLocaleString('en-US')}. Net yield is calculated based on annual short-term rental income minus management costs (20%) and tax (7%).` }] : []),
        { q: `What net yield can I expect from short-term rental?`, a: `Properties managed by RealTrust generate 9-10% net yield per year, with an average occupancy rate of 85-98%. Results depend on season, location, and finish quality.` },
        { q: `How does RealTrust management work?`, a: `RealTrust handles everything: listing on Booking.com and Airbnb, professional photography, dynamic pricing, guest communication, professional cleaning, maintenance, and transparent monthly reporting.` },
        { q: `What are the management costs?`, a: `The management fee is 15-25% of gross revenue, depending on the chosen package. No hidden costs — everything is transparent in the monthly report.` },
        { q: `How quickly can the property generate income?`, a: `Apartments are operational within 2-4 weeks of handover. RealTrust handles furnishing, photography, and listing on all major platforms.` },
        { q: `Is the property insured?`, a: `Yes, all managed properties benefit from €3 million insurance through Booking.com and Airbnb programs, plus additional RealTrust insurance.` },
      ];
    }

    if (isClassicRental) {
      return language === "ro" ? [
        locationItem,
        ...(capacity ? [{ q: `Câte camere are apartamentul?`, a: `Apartamentul dispune de ${bedrooms || 1} ${(bedrooms || 1) > 1 ? "camere" : "cameră"} și poate găzdui până la ${capacity} persoane.` }] : []),
        { q: `Care este durata minimă a contractului de închiriere?`, a: `Durata minimă a contractului este de 12 luni, cu posibilitate de prelungire. Contractul se încheie conform legislației în vigoare.` },
        ...(pricePerNight ? [{ q: `Care este chiria lunară?`, a: `Chiria lunară este de €${pricePerNight}. Prețul nu include utilitățile (apă, curent, gaz, internet), care sunt în sarcina chiriașului.` }] : []),
        { q: `Ce documente sunt necesare pentru închiriere?`, a: `Pentru încheierea contractului aveți nevoie de: act de identitate valabil, dovada veniturilor (fluturași de salariu sau contract de muncă) și garanția echivalentă a unei chirii lunare.` },
        { q: `Pot rezilia contractul înainte de termen?`, a: `Da, contractul poate fi reziliat cu un preaviz de 30 de zile, conform clauzelor stabilite. Garanția se returnează integral la predarea apartamentului în stare bună.` },
      ] : [
        locationItem,
        ...(capacity ? [{ q: `How many rooms does the apartment have?`, a: `The apartment has ${bedrooms || 1} room${(bedrooms || 1) > 1 ? "s" : ""} and can accommodate up to ${capacity} people.` }] : []),
        { q: `What is the minimum lease duration?`, a: `The minimum lease duration is 12 months, with the option to extend. The contract is concluded in accordance with current legislation.` },
        ...(pricePerNight ? [{ q: `What is the monthly rent?`, a: `The monthly rent is €${pricePerNight}. The price does not include utilities (water, electricity, gas, internet), which are the tenant's responsibility.` }] : []),
        { q: `What documents are required for renting?`, a: `To sign the lease you need: a valid ID, proof of income (pay slips or employment contract), and a security deposit equivalent to one month's rent.` },
        { q: `Can I terminate the lease early?`, a: `Yes, the lease can be terminated with 30 days' notice, according to the agreed terms. The deposit is fully refunded upon returning the apartment in good condition.` },
      ];
    }

    // Default: cazare (accommodation)
    return language === "ro" ? [
      locationItem,
      ...(capacity ? [{ q: `Câți oaspeți pot fi cazați?`, a: `Apartamentul poate găzdui până la ${capacity} oaspeți, cu ${bedrooms || 1} ${(bedrooms || 1) > 1 ? "dormitoare" : "dormitor"}.` }] : []),
      { q: `Cum funcționează check-in-ul?`, a: `Oferim self check-in cu smart lock — primești codul de acces automat pe WhatsApp cu 24h înainte de sosire. Nu este necesară întâlnirea cu un reprezentant.` },
      ...(pricePerNight ? [{ q: `Care este prețul pe noapte?`, a: `Tariful pornește de la €${pricePerNight}/noapte. Prețul variază în funcție de sezon și durata sejurului. Rezervările directe beneficiază de 5% discount.` }] : []),
      { q: `Ce facilități sunt incluse?`, a: `Toate apartamentele includ WiFi gratuit, aer condiționat, bucătărie complet echipată, lenjerie de pat premium și produse de curățenie. Parcarea este disponibilă în funcție de locație.` },
      { q: `Pot anula rezervarea gratuit?`, a: `Da, oferim anulare gratuită cu până la 48 de ore înainte de check-in pentru majoritatea proprietăților. Verifică politica specifică la momentul rezervării.` },
    ] : [
      locationItem,
      ...(capacity ? [{ q: `How many guests can stay?`, a: `The apartment can accommodate up to ${capacity} guests, with ${bedrooms || 1} bedroom${(bedrooms || 1) > 1 ? "s" : ""}.` }] : []),
      { q: `How does check-in work?`, a: `We offer self check-in with smart lock — you'll receive the access code automatically via WhatsApp 24h before arrival. No need to meet a representative.` },
      ...(pricePerNight ? [{ q: `What is the price per night?`, a: `Rates start from €${pricePerNight}/night. Prices vary by season and length of stay. Direct bookings get a 5% discount.` }] : []),
      { q: `What amenities are included?`, a: `All apartments include free WiFi, air conditioning, fully equipped kitchen, premium bed linen, and cleaning supplies. Parking is available depending on location.` },
      { q: `Can I cancel for free?`, a: `Yes, we offer free cancellation up to 48 hours before check-in for most properties. Check the specific policy at the time of booking.` },
    ];
  };

  const baseFaqItems = getBaseFaqItems();

  // Merge base FAQ with dynamic amenity-based items
  const amenityFAQs = getAmenityFAQs();
  const faqItems = [...baseFaqItems, ...amenityFAQs];

  // Generate FAQ schema for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.filter(item => item.a).map(item => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-serif font-semibold">
          {language === "ro" ? "Întrebări Frecvente" : "Frequently Asked Questions"}
        </h2>
      </div>
      
      {/* FAQ Schema injected via SEOHead in PropertyDetail for proper Helmet rendering */}
      
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
            <AccordionContent>
              {(item as any).richAnswer ? (
                <p>
                  {(item as any).richAnswer.before}
                  <a
                    href={(item as any).richAnswer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 font-medium"
                  >
                    {(item as any).richAnswer.linkText}
                  </a>
                  {(item as any).richAnswer.after}
                </p>
              ) : (
                <p>{item.a}</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default PropertyFAQ;
