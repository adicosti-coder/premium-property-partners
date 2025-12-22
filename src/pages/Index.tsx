import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Benefits from "@/components/Benefits";
import HowItWorks from "@/components/HowItWorks";
import WhyUs from "@/components/WhyUs";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <section id="beneficii">
          <Benefits />
        </section>
        <section id="cum-functioneaza">
          <HowItWorks />
        </section>
        <section id="de-ce-noi">
          <WhyUs />
        </section>
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
