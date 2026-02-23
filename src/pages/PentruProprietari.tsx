<p className="text-lg md:text-xl text-white/90 mb-8">{t.subtitle}</p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-blue-950 font-bold" onClick={() => document.getElementById('calculator')?.scrollIntoView({behavior: 'smooth'})}>
                {t.cta} <ArrowRight className="ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10" onClick={handleWhatsApp}>
                {t.secondaryCta}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* RESTUL PAGINII ÎNCĂRCAT GRADUAL */}
      <Suspense fallback={<div className="h-20 flex items-center justify-center">Se încarcă...</div>}>
        <div className="container mx-auto px-6 py-12">
            <PageSummary 
                summaryRo="RealTrust oferă administrare profesională în Timișoara cu transparență totală."
                summaryEn="RealTrust provides professional management in Timisoara with full transparency."
            />
        </div>

        <OwnerBenefits />
        <OwnerHowItWorks />
        
        <section id="calculator" className="scroll-mt-24 py-12">
          <ProfitCalculator />
        </section>

        <TrustBadges />
        <FAQ />
      </Suspense>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default PentruProprietari;
