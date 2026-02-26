import { useLanguage } from "@/i18n/LanguageContext";
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
}

const PropertyFAQ = ({
  propertyName,
  location,
  capacity,
  bedrooms,
  pricePerNight,
  isInvestment,
  listingType,
}: PropertyFAQProps) => {
  const { language } = useLanguage();

  const isLocationUrl = location?.startsWith("http");

  const locationAnswer = (lang: "ro" | "en") => {
    if (isLocationUrl) {
      return lang === "ro"
        ? { before: `${propertyName} este situat în: Timișoara, `, linkText: "vezi pe hartă", after: ", într-o zonă cu acces facil la transport public, restaurante și atracții turistice.", url: location }
        : { before: `${propertyName} is located in: Timișoara, `, linkText: "view on map", after: ", in an area with easy access to public transport, restaurants, and tourist attractions.", url: location };
    }
    return null;
  };

  const isClassicRental = listingType === "inchiriere";

  const faqItems = language === "ro"
    ? isClassicRental
      ? [
          {
            q: `Unde este situat ${propertyName}?`,
            a: isLocationUrl ? null : `${propertyName} este situat în ${location}, Timișoara, într-o zonă cu acces facil la transport public, restaurante și atracții turistice.`,
            richAnswer: locationAnswer("ro"),
          },
          ...(capacity
            ? [{
                q: `Câte camere are apartamentul?`,
                a: `Apartamentul dispune de ${bedrooms || 1} ${(bedrooms || 1) > 1 ? "camere" : "cameră"} și poate găzdui până la ${capacity} persoane.`,
              }]
            : []),
          {
            q: `Care este durata minimă a contractului de închiriere?`,
            a: `Durata minimă a contractului este de 12 luni, cu posibilitate de prelungire. Contractul se încheie conform legislației în vigoare.`,
          },
          ...(pricePerNight
            ? [{
                q: `Care este chiria lunară?`,
                a: `Chiria lunară este de €${pricePerNight}. Prețul nu include utilitățile (apă, curent, gaz, internet), care sunt în sarcina chiriașului.`,
              }]
            : []),
          {
            q: `Ce documente sunt necesare pentru închiriere?`,
            a: `Pentru încheierea contractului aveți nevoie de: act de identitate valabil, dovada veniturilor (fluturași de salariu sau contract de muncă) și garanția echivalentă a unei chirii lunare.`,
          },
          {
            q: `Ce facilități sunt incluse în chirie?`,
            a: `Apartamentul este complet mobilat și utilat. Chiria include: mobilier, electrocasnice (frigider, mașină de spălat, aragaz), aer condiționat. Parcarea se negociază separat.`,
          },
          {
            q: `Pot rezilia contractul înainte de termen?`,
            a: `Da, contractul poate fi reziliat cu un preaviz de 30 de zile, conform clauzelor stabilite. Garanția se returnează integral la predarea apartamentului în stare bună.`,
          },
          {
            q: `Sunt acceptate animalele de companie?`,
            a: `Acceptarea animalelor de companie se discută de la caz la caz. Contactați-ne pentru detalii specifice acestui apartament.`,
          },
        ]
      : [
          {
            q: `Unde este situat ${propertyName}?`,
            a: isLocationUrl ? null : `${propertyName} este situat în ${location}, Timișoara, într-o zonă cu acces facil la transport public, restaurante și atracții turistice.`,
            richAnswer: locationAnswer("ro"),
          },
          ...(capacity
            ? [{
                q: `Câți oaspeți pot fi cazați?`,
                a: `Apartamentul poate găzdui până la ${capacity} oaspeți, cu ${bedrooms || 1} ${(bedrooms || 1) > 1 ? "dormitoare" : "dormitor"}.`,
              }]
            : []),
          {
            q: `Cum funcționează check-in-ul?`,
            a: `Oferim self check-in cu smart lock — primești codul de acces automat pe WhatsApp cu 24h înainte de sosire. Nu este necesară întâlnirea cu un reprezentant.`,
          },
          ...(pricePerNight
            ? [{
                q: `Care este prețul pe noapte?`,
                a: `Tariful pornește de la €${pricePerNight}/noapte. Prețul variază în funcție de sezon și durata sejurului. Rezervările directe beneficiază de 5% discount.`,
              }]
            : []),
          {
            q: `Ce facilități sunt incluse?`,
            a: `Toate apartamentele includ WiFi gratuit, aer condiționat, bucătărie complet echipată, lenjerie de pat premium și produse de curățenie. Parcarea este disponibilă în funcție de locație.`,
          },
          ...(isInvestment
            ? [{
                q: `Ce randament pot obține din această proprietate?`,
                a: `Proprietățile administrate de RealTrust generează în medie un randament net de 9.2-9.4% pe an, cu o rată de ocupare de peste 85%. Contactează-ne pentru o analiză personalizată.`,
              }]
            : []),
          {
            q: `Pot anula rezervarea gratuit?`,
            a: `Da, oferim anulare gratuită cu până la 48 de ore înainte de check-in pentru majoritatea proprietăților. Verifică politica specifică la momentul rezervării.`,
          },
        ]
    : isClassicRental
      ? [
          {
            q: `Where is ${propertyName} located?`,
            a: isLocationUrl ? null : `${propertyName} is located in ${location}, Timișoara, in an area with easy access to public transport, restaurants, and tourist attractions.`,
            richAnswer: locationAnswer("en"),
          },
          ...(capacity
            ? [{
                q: `How many rooms does the apartment have?`,
                a: `The apartment has ${bedrooms || 1} room${(bedrooms || 1) > 1 ? "s" : ""} and can accommodate up to ${capacity} people.`,
              }]
            : []),
          {
            q: `What is the minimum lease duration?`,
            a: `The minimum lease duration is 12 months, with the option to extend. The contract is concluded in accordance with current legislation.`,
          },
          ...(pricePerNight
            ? [{
                q: `What is the monthly rent?`,
                a: `The monthly rent is €${pricePerNight}. The price does not include utilities (water, electricity, gas, internet), which are the tenant's responsibility.`,
              }]
            : []),
          {
            q: `What documents are required for renting?`,
            a: `To sign the lease you need: a valid ID, proof of income (pay slips or employment contract), and a security deposit equivalent to one month's rent.`,
          },
          {
            q: `What amenities are included in the rent?`,
            a: `The apartment is fully furnished and equipped. The rent includes: furniture, appliances (fridge, washing machine, stove), air conditioning. Parking is negotiated separately.`,
          },
          {
            q: `Can I terminate the lease early?`,
            a: `Yes, the lease can be terminated with 30 days' notice, according to the agreed terms. The deposit is fully refunded upon returning the apartment in good condition.`,
          },
          {
            q: `Are pets allowed?`,
            a: `Pet acceptance is discussed on a case-by-case basis. Contact us for specific details about this apartment.`,
          },
        ]
      : [
          {
            q: `Where is ${propertyName} located?`,
            a: isLocationUrl ? null : `${propertyName} is located in ${location}, Timișoara, in an area with easy access to public transport, restaurants, and tourist attractions.`,
            richAnswer: locationAnswer("en"),
          },
          ...(capacity
            ? [{
                q: `How many guests can stay?`,
                a: `The apartment can accommodate up to ${capacity} guests, with ${bedrooms || 1} bedroom${(bedrooms || 1) > 1 ? "s" : ""}.`,
              }]
            : []),
          {
            q: `How does check-in work?`,
            a: `We offer self check-in with smart lock — you'll receive the access code automatically via WhatsApp 24h before arrival. No need to meet a representative.`,
          },
          ...(pricePerNight
            ? [{
                q: `What is the price per night?`,
                a: `Rates start from €${pricePerNight}/night. Prices vary by season and length of stay. Direct bookings get a 5% discount.`,
              }]
            : []),
          {
            q: `What amenities are included?`,
            a: `All apartments include free WiFi, air conditioning, fully equipped kitchen, premium bed linen, and cleaning supplies. Parking is available depending on location.`,
          },
          ...(isInvestment
            ? [{
                q: `What return can I expect from this property?`,
                a: `Properties managed by RealTrust generate an average net yield of 9.2-9.4% per year, with an occupancy rate above 85%. Contact us for a personalized analysis.`,
              }]
            : []),
          {
            q: `Can I cancel for free?`,
            a: `Yes, we offer free cancellation up to 48 hours before check-in for most properties. Check the specific policy at the time of booking.`,
          },
        ];

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-serif font-semibold">
          {language === "ro" ? "Întrebări Frecvente" : "Frequently Asked Questions"}
        </h2>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
          >
            <AccordionTrigger className="text-left">
              {item.q}
            </AccordionTrigger>
            <AccordionContent>
              {item.richAnswer ? (
                <p>
                  {item.richAnswer.before}
                  <a 
                    href={item.richAnswer.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 font-medium"
                  >
                    {item.richAnswer.linkText}
                  </a>
                  {item.richAnswer.after}
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
