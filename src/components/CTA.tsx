import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground mb-6">
            Pregătit să Îți <span className="text-gradient-gold">Maximizezi Venitul</span>?
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 font-sans">
            Solicită o evaluare gratuită și descoperă cât poți câștiga cu apartamentul tău. 
            Fără obligații, fără costuri ascunse.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="premium" size="xl">
              Solicită Evaluare Gratuită
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="xl" className="border-primary/20 hover:bg-primary hover:text-cream">
              <Phone className="mr-2 h-5 w-5" />
              Sună-ne Acum
            </Button>
          </div>
          
          <p className="mt-8 text-sm text-muted-foreground font-sans">
            Răspundem în maximum 24 de ore. Consultanță personalizată, fără presiune.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
