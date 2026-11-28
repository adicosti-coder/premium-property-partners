type Metadata = { title: string; description: string; h1: string };
export const PUBLIC_ROUTE_SEO: Record<string, Record<'ro' | 'en', Metadata>> = {
  '/': {
    ro: { title: 'RealTrust Timișoara | Imobiliare, Investiții, Administrare', description: 'RealTrust Timișoara: vânzări, închirieri, investiții și administrare în regim hotelier. Calculează randamentul net și descoperă soluții pentru proprietari.', h1: 'RealTrust Timișoara — Imobiliare, Investiții și Property Management' },
    en: { title: 'RealTrust Timișoara | Real estate and management', description: 'Real estate services in Timișoara: sales, rentals, investments and short-term rental management through RealTrust and ApArt Hotel.', h1: 'RealTrust Timișoara — Real Estate, Investments and Property Management' },
  },
  '/analiza-roi-apartament': {
    ro: { title: 'Randament imobiliar Timișoara | Analiză apartament', description: 'Calculează randamentul net al unui apartament în Timișoara: compară chiria clasică cu regimul hotelier, ocuparea, costurile și evoluția investiției.', h1: 'Analiză randament apartament pentru investiții în Timișoara' },
    en: { title: 'Apartment Yield Analysis | Real estate investment returns', description: 'Estimate an apartment’s net yield in Timișoara: compare classic rent with short-term management, occupancy, costs and investment growth.', h1: 'Apartment yield analysis for investments in Timișoara' },
  },
  '/pentru-proprietari': {
    ro: { title: 'Administrare regim hotelier Timișoara | RealTrust', description: 'Administrare regim hotelier în Timișoara: rezervări, curățenie, mentenanță și raportare lunară. Randament net estimat de 6,5–9,4% pe an.', h1: 'Administrare apartamente și case în regim hotelier în Timișoara' },
    en: { title: 'Property management Timișoara | RealTrust', description: 'Short-term rental management in Timișoara: bookings, cleaning, maintenance and monthly reports. Estimated annual net yield of 6.5–9.4%.', h1: 'Short-term rental management for apartments and houses in Timișoara' },
  },
  '/conditii-proprietari': {
    ro: { title: 'Condiții pentru proprietari Timișoara | RealTrust', description: 'Publicare și analiză gratuite, fără exclusivitate. Vânzare: 2–4%; închiriere: 50–100% din prima chirie; administrare: 15–20% din venitul net.', h1: 'Condiții pentru proprietari în Timișoara' },
    en: { title: 'Property owner terms Timișoara | RealTrust', description: 'Free listing and analysis, no exclusivity. Sales: 2–4%; rentals: 50–100% of the first rent; management: 15–20% of net income.', h1: 'Property owner terms in Timișoara' },
  },
  '/investitii': {
    ro: { title: 'Investiții imobiliare Timișoara | RealTrust', description: 'Investiții imobiliare în Timișoara cu RealTrust. Randament net estimat de 6,5–9,4% pe an, analiză de proprietate și administrare transparentă.', h1: 'Investiții imobiliare în Timișoara' },
    en: { title: 'Real estate investments Timișoara | RealTrust', description: 'Real estate investments in Timișoara with RealTrust. Estimated annual net yield of 6.5–9.4%, property analysis and transparent management.', h1: 'Real estate investments in Timișoara' },
  },
  '/cazare': {
    ro: { title: 'Cazare regim hotelier Timișoara | ApArt Hotel', description: 'Cazare în Timișoara în apartamente și case în regim hotelier prin ApArt Hotel. Descoperă proprietățile disponibile și rezervă direct.', h1: 'Cazare în regim hotelier în Timișoara' },
    en: { title: 'Accommodation in Timișoara | ApArt Hotel', description: 'Accommodation in Timișoara in short-term rental apartments and houses through ApArt Hotel. Discover available properties and book directly.', h1: 'Short-term rental accommodation in Timișoara' },
  },
  '/ansambluri-rezidentiale': {
    ro: { title: 'Ansambluri rezidențiale Timișoara | Apartamente RealTrust', description: 'Ansambluri rezidențiale din Timișoara: XCity Towers, Vivalia, City of Mara, NordOne, Fructus Plaza. Apartamente de vânzare, închiriere și regim hotelier.', h1: 'Ansambluri rezidențiale Timișoara' },
    en: { title: 'Residential complexes Timișoara | RealTrust apartments', description: 'Residential complexes in Timișoara: XCity Towers, Vivalia, City of Mara, NordOne, Fructus Plaza. Apartments for sale, rent and short-term rental.', h1: 'Residential Complexes Timișoara' },
  },
  '/imobiliare-timisoara/complex-studentesc': {
    ro: { title: 'Apartamente Complex Studențesc Timișoara | RealTrust', description: 'Apartamente în Complexul Studențesc Timișoara, lângă UPT și aproape de UVT: cerere de chirie, regim hotelier, randament net estimat 6,5–9,4% pe an.', h1: 'Apartamente de vânzare în Complexul Studențesc, Timișoara' },
    en: { title: 'Complex Studențesc apartments Timișoara | RealTrust', description: 'Apartments in Timișoara\'s Complex Studențesc near UPT and UVT: rental demand, short-term rental potential and an estimated 6.5–9.4% net yield per year.', h1: 'Apartments for sale in Complexul Studențesc, Timișoara' },
  },
  '/blog': {
    ro: { title: 'Blog imobiliar Timișoara | Ghiduri și analize RealTrust', description: 'Ghiduri imobiliare pentru Timișoara: cartiere, prețuri, randament, chirie clasică și regim hotelier, explicate pentru proprietari, investitori și oaspeți.', h1: 'Blog & Ghiduri' },
    en: { title: 'Timișoara real estate blog | RealTrust guides', description: 'Real estate guides for Timișoara: neighbourhoods, prices, yield, classic rentals and short-term rentals, explained for owners, investors and guests alike.', h1: 'Blog & Guides' },
  },
  '/imobiliare': {
    ro: { title: 'Servicii imobiliare Timișoara | Vânzări, chirii RealTrust', description: 'Servicii imobiliare în Timișoara: vânzări, cumpărări, închirieri și evaluări în Cetate, Iosefin, Complex Studențesc, Dumbrăvița și Giroc, cu RealTrust.', h1: 'Tranzacții și servicii imobiliare în Timișoara' },
    en: { title: 'Real estate services Timișoara | RealTrust', description: 'Real estate transactions and services in Timișoara: sales, purchases, rentals and property valuations, with support from RealTrust in every neighbourhood.', h1: 'Real estate transactions and services in Timișoara' },
  },
  '/evaluare-gratuita': {
    ro: { title: 'Evaluare gratuită apartament Timișoara | RealTrust', description: 'Evaluare gratuită pentru apartament, casă sau teren în Timișoara: preț de piață, chirie posibilă și randament estimat, cu răspuns în 24 de ore lucrătoare.', h1: 'Evaluare gratuită a proprietății tale în Timișoara' },
    en: { title: 'Free property valuation Timișoara | RealTrust', description: 'Free valuation for an apartment, house or land in Timișoara: market price, possible rent and estimated yield, with a reply within 24 working hours.', h1: 'Free valuation of your property in Timișoara' },
  },
  '/piata-imobiliara-timisoara': {
    ro: { title: 'Piața imobiliară Timișoara 2026 | Prețuri pe cartiere', description: 'Piața imobiliară din Timișoara în 2026: prețuri medii pe metru pătrat pe cartiere, tendințe, zone accesibile și premium, cu interpretarea RealTrust.', h1: 'Piața imobiliară Timișoara — aprilie 2026' },
    en: { title: 'Timișoara property market 2026 | Prices by area', description: 'Timișoara\'s property market in 2026: average prices per square metre by neighbourhood, trends, affordable and premium areas, explained by RealTrust.', h1: 'Timișoara property market — April 2026' },
  },
  '/imobiliare-timisoara/giroc': {
    ro: { title: 'Apartamente și case Giroc Timișoara | RealTrust', description: 'Apartamente și case în Giroc, lângă Timișoara: ansambluri noi, acces spre Shopping City și centru, chirii pentru familii și analiză de randament RealTrust.', h1: 'Apartamente de vânzare în Giroc, Timișoara' },
    en: { title: 'Apartments and houses in Giroc Timișoara | RealTrust', description: 'Apartments and houses in Giroc near Timișoara: new developments, access to Shopping City and the centre, family rentals and RealTrust yield analysis.', h1: 'Apartments for sale in Giroc, Timișoara' },
  },
  '/catalog-investitii': {
    ro: { title: 'Catalog investiții imobiliare Timișoara 2026 | RealTrust', description: 'Catalogul de investiții imobiliare Timișoara 2026: apartamente analizate, randament net estimat 6,5–9,4%, comparație chirie clasică și regim hotelier.', h1: 'Catalogul de Investiții Timișoara 2026' },
    en: { title: 'Timișoara property investment catalogue 2026', description: 'The 2026 Timișoara real estate investment catalogue: analysed apartments, 6.5–9.4% estimated net yield, classic rent versus short-term rental comparison.', h1: 'Timișoara Investment Catalogue 2026' },
  },
  '/calculator-randament': {
    ro: { title: 'Calculator de randament imobiliar Timișoara | RealTrust', description: 'Calculator de randament imobiliar Timișoara: compară chiria clasică cu regimul hotelier pe chirii reale din fiecare zonă și află venitul net estimat.', h1: 'Calculator de randament imobiliar Timișoara' },
    en: { title: 'Real estate yield calculator Timișoara | RealTrust', description: 'Real estate yield calculator for Timișoara: compare classic rent with short-term rental using real rents in each area and see your estimated net income.', h1: 'Real estate yield calculator Timișoara' },
  },
  '/hostscan-ai': {
    ro: { title: 'HostScan AI | Analiză proprietate Timișoara RealTrust', description: 'HostScan AI analizează anunțul sau fotografiile proprietății din Timișoara și estimează tariful pe noapte, venitul net lunar și îmbunătățirile utile.', h1: 'Analiza potențialului proprietății tale' },
    en: { title: 'HostScan AI | Property analysis Timișoara RealTrust', description: 'HostScan AI analyses your Timișoara listing or photos and estimates the nightly rate, net monthly income and useful improvements for short-term rental.', h1: 'Analyse your property\'s potential' },
  },
  '/preturi': {
    ro: { title: 'Prețuri administrare regim hotelier Timișoara | RealTrust', description: 'Prețuri RealTrust pentru administrare în regim hotelier în Timișoara: Starter 15%, Esențial 18%, Standard 20% din venitul net, menaj separat.', h1: 'Prețuri & Servicii de Administrare Proprietăți Timișoara' },
    en: { title: 'Short-term rental management pricing Timișoara', description: 'RealTrust short-term rental management in Timișoara: Starter 15%, Essential 18%, Standard 20% of net income, after channel fees and utilities.', h1: 'Pricing & Property Management Timișoara' },
  },

};

export function getPublicRouteSeo(pathname: string, language: 'ro' | 'en') {
  return PUBLIC_ROUTE_SEO[pathname.replace(/\/+$/, '') || '/']?.[language];
}