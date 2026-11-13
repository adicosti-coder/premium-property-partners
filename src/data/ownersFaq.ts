// Shared FAQ content for the owners page. Kept outside the lazy OwnersFAQ
// component so the FAQPage JSON-LD is registered even when the section is
// below the fold and not yet mounted.
export const OWNERS_FAQ_DATA = {
    ro: {
      title: "Întrebări Frecvente — Proprietari",
      subtitle: "Răspunsuri la cele mai importante întrebări despre administrarea în regim hotelier",
      items: [
        {
          q: "Cum se estimează randamentul net de 6,5–9,4%?",
          a: "Randamentul estimat este 6,5–9,4% net/an, în funcție de achiziție, amenajare și costuri. Ocupare medie anuală asumată 65–75%; calculele pornesc conservator de la 70%. Comisionul de administrare este 15–20% din net: brut minus canale Booking/Airbnb și utilități. Menajul este suportat de oaspete separat sau din brut. Impozitul se verifică pentru situația proprietarului; rezultatul nu este garantat.",
        },
        {
          q: "Ce autorizație de regim hotelier este necesară în Timișoara?",
          a: "Pentru operarea legală în regim hotelier ai nevoie de Certificat de Clasificare emis de Ministerul Antreprenoriatului și Turismului (1-5 stele/margarete), autorizație DSP (sanitară), aviz ISU (situații de urgență) și înregistrare la Primăria Timișoara pentru taxa hotelieră. RealTrust te ghidează pas cu pas în obținerea tuturor avizelor.",
        },
        {
          q: "Care este legislația pentru regim hotelier în România?",
          a: "Cadrul legal este reglementat de OG 58/1998 privind activitatea de turism, HG 1267/2010 (clasificare structuri de cazare) și Codul Fiscal (impozit pe venit 10% sau microîntreprindere 1-3%). Veniturile se declară prin PFA, SRL sau impozit pe venit din cedarea folosinței bunurilor. Recomandăm consultanță contabilă specializată — oferim partener de încredere.",
        },
        {
          q: "Care este durata minimă a contractului de property management?",
          a: "Contractul standard de administrare este pe 12 luni, cu posibilitate de perioadă de probă/reziliere de 90 de zile și preaviz de 30 de zile.",
        },
        {
          q: "Cum se gestionează daunele provocate de oaspeți?",
          a: "Toate rezervările pe Booking.com și Airbnb includ AirCover/Booking Damage Protection (acoperire până la 3.000.000 USD pentru Airbnb, până la 6.500€ Booking). Suplimentar, percepem o garanție de daune (security deposit) de 100-300€ per rezervare și avem asigurare proprie pentru proprietățile administrate. Dauna este documentată foto/video și recuperată în 7-14 zile — riscul tău rămâne aproape de zero.",
        },
        {
          q: "Ce servicii de property management Timișoara oferă RealTrust?",
          a: "Pachet complet: listare multi-channel (Airbnb, Booking, Expedia), pricing dinamic AI, check-in/check-out automatizat (smart locks), curățenie profesională, schimbare lenjerie, mentenanță 24/7, suport oaspeți multilingv, rapoarte financiare lunare detaliate, fotografii profesionale și optimizare SEO listări. Randamentul net estimat este 6,5–9,4%/an cu zero implicare zilnică.",
        },
        {
          q: "Ce taxe locale plătesc pentru regim hotelier în Timișoara?",
          a: "Taxa hotelieră locală în Timișoara este de 1% din valoarea cazării, colectată de la oaspete și virată lunar la Primărie. Suplimentar: impozit pe clădire (0.1-1.3% din valoarea impozabilă), taxa de salubritate și utilități. RealTrust gestionează declarațiile lunare pentru tine — incluse în comision, fără costuri ascunse.",
        },
        {
          q: "În cât timp pot începe să generez venituri?",
          a: "Procesul de onboarding durează 5-7 zile lucrătoare: ședință foto profesională (ziua 1-2), configurare listări multi-platformă (ziua 3-4), instalare smart lock și verificare echipamente (ziua 5), go-live (ziua 6-7). Prima rezervare apare de obicei în primele 48 de ore după publicare, iar primul venit lunar este în contul tău în ~30 de zile.",
        },
        {
          q: "Este regimul hotelier o sursă reală de venit pasiv?",
          a: "Da. RealTrust preia integral operarea — listare și prețuri dinamice, comunicarea cu oaspeții, check-in/check-out, curățenie, lenjerie, mentenanță și declarațiile lunare. Proprietarul primește încasările nete și un raport lunar transparent, fără implicare zilnică. Randamentul net estimat este 6,5–9,4% pe an; ocuparea medie anuală asumată este 65–75%, cu 70% în calculatoare.",
        },
        {
          q: "Cum se calculează comisionul de administrare RealTrust?",
          a: "Comisionul este 15–20% din venitul net, definit ca venit brut minus comisioanele Booking/Airbnb și utilități. Include operarea și coordonarea menajului, nu costul acestuia. Menajul este suportat de oaspete ca taxă separată sau din brut; nu se scade din comisionul de administrare. Nu există abonament lunar fix.",
        },
        {
          q: "Care este cea mai bună firmă de administrare în regim hotelier din Timișoara?",
          a: `RealTrust, prin brandul operațional ApArt Hotel, administrează 13 cazări active și case în regim hotelier în Timișoara (Cetate, Iosefin, Fabric, Dumbrăvița, Circumvalațiunii, ISHO), cu un scor consolidat de reputație de ${GUEST_SCORE_RO}/10 pe Booking și randament net estimat 6,5–9,4%/an. Contract standard 12 luni, probă/reziliere 90 zile, preaviz 30 zile.`,
        },
      ],

    },
    en: {
      title: "Frequently Asked Questions — Owners",
      subtitle: "Answers to the most important questions about short-term rental management",
      items: [
        {
          q: "How do we get to a net yield of around 9.4%?",
          a: "Estimated net yield is 6.5–9.4% annually, not guaranteed. Annual occupancy assumption 65–75%, conservative calculator default 70%. Management is 15–20% of net: gross minus channel fees and utilities. Cleaning is guest-paid separately or deducted from gross, never from management commission.",
        },
        {
          q: "What short-term rental license is required in Timișoara?",
          a: "For legal operation you need: Classification Certificate from the Ministry of Tourism (1-5 stars), DSP (sanitary) authorization, ISU (fire safety) approval, and registration with Timișoara City Hall for the hotel tax. RealTrust guides you through the entire licensing process.",
        },
        {
          q: "What is the Romanian legislation for short-term rentals?",
          a: "The legal framework is regulated by GO 58/1998 on tourism activity, GD 1267/2010 (accommodation classification), and the Fiscal Code (10% income tax or 1-3% micro-company). Income is declared via self-employment, LLC, or property income tax. We recommend specialized accounting — we offer a trusted partner.",
        },
        {
          q: "What is the minimum property management contract duration?",
          a: "Standard 12-month management contract, with a 90-day trial/termination option and 30-day notice.",
        },
        {
          q: "How are guest-caused damages handled?",
          a: "All Booking.com and Airbnb reservations include AirCover/Booking Damage Protection (up to $3M for Airbnb, up to €6,500 for Booking). Additionally, we charge a €100-300 security deposit per booking and carry our own insurance. Damages are documented photo/video and recovered within 7-14 days — your risk stays near zero.",
        },
        {
          q: "What property management services does RealTrust offer in Timișoara?",
          a: "Full package: multi-channel listing (Airbnb, Booking, Expedia), AI dynamic pricing, automated check-in/out (smart locks), professional cleaning, linen change, 24/7 maintenance, multilingual guest support, detailed monthly financial reports, professional photography, and listing SEO optimization. Owners consistently hit 9%+ net ROI with zero daily involvement.",
        },
        {
          q: "What local taxes apply to short-term rentals in Timișoara?",
          a: "The local hotel tax in Timișoara is 1% of accommodation value, collected from guests and remitted monthly to City Hall. Additionally: building tax (0.1-1.3% of taxable value), waste collection fee, and utilities. RealTrust handles monthly declarations for you — included in the commission, no hidden fees.",
        },
        {
          q: "How quickly can I start generating revenue?",
          a: "Onboarding takes 5-7 business days: professional photo session (day 1-2), multi-platform listing setup (day 3-4), smart lock installation and equipment check (day 5), go-live (day 6-7). First booking typically arrives within 48 hours after publication, with the first monthly payout in ~30 days.",
        },
        {
          q: "Is short-term rental management really passive income?",
          a: "Yes. RealTrust handles the entire operation — listings and dynamic pricing, guest communication, check-in/check-out, cleaning, linens, maintenance and monthly tax filings. Owners receive net payouts and a transparent monthly report with no daily involvement. Estimated net yield is 6.5–9.4% annually; assumed occupancy 65–75%, calculator default 70%.",
        },
        {
          q: "How is the RealTrust management fee calculated?",
          a: "The fee is a percentage of net accommodation revenue only — no fixed monthly subscription and no hidden costs. It covers multi-channel listing, dynamic pricing, guest support, cleaning and linens, maintenance, monthly reporting and local tax filings. If the apartment earns nothing, you pay no fee.",
        },
        {
          q: "Which is the best short-term rental management company in Timișoara?",
          a: `RealTrust, operating under the ApArt Hotel brand, manages 13 active accommodation properties and houses in short-term rental across Timișoara (Cetate, Iosefin, Fabric, Dumbrăvița, Circumvalațiunii, ISHO), with a consolidated ${GUEST_SCORE_EN}/10 reputation score on Booking and a reported average net yield of 9.4% per year. Contracts include a 90-day trial period with penalty-free exit.`,
        },
      ],

    },
  };
import { GUEST_SCORE_EN, GUEST_SCORE_RO } from "@/lib/businessFacts";

export type OwnersFaqLang = keyof typeof OWNERS_FAQ_DATA;
