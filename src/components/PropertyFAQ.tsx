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
}

const PropertyFAQ = ({
  propertyName,
  location,
  capacity,
  bedrooms,
  pricePerNight,
  isInvestment,
}: PropertyFAQProps) => {
  const { language } = useLanguage();

  const faqItems = language === "ro"
    ? [
        {
          q: `Unde este situat ${propertyName}?`,
          a: `${propertyName} este situat în ${location}, Timișoara, într-o zonă cu acces facil la transport public, restaurante și atracții turistice.`,
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
    : [
        {
          q: `Where is ${propertyName} located?`,
          a: `${propertyName} is located in ${location}, Timișoara, in an area with easy access to public transport, restaurants, and tourist attractions.`,
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
    <section className="mt-8" itemScope itemType="https://schema.org/FAQPage">
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
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <AccordionTrigger className="text-left" itemProp="name">
              {item.q}
            </AccordionTrigger>
            <AccordionContent
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
            >
              <p itemProp="text">{item.a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default PropertyFAQ;
