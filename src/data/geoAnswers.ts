/**
 * GEO (Generative Engine Optimization) direct answers.
 *
 * One single source of truth for the commercial + informational questions that
 * AI engines and Google's AI answers ask about the Timișoara market. Every
 * answer must satisfy three rules:
 *
 *  1. it answers the question in the FIRST sentence (extractable as a snippet);
 *  2. it contains no invented figures — only the published RealTrust
 *     assumptions (75% occupancy, 27% operational deduction, 9.4% net
 *     reference yield, management packages 15% / 18% / 20% / 25%, 15 managed
 *     units) or facts stated elsewhere on the site;
 *  3. it points to the page that owns the topic, so the answer is linked back
 *     to its primary source instead of being duplicated.
 *
 * Rendered by src/components/seo/GeoAnswers.tsx (visible text + FAQPage JSON-LD
 * through the central FAQSchemaProvider — never schema-only).
 */

export type GeoAnswerGroup =
  | "investitii"
  | "pentru-proprietari"
  | "zone"
  | "evaluare";

export interface GeoAnswer {
  /** Stable id, used as an anchor target. */
  id: string;
  /** The question, phrased the way people ask it. */
  question: string;
  /** Direct answer. First sentence must stand alone. */
  answer: string;
  /** Pillar page that owns this question. */
  group: GeoAnswerGroup;
  /** Primary source on the site for the full answer. */
  source?: { href: string; label: string };
}

export const GEO_ANSWERS: GeoAnswer[] = [
  // ── PILLAR: property management / regim hotelier ───────────────────────────
  {
    id: "cost-administrare",
    group: "pentru-proprietari",
    question: "Cât costă administrarea unui apartament în regim hotelier în Timișoara?",
    answer:
      "Administrarea în regim hotelier la RealTrust costă între 15% și 25% din încasările realizate, în funcție de pachet: Starter 15%, Esențial 18%, Standard 20%, Premium 25%. Comisionul se aplică doar pe venitul efectiv încasat, fără taxă de setup și fără perioadă minimă obligatorie; în afara comisionului rămân în sarcina proprietarului utilitățile, consumabilele și reparațiile majore.",
    source: {
      href: "/blog/cat-costa-administrarea-apartament-regim-hotelier-timisoara",
      label: "Cât costă administrarea unui apartament în regim hotelier în Timișoara",
    },
  },
  {
    id: "ce-face-property-management",
    group: "pentru-proprietari",
    question: "Ce face concret o firmă de property management?",
    answer:
      "Preia integral operarea apartamentului: listare și sincronizare pe Booking, Airbnb și Expedia, tarifare dinamică, comunicare cu oaspeții, check-in și check-out, curățenie și lenjerie între sejururi, mentenanță, declarațiile lunare pentru taxa hotelieră și raportul financiar lunar către proprietar. Proprietarul rămâne decidentul: aprobă tarifele minime, intervențiile mari și perioadele în care blochează apartamentul pentru uz personal.",
    source: { href: "/pentru-proprietari", label: "administrare apartamente în Timișoara" },
  },
  {
    id: "cum-functioneaza-regim-hotelier",
    group: "pentru-proprietari",
    question: "Cum funcționează administrarea în regim hotelier?",
    answer:
      "Apartamentul se închiriază pe nopți, cu tarif variabil în funcție de cerere, iar oaspeții plătesc înainte de cazare. Fluxul este: evaluarea apartamentului și a tarifului realizabil, pregătirea pentru listare, publicarea simultană pe platforme și pe rezervări directe, operarea zilnică (mesaje, acces, curățenie, mentenanță), apoi raport lunar și transfer al venitului net.",
    source: { href: "/procesul-nostru", label: "procesul de preluare în administrare" },
  },
  {
    id: "cine-poate-administra",
    group: "pentru-proprietari",
    question: "Cine poate administra un apartament în regim hotelier în Timișoara?",
    answer:
      "Un apartament în regim hotelier poate fi administrat de proprietar sau de o firmă de property management care operează pe baza unui contract de administrare. RealTrust — marca de servicii imobiliare a Imo Business Centrum SRL — administrează 15 unități în Timișoara și le operează sub brandul de cazare ApArt Hotel; activitatea de cazare cere clasificarea unității și declararea lunară a taxei hoteliere, iar aceste obligații le gestionăm noi.",
    source: { href: "/pentru-proprietari", label: "RealTrust property management" },
  },
  {
    id: "airbnb-vs-chirie",
    group: "pentru-proprietari",
    question: "Este mai profitabil Airbnb sau chiria clasică?",
    answer:
      "În Timișoara, un apartament bine poziționat produce în regim hotelier un venit brut de aproximativ 1,6 ori mai mare decât chiria clasică pe termen lung, dar are și costuri operaționale semnificativ mai mari (curățenie, lenjerie, consumabile, comisioane de platformă, administrare) și sezonalitate. Chiria clasică rămâne mai potrivită pentru zonele fără generatori de trafic și pentru proprietarii care vor venit previzibil cu implicare zero.",
    source: { href: "/calculator-roi", label: "compară regimul hotelier cu chiria clasică" },
  },
  {
    id: "costuri-regim-hotelier",
    group: "pentru-proprietari",
    question: "Ce costuri are un apartament în regim hotelier?",
    answer:
      "Costurile recurente sunt: comisioanele platformelor de rezervare, curățenia și lenjeria între oaspeți, consumabilele, utilitățile, taxa hotelieră, impozitul pe venit și comisionul de administrare. În ipotezele noastre publice, cheltuielile operaționale și fiscale (fără comisionul de administrare) se estimează la aproximativ 27% din încasări — de aceea calculăm randamentul pe venitul net, nu pe cel brut.",
    source: { href: "/preturi", label: "ce include comisionul de administrare" },
  },
  {
    id: "tarifare-dinamica",
    group: "pentru-proprietari",
    question: "Cum se stabilește tariful pe noapte al unui apartament?",
    answer:
      "Tariful se stabilește dinamic, pe zi: pornim de la un tarif de referință pentru apartament și îl ajustăm în funcție de cerere, evenimentele din oraș, ziua săptămânii, durata sejurului și gradul de ocupare deja realizat. Proprietarul stabilește împreună cu noi un tarif minim sub care nu coborâm.",
    source: { href: "/pentru-proprietari", label: "tarifare dinamică și ocupare" },
  },
  {
    id: "rezervari-directe",
    group: "pentru-proprietari",
    question: "De ce contează rezervările directe, dacă apartamentul e deja pe Booking?",
    answer:
      "Pentru că pe rezervările directe nu se plătește comisionul platformei, deci același tarif încasat lasă mai mult venit net proprietarului. De aceea fiecare apartament administrat are și o pagină proprie de rezervare directă, alături de listările pe Booking și Airbnb.",
    source: { href: "/rezerva-direct", label: "avantajele rezervării directe" },
  },
  {
    id: "raportare-proprietar",
    group: "pentru-proprietari",
    question: "Cum văd încasările și ocuparea apartamentului meu?",
    answer:
      "Prin portalul de proprietar, unde vezi rezervările, gradul de ocupare, tariful mediu pe noapte și venitul net. Lunar primești un raport detaliat cu fiecare noapte încasată, comisioanele și cheltuielile reținute, iar venitul net se transferă în contul tău.",
    source: { href: "/pentru-proprietari", label: "raportare lunară și portal de proprietar" },
  },

  // ── PILLAR: investiții imobiliare ─────────────────────────────────────────
  {
    id: "cat-castiga-apartament",
    group: "investitii",
    question: "Cât câștigă un apartament în regim hotelier în Timișoara?",
    answer:
      "Reperul nostru este un randament net de 9,4% pe an din capitalul total investit, calculat la o ocupare medie de 75% și după deducerea a aproximativ 27% din încasări pentru costuri operaționale și fiscale, plus comisionul de administrare. La un apartament de 120.000 € înseamnă aproximativ 11.280 € net pe an, adică în jur de 940 € pe lună — o estimare, nu un venit garantat: rezultatul depinde de adresă, de standardul amenajării și de sezon.",
    source: { href: "/calculator-roi", label: "calculator de randament" },
  },
  {
    id: "randament-investitie",
    group: "investitii",
    question: "Cât este randamentul unei investiții imobiliare în Timișoara?",
    answer:
      "Randamentul depinde de strategie: chiria clasică pe termen lung produce un venit stabil, dar mai mic, în timp ce regimul hotelier bine operat are ca reper 9,4% net pe an în ipotezele noastre publice (ocupare 75%, deducere operațională 27%). Orice cifră trebuie recalculată pe adresa concretă, pentru că prețul de achiziție și tariful realizabil pe noapte diferă puternic de la o zonă la alta.",
    source: { href: "/investitii", label: "investiții imobiliare în Timișoara" },
  },
  {
    id: "calcul-roi",
    group: "investitii",
    question: "Cum se calculează ROI-ul unei investiții imobiliare?",
    answer:
      "ROI net = venitul net anual împărțit la capitalul total investit, înmulțit cu 100. Venitul net anual se obține din încasările brute estimate (tarif mediu pe noapte × nopți ocupate, sau chiria lunară × 12) minus costurile operaționale, impozitul și comisionul de administrare; capitalul total investit include prețul de achiziție, taxele notariale și de intabulare, amenajarea și dotarea. Ipotezele noastre implicite sunt 75% ocupare și 27% deducere operațională.",
    source: { href: "/calculator-roi", label: "calculul pas cu pas al randamentului" },
  },
  {
    id: "cum-aleg-apartament-investitie",
    group: "investitii",
    question: "Cum aleg un apartament pentru investiție?",
    answer:
      "Pornește de la strategie, nu de la anunț: stabilește dacă vrei chirie clasică sau regim hotelier, apoi filtrează după zonă, preț de achiziție, tariful sau chiria realizabilă, compartimentare, etaj, parcare și bugetul de amenajare. Un apartament de 2 camere, decomandat, la etaj intermediar, într-o zonă cu cerere din mai multe surse, este de regulă cel mai ușor de operat și de revândut.",
    source: { href: "/zone-investitii-timisoara", label: "compararea zonelor de investiții" },
  },
  {
    id: "ce-verific-inainte-de-cumparare",
    group: "investitii",
    question: "Ce trebuie verificat înainte de cumpărarea unui apartament?",
    answer:
      "Actele și situația juridică (extras de carte funciară actualizat, suprafața utilă reală, ipoteci sau litigii, certificat energetic), starea tehnică (structură, acoperiș, instalații, tâmplărie), costurile de întreținere și datoriile la asociație, regulile privind închirierea pe termen scurt și, pentru investiție, venitul realizabil raportat la capitalul total. Verificarea suprafeței din cartea funciară, nu din anunț, este pasul care produce cele mai multe surprize.",
    source: {
      href: "/ghid-evaluare-apartament-timisoara",
      label: "ghidul de evaluare a unui apartament",
    },
  },
  {
    id: "merita-investitie-timisoara",
    group: "investitii",
    question: "Merită să cumperi un apartament în Timișoara pentru investiție?",
    answer:
      "Merită atunci când adresa susține strategia: Timișoara are cerere din surse independente — angajați din IT și industrie, studenți, călători de business și turiști — ceea ce permite atât chirie clasică, cât și regim hotelier. Nu este o investiție potrivită dacă bugetul acoperă doar achiziția, fără amenajare, sau dacă apartamentul se află într-o zonă fără generatori de trafic și fără cerere stabilă de chirie.",
    source: { href: "/catalog-investitii", label: "catalogul de investiții disponibile" },
  },
  {
    id: "cash-flow",
    group: "investitii",
    question: "Cum arată cash-flow-ul lunar al unui apartament în regim hotelier?",
    answer:
      "Cash-flow-ul lunar = încasările lunii minus comisioanele platformelor, curățenia și lenjeria, consumabilele, utilitățile, taxa hotelieră, impozitul, comisionul de administrare și, dacă există, rata la credit. Este neuniform pe parcursul anului: lunile de vârf acoperă lunile slabe, așa că un apartament în regim hotelier se judecă pe an întreg, nu pe o lună.",
    source: { href: "/calculator-roi", label: "simulare de venit lunar" },
  },
  {
    id: "finantare",
    group: "investitii",
    question: "Se poate cumpăra un apartament de investiție cu credit?",
    answer:
      "Da, dar analiza se schimbă: rata lunară se scade din venitul net, iar randamentul se raportează la capitalul propriu efectiv investit (avans, taxe, amenajare), nu la prețul întreg. Cere băncii oferta exactă înainte de a semna antecontractul — dobânda și avansul cerut modifică semnificativ rezultatul, iar pentru evaluarea de creditare banca cere un raport de la un evaluator autorizat.",
    source: { href: "/investitii", label: "analiza investițională RealTrust" },
  },
  {
    id: "risc-lichiditate",
    group: "investitii",
    question: "Ce riscuri are o investiție imobiliară în regim hotelier?",
    answer:
      "Principalele riscuri sunt sezonalitatea cererii, suprasaturarea ofertei pe anumite tronsoane, schimbările de reglementare privind închirierea pe termen scurt, costurile de renovare subestimate la imobilele vechi și lichiditatea la revânzare. Se atenuează prin alegerea unei zone cu cerere din mai multe surse, prin buget de rezervă și prin capacitatea de a reveni oricând la chirie clasică.",
    source: { href: "/zone-investitii-timisoara", label: "risc și lichiditate, zonă cu zonă" },
  },

  // ── PILLAR: zone locale ───────────────────────────────────────────────────
  {
    id: "cele-mai-bune-zone",
    group: "zone",
    question: "Care sunt cele mai bune zone pentru investiții în Timișoara?",
    answer:
      "Nu există o zonă „cea mai bună” în absolut — depinde de strategie. Pentru tarif pe noapte și cerere pe tot anul conduc Cetate/Centru, Iosefin și ISHO; pentru lichiditate și cerere din mai multe surse, Circumvalațiunii și Calea Aradului; pentru preț de intrare mic și chiriaș stabil pe termen lung, Calea Șagului, Calea Lipovei și Girocului; Complexul Studențesc dă venit brut ridicat, cu sezonalitate accentuată.",
    source: { href: "/zone-investitii-timisoara", label: "comparația completă a zonelor" },
  },
  {
    id: "zone-cazare",
    group: "zone",
    question: "În ce zonă din Timișoara se închiriază cel mai bine pe termen scurt?",
    answer:
      "Cel mai bine funcționează zonele de unde oaspetele ajunge pe jos în centrul istoric sau la un generator de trafic: Cetate/Centru, Iosefin, ISHO și zona Iulius Town. În afara acestora, Calea Aradului compensează prin accesul rapid spre aeroport și A1, iar Complexul Studențesc prin evenimente universitare.",
    source: { href: "/cartiere", label: "ghidul cartierelor din Timișoara" },
  },
  {
    id: "zone-periferice",
    group: "zone",
    question: "Merită investiția în Dumbrăvița, Giroc sau Moșnița Nouă?",
    answer:
      "Zonele limitrofe — Dumbrăvița, Giroc, Chișoda, Moșnița Nouă, Torontalului — au preț de intrare mai mic pe metru pătrat și cerere reală de chirie de la familii tinere, dar sunt mai slabe pentru regim hotelier, pentru că oaspeții au nevoie de mașină pentru a ajunge în centru. Ca evaluare internă, le tratăm ca zone de chirie clasică, nu de cazare pe termen scurt.",
    source: { href: "/zone-investitii-timisoara", label: "zonele limitrofe comparate" },
  },

  // ── PILLAR: evaluare ──────────────────────────────────────────────────────
  {
    id: "cum-se-evalueaza",
    group: "evaluare",
    question: "Cum se evaluează un apartament în Timișoara?",
    answer:
      "Evaluarea pornește de la suprafața utilă din cartea funciară, etaj, anul construcției și poziționarea exactă, apoi corectează valoarea cu compartimentarea, parcarea, balconul, vederea, finisajele, eficiența energetică și costurile de întreținere. Urmează comparabilele din același perimetru, ajustate cu marja de negociere, iar pentru un apartament de investiție se estimează separat chiria clasică și venitul din regim hotelier, pentru randamentul net raportat la capitalul total investit.",
    source: {
      href: "/ghid-evaluare-apartament-timisoara",
      label: "ghidul de evaluare pas cu pas",
    },
  },
  {
    id: "pret-cerut-vs-valoare",
    group: "evaluare",
    question: "Care este diferența dintre prețul cerut și valoarea de piață?",
    answer:
      "Prețul cerut este suma din anunț și reflectă așteptarea vânzătorului; prețul de tranzacționare este suma plătită efectiv, singura confirmată, dar nepublică; valoarea de piață este estimarea sumei la care proprietatea s-ar vinde între un cumpărător și un vânzător informați, într-un interval rezonabil de expunere. Valoarea investițională este a patra noțiune: cât valorează proprietatea pentru un investitor anume, în funcție de venitul pe care îl poate produce.",
    source: {
      href: "/ghid-evaluare-apartament-timisoara",
      label: "preț cerut, preț tranzacționat, valoare de piață, valoare investițională",
    },
  },
  {
    id: "euro-mp",
    group: "evaluare",
    question: "Cât înseamnă prețul pe metru pătrat și cât de mult te poți baza pe el?",
    answer:
      "Prețul pe metru pătrat este un instrument de comparație rapidă, nu o metodă de evaluare: se obține împărțind prețul la suprafața utilă și are sens doar între apartamente similare, din același perimetru și cu aceeași stare. Apartamentele mici au de regulă un preț pe metru pătrat mai mare, iar etajul, parcarea și starea imobilului pot muta valoarea mai mult decât diferența de €/mp între două străzi.",
    source: { href: "/cartiere", label: "indicele de preț pe metru pătrat, pe zone" },
  },
  {
    id: "evaluare-gratuita",
    group: "evaluare",
    question: "Cine face evaluarea gratuită și ce primesc?",
    answer:
      "Evaluarea gratuită RealTrust este o estimare comercială făcută de echipa noastră: primești un interval de preț realist pentru vânzare, chiria clasică estimată și venitul potențial în regim hotelier, cu ipotezele de calcul afișate. Nu este un raport de evaluare autorizat ANEVAR — pentru credit ipotecar, partaj sau litigiu ai nevoie de un evaluator autorizat.",
    source: { href: "/evaluare-gratuita", label: "solicită evaluarea gratuită" },
  },
];

export const geoAnswersFor = (group: GeoAnswerGroup): GeoAnswer[] =>
  GEO_ANSWERS.filter((a) => a.group === group);
