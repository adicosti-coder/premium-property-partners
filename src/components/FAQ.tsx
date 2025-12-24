import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const faqs = [
  {
    question: "Ce comision percepeți pentru administrarea proprietății?",
    answer: "Percepem un comision transparent de 15% din veniturile generate. Nu există costuri ascunse - acest procent include toate serviciile: gestionare rezervări, comunicare cu oaspeții, curățenie profesională, check-in/out și suport 24/7."
  },
  {
    question: "Cât de des primesc veniturile din închiriere?",
    answer: "Veniturile sunt transferate lunar, în primele 5 zile ale lunii pentru luna precedentă. Primești un raport detaliat cu toate rezervările, veniturile brute, cheltuielile și suma netă transferată."
  },
  {
    question: "Ce se întâmplă dacă un oaspete provoacă daune?",
    answer: "Toate rezervările sunt acoperite de asigurări ale platformelor (Airbnb, Booking). În plus, colectăm o garanție de la fiecare oaspete și facem verificări înainte de check-in. În caz de daune, gestionăm întreg procesul de despăgubire."
  },
  {
    question: "Pot folosi apartamentul când doresc?",
    answer: "Absolut! Îți poți bloca oricând perioadele în care dorești să folosești proprietatea. Ai acces la calendar în timp real și poți face modificări cu minimum 48 de ore înainte."
  },
  {
    question: "Ce platforme folosiți pentru listare?",
    answer: "Listăm proprietatea pe toate platformele majore: Airbnb, Booking.com, Expedia, Vrbo și site-ul nostru direct. Sincronizăm automat calendarele pentru a evita suprapunerile."
  },
  {
    question: "Cum se face curățenia după fiecare sejur?",
    answer: "Avem echipe profesionale de curățenie care respectă standarde hoteliere. Curățenia include schimbarea lenjeriei, dezinfectare completă, verificarea dotărilor și pregătirea apartamentului pentru următorul oaspete."
  },
  {
    question: "Ce documente sunt necesare pentru a începe colaborarea?",
    answer: "Ai nevoie de: actul de proprietate sau contractul de închiriere care permite subînchirierea, buletin/carte de identitate, și detalii bancare pentru transferuri. Procesul complet durează 2-3 zile lucrătoare."
  },
  {
    question: "Pot renunța la servicii oricând?",
    answer: "Da, colaborarea poate fi încheiată cu un preaviz de 30 de zile. Nu există contracte pe termen lung obligatorii. Ne dorim să rămâi partener pentru că ești mulțumit, nu pentru că ești obligat."
  },
];

const FAQ = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <section id="faq" className="py-24 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">Întrebări Frecvente</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            Ai <span className="text-gradient-gold">Întrebări?</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Găsește răspunsuri la cele mai frecvente întrebări despre serviciile noastre de administrare.
          </p>
        </div>

        <div 
          ref={contentRef}
          className={`max-w-3xl mx-auto transition-all duration-700 ${
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-serif font-semibold text-foreground hover:text-primary py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
        <div 
          className={`mt-12 text-center transition-all duration-700 delay-200 ${
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-muted-foreground mb-4">
            Nu ai găsit răspunsul căutat?
          </p>
          <a 
            href="#contact" 
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Contactează-ne direct
            <span className="text-lg">→</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;