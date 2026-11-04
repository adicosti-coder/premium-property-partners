type Metadata = { title: string; description: string; h1: string };
export const PUBLIC_ROUTE_SEO: Record<string, Record<'ro' | 'en', Metadata>> = {
  '/': {
    ro: { title: 'RealTrust Timișoara | Imobiliare și administrare', description: 'Servicii imobiliare în Timișoara: vânzări, închirieri, investiții și administrare în regim hotelier prin RealTrust și ApArt Hotel.', h1: 'RealTrust Timișoara — Imobiliare, Investiții și Property Management' },
    en: { title: 'RealTrust Timișoara | Real estate and management', description: 'Real estate services in Timișoara: sales, rentals, investments and short-term rental management through RealTrust and ApArt Hotel.', h1: 'RealTrust Timișoara — Real Estate, Investments and Property Management' },
  },
  '/preturi': {
    ro: { title: 'Prețuri administrare Timișoara | RealTrust', description: 'Pachete RealTrust pentru administrare în regim hotelier în Timișoara: Starter 15%, Esențial 18%, Standard 20% din venitul net.', h1: 'Prețuri & Servicii de Administrare Proprietăți Timișoara' },
    en: { title: 'Property management pricing Timișoara | RealTrust', description: 'RealTrust short-term rental management in Timișoara: Starter 15%, Essential 18%, Standard 20% of net income, after channel fees and utilities.', h1: 'Pricing & Property Management Timișoara' },
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
  '/imobiliare': {
    ro: { title: 'Servicii imobiliare Timișoara | RealTrust', description: 'Tranzacții și servicii imobiliare în Timișoara: vânzări, cumpărări, închirieri și evaluări de proprietăți, cu suport RealTrust.', h1: 'Tranzacții și servicii imobiliare în Timișoara' },
    en: { title: 'Real estate services Timișoara | RealTrust', description: 'Real estate transactions and services in Timișoara: sales, purchases, rentals and property valuations, with support from RealTrust.', h1: 'Real estate transactions and services in Timișoara' },
  },
  '/cazare': {
    ro: { title: 'Cazare în Timișoara | ApArt Hotel', description: 'Cazare în Timișoara în apartamente și case în regim hotelier prin ApArt Hotel. Descoperă proprietățile disponibile și rezervă direct.', h1: 'Cazare în regim hotelier în Timișoara' },
    en: { title: 'Accommodation in Timișoara | ApArt Hotel', description: 'Accommodation in Timișoara in short-term rental apartments and houses through ApArt Hotel. Discover available properties and book directly.', h1: 'Short-term rental accommodation in Timișoara' },
  },
};

export function getPublicRouteSeo(pathname: string, language: 'ro' | 'en') {
  return PUBLIC_ROUTE_SEO[pathname.replace(/\/+$/, '') || '/']?.[language];
}