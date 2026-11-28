import { GUEST_SCORE_RO, HOTEL_MANAGEMENT_SINCE, REAL_ESTATE_SINCE } from "./businessFacts";

export interface AnalysisZoneGuideItem {
  slug: string;
  title: string;
  text: string;
}

/**
 * Visible zone guide on /analiza-roi-apartament. The prerendered version is
 * generated from the same entries so crawlers and visitors get the same facts.
 */
export const ANALYSIS_ZONE_GUIDE: readonly AnalysisZoneGuideItem[] = [
  {
    slug: "complex-studentesc",
    title: "Complex Studențesc: cerere academică și sejururi business",
    text: "Analizează garsonierele și apartamentele compacte după apropierea de UVT — Universitatea de Vest, Politehnica Timișoara și UMF Medicină. O locație aproape de campus poate susține cererea pentru chirie clasică și pentru sejururi scurte, dar venitul trebuie testat și în vacanțele universitare. Verifică accesul la transport, zgomotul, parcarea și costul mobilării; nu presupune că orice apartament din Complex Studențesc are același tarif pe noapte.",
  },
  {
    slug: "cetate",
    title: "Cetate și Centru: atractivitate turistică, preț de intrare mai atent",
    text: "Pentru Cetate și Centru, compară prețul achiziției cu cererea turistică din Piața Unirii, Piața Victoriei și zona Catedralei Mitropolitane. Un apartament lângă Bega sau Parcul Central poate fi mai ușor de prezentat oaspeților, însă randamentul depinde de costul renovării, regulile clădirii și accesul la unitate. În calcul intră și perioadele cu ocupare redusă, nu doar weekendurile sau evenimentele cu tarife bune.",
  },
  {
    slug: "iosefin",
    title: "Iosefin, Elisabetin și Fabric: echilibru între locuire și oaspeți",
    text: "Iosefin și Elisabetin oferă clădiri cu identitate arhitecturală și acces spre centru; Fabric adaugă o combinație de zone rezidențiale și servicii locale. Pentru fiecare proprietate verifică dacă adresa este în apropiere de Parcul Rozelor, Parcul Botanic sau malul Begăi și cât de simplu se ajunge la Gara de Nord. Compară cererea pentru închiriere pe termen lung cu cea pentru regim hotelier, deoarece amenajarea și profilul chiriașilor pot fi diferite.",
  },
  {
    slug: "circumvalatiunii",
    title: "Circumvalațiunii și City of Mara: servicii, acces și costuri de ansamblu",
    text: "La apartamentele din Circumvalațiunii și City of Mara analizează dotările ansamblului, mentenanța și cererea pentru sejururi business. Proximitatea de Shopping City Timișoara, Parcul Rozelor și Universitatea de Vest poate conta pentru oaspeți, dar nu înlocuiește verificarea adresei exacte. Compară unități similare ca suprafață și mobilare și include în model costurile de administrare, curățenie, utilități și eventualele taxe de parcare.",
  },
  {
    slug: "zona-aradului",
    title: "Zona Aradului și Girocului: acces, business și proprietăți noi",
    text: "Pentru Zona Aradului verifică legătura cu Iulius Town, Openville și Aeroportul Timișoara, iar în Girocului analizează accesul spre Shopping City și serviciile pentru familii. Ansambluri precum Vivalia pot avea profiluri diferite de chiriași și costuri de întreținere. O adresă în vecinătatea unui hub de business nu garantează ocuparea: folosește timpul real de deplasare, dotările unității și tarifele comparabile din perioada analizată.",
  },
  {
    slug: "sagului",
    title: "Șagului, Calea Lipovei și zona metropolitană: raport preț–cerere",
    text: "Pe Calea Șagului și Calea Lipovei compară prețul de achiziție cu chiria clasică realizabilă și cu accesul la transport. În Dumbrăvița, Ghiroda, Moșnița Nouă, Remetea Mare, Chișoda și Săcălaz analizează separat casele și apartamentele, deoarece suprafața, parcarea și publicul vizat schimbă calculul. Pentru regim hotelier verifică dacă există cerere suficientă în afara sezonului; pentru chirie clasică urmărește lichiditatea și costul deplasării spre centru.",
  },
];

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const analysisZoneGuideHtml = ANALYSIS_ZONE_GUIDE.map((zone) => `
  <article>
    <h3>${escapeHtml(zone.title)}</h3>
    <p>${escapeHtml(zone.text)}</p>
    <p><a href="https://realtrust.ro/imobiliare-timisoara/${zone.slug}" tabindex="-1">Vezi analiza zonei și proprietățile disponibile</a></p>
  </article>
`).join("\n");

/**
 * Static counterpart of the visible homepage sections. It intentionally
 * mirrors useful on-page copy instead of adding crawler-only keyword lists.
 */
export const HOMEPAGE_PRERENDER_BODY = `
  <h2>Cum alegi serviciul RealTrust potrivit</h2>
  <p>RealTrust reunește intermedierea imobiliară, consultanța pentru investiții și administrarea proprietăților în Timișoara. Dacă vinzi sau cumperi, discuția pornește de la proprietate, buget, zonă și documente. Dacă închiriezi pe termen lung, stabilim profilul chiriașului, prețul și condițiile contractului. Dacă urmărești venit din regim hotelier, analizăm tariful pe noapte, ocuparea anuală asumată de 65–75%, costurile platformelor, utilitățile, menajul și administrarea. Fiecare recomandare separă datele verificate de ipotezele folosite în calcul.</p>
  <p>Pentru proprietarii care compară mai multe variante, <a href="${"https://realtrust.ro"}/calculator-randament" tabindex="-1">calculatorul de randament imobiliar</a> oferă un punct de plecare. Rezultatul este o estimare, nu o promisiune de încasare. Poți apoi solicita o evaluare gratuită pentru verificarea zonei, a suprafeței, a mobilierului și a costurilor concrete. Vizionările și consultanțele legate de o proprietate se fac la apartament sau prin discuție online; RealTrust nu invită clienții la un birou deschis publicului.</p>

  <h2>Zone analizate în Timișoara și criteriile care contează</h2>
  <p>Acoperim cerere și oferte din Complex Studențesc, Cetate și Centru, Iosefin, Elisabetin, Fabric, Take Ionescu, Soarelui, Dâmbovița, Tipografilor, Mehala, Torontalului, Ronat, Bucovina, Olimpia și zona Stadionului. Analiza nu folosește numele cartierului ca singur argument: comparăm suprafața, starea proprietății, accesul, parcarea, transportul și prețurile unităților similare. Pentru fiecare adresă verificăm ce funcționează mai bine între vânzare, chirie clasică și regim hotelier.</p>
  <p>În nord și în zonele cu dezvoltare rezidențială analizăm Calea Aradului, Calea Girocului, Calea Șagului, Circumvalațiunii și Calea Lipovei, împreună cu Plopi, Blașcovici și Freidorf. În zona metropolitană separăm proprietățile din Dumbrăvița, Ghiroda, Moșnița Nouă, Remetea Mare, Chișoda și Săcălaz, pentru că o casă cu teren nu se compară direct cu un apartament compact din centru. Aceeași distincție se aplică bugetului de amenajare, mentenanței și publicului vizat.</p>

  <h2>Proximitatea față de universități, business și transport</h2>
  <p>Pentru regim hotelier și închirieri, verificăm dacă proprietatea este aproape de UVT — Universitatea de Vest, Politehnica Timișoara sau UMF Medicină și dacă traseul real este simplu pentru oaspeți. O locuință lângă Iulius Town, Openville sau Vox Park poate interesa călătorii business; una în apropiere de Shopping City Timișoara poate fi potrivită pentru familii sau sejururi cu mașina. Acestea sunt criterii de analiză, nu afirmații valabile pentru fiecare proprietate din portofoliu.</p>
  <p>La evaluare luăm în calcul și accesul la Parcul Central, Parcul Rozelor, Parcul Botanic, Catedrala Mitropolitană și malul Begăi. Pentru sosiri și plecări verificăm legătura cu Aeroportul Timișoara și Gara de Nord, iar pentru sejururi medicale analizăm distanța față de Spitalul Județean. Nu afișăm timpi standard de deplasare pentru toate adresele: timpul se verifică de la locația exactă, cu transportul ales de vizitator.</p>

  <h2>Ansambluri rezidențiale și comparații utile pentru investitori</h2>
  <p>În analiza investițiilor comparam, atunci când există oferte relevante, apartamente din City of Mara, Ateneo, Fructus Plaza, Vivalia, Monarch, Nord One, X City Oasis, Vox Vertical Village, Uranus Plaza, Adora Forest și Iris. Paltim și alte ansambluri din oraș pot intra în aceeași comparație dacă tipologia și bugetul se potrivesc. Numele complexului nu este o garanție de randament: etajul, orientarea, mobilierul, parcarea, costurile asociației și calitatea fotografiilor influențează rezultatul.</p>
  <p>Pentru fiecare investiție prezentăm scenarii cu randament net estimat între 6,5% și 9,4% pe an, în funcție de ocupare, locație și amenajare. Calculul folosește implicit 70% ocupare, în intervalul anual asumat de 65–75%. Venitul net este prezentat după costurile explicate în calculator, iar administrarea este 15–20% din venitul net. Menajul rămâne separat, astfel încât proprietarul poate vedea ce plătește și de ce.</p>

  <h2>Administrare apartamente în regim hotelier prin ApArt Hotel</h2>
  <p>ApArt Hotel este brandul de cazare operat în cadrul RealTrust, cu activitate de administrare în regim hotelier din ${HOTEL_MANAGEMENT_SINCE}. Pregătirea unei proprietăți include evaluarea, recomandările de amenajare, fotografiile, descrierea, configurarea prețului și publicarea pe canalele potrivite. După activare, echipa gestionează rezervările, comunicarea cu oaspeții, check-in-ul, curățenia, mentenanța și raportarea lunară. Scorul consolidat de reputație este ${GUEST_SCORE_RO}/10 pe Booking, afișat pe aceeași scară în pagină și în datele structurate.</p>
  <p>Contractul de administrare este pe 12 luni, cu perioadă de probă de 90 de zile și preaviz de 30 de zile, conform condițiilor comunicate proprietarului. Comisionul de 15–20% se aplică venitului net, nu unei sume brute neprecizate. Înainte de semnare, proprietarul vede ce includ promovarea, operarea și raportarea și ce se facturează separat. Nu folosim promisiuni de ocupare maximă și nu transformăm un scenariu bun într-un rezultat garantat.</p>

  <h2>Proces clar pentru vânzare, cumpărare și închiriere</h2>
  <p>La vânzare începem cu evaluarea și verificarea documentelor, apoi stabilim pregătirea proprietății, materialele de prezentare și strategia de promovare. Cumpărătorii primesc informații despre zonă, costuri și pașii tranzacției, iar negocierea ține cont de starea reală a locuinței. La închiriere clarificăm durata, garanția, utilitățile, mobilierul și condițiile de predare. Comisioanele sunt comunicate înainte de colaborare, fără costuri ascunse adăugate ulterior.</p>
  <p>Experiența în imobiliare din ${REAL_ESTATE_SINCE} ajută la interpretarea diferențelor dintre cartiere, dar fiecare decizie se bazează pe proprietatea curentă. Pentru proprietarii care nu locuiesc în Timișoara, raportarea și discuțiile pot fi gestionate la distanță. Pentru cei care doresc o singură echipă, serviciile de achiziție, pregătire și administrare pot fi legate într-un proces comun, cu responsabilități explicate de la început.</p>

  <h2>Cum verifici o estimare de randament</h2>
  <p>O estimare serioasă arată prețul achiziției, bugetul de mobilare, tariful mediu, ocuparea, comisioanele canalelor, utilitățile, curățenia și administrarea. Compară cel puțin un scenariu prudent, unul standard și unul favorabil. Dacă rezultatul funcționează doar cu ocupare foarte ridicată sau cu un tarif greu de susținut, investiția necesită mai multă verificare. În pagina de <a href="${"https://realtrust.ro"}/analiza-roi-apartament" tabindex="-1">analiză a randamentului apartamentului</a> poți modifica ipotezele și poți observa cum se schimbă recuperarea capitalului.</p>
  <p>Pe lângă venitul anual, analizează lichiditatea zonei și posibilitatea de revânzare. O proprietate cu venit bun, dar preț de achiziție prea mare, poate recupera investiția mai greu decât o unitate mai simplă, cumpărată corect. De aceea recomandările RealTrust leagă cifrele de context: micro-zonă, ansamblu, suprafață, starea clădirii și obiectivul proprietarului.</p>

  <h2>Zone metropolitane și proprietăți pentru familii</h2>
  <p>Pentru case și apartamente din Dumbrăvița, Ghiroda, Moșnița Nouă, Remetea Mare, Chișoda și Săcălaz analizăm separat accesul auto, transportul, școlile, magazinele și timpul petrecut în deplasare. Familiile pot prioritiza spațiul și parcarea, în timp ce un investitor în regim hotelier are nevoie de cerere și de operare simplă. Din acest motiv nu folosim aceeași estimare pentru toate tipurile de proprietate și nu transferăm automat tarifele din centrul Timișoarei în zona metropolitană.</p>

  <h2>Cum compari două proprietăți înainte de decizie</h2>
  <p>Notează pentru fiecare variantă prețul total, suprafața utilă, starea, costurile lunare și venitul estimat în același scenariu. Apoi compară timpul de recuperare și riscul principal: o proprietate centrală poate avea un preț de intrare mai mare, în timp ce una metropolitană poate depinde mai mult de mașină și de cererea pentru tipul respectiv de locuință. Alegerea corectă este cea care rămâne sustenabilă și într-un scenariu prudent.</p>
  <p>Nu compara venitul brut al unei variante cu venitul net al celeilalte și nu scădea din calcul perioadele fără oaspeți sau fără chiriași. Pentru proprietățile administrate, verifică cine răspunde de rezervări, curățenie, mentenanță și raportare. Pentru cele vândute sau închiriate fără administrare, verifică ce costuri și responsabilități rămân la proprietar. O comparație transparentă arată atât avantajele, cât și limitările fiecărei opțiuni.</p>

  <h2>Contact și pașii următori</h2>
  <p>Poți începe cu o evaluare gratuită, un calcul de randament sau o discuție despre vânzare și închiriere. RealTrust și ApArt Hotel sunt operate de SC Imo Business Centrum SRL, iar contactul este disponibil non-stop la +40 799 069 256 și info@realtrust.ro. După primele informații, stabilim ce documente și fotografii sunt necesare și care este următorul pas potrivit pentru proprietatea ta.</p>
`;

/**
 * Static counterpart of the calculator, decision and local-zone sections on
 * /analiza-roi-apartament. Local content comes first because the auditor reads
 * a bounded leading excerpt, while the full body remains available to crawlers.
 */
export const ANALYSIS_PRERENDER_BODY = `
  <h2>Cum alegi zona în Timișoara pentru randament</h2>
  <p>Alegerea zonei pornește de la publicul care poate folosi apartamentul: studenți și cadre universitare, familii, profesioniști, turiști sau oaspeți business. Compară prețul de achiziție cu chiria clasică și cu tariful pe noapte susținut de proprietăți similare. Proximitatea este verificată pentru adresa exactă, nu dedusă doar din numele cartierului.</p>
  ${analysisZoneGuideHtml}

  <h2>Cum funcționează calculatorul de randament imobiliar</h2>
  <p>Calculatorul compară chiria clasică anuală cu venitul net estimat din regim hotelier. Introdu prețul achiziției, chiria lunară, tariful mediu pe noapte, ocuparea și aprecierea anuală presupusă. Valorile implicite sunt un punct de plecare: 125.000 euro pentru achiziție, 620 euro chirie lunară, 72 euro pe noapte, 70% ocupare și 6% apreciere. Poți modifica fiecare ipoteză pentru a vedea efectul asupra venitului, a recuperării capitalului și a ocupării de echilibru.</p>
  <p>Venitul hotelier brut rezultă din tariful pe noapte înmulțit cu numărul de nopți ocupate. Din acesta se scad costurile canalelor și utilitățile, apoi administrarea de 15–20% din venitul net. Menajul este separat. Rezultatul nu include promisiuni de apreciere și nu trebuie confundat cu o ofertă de cumpărare sau cu o prognoză garantată.</p>

  <h2>Costuri care schimbă profitul real al apartamentului</h2>
  <p>Prețul din anunț nu reprezintă întreaga investiție. Adaugă costul actelor, eventualele taxe, mobilarea, dotările, fotografiile și reparațiile inițiale. În exploatare apar utilitățile, internetul, mentenanța, consumabilele, curățenia și comisioanele canalelor de rezervare. Pentru o comparație corectă cu chiria clasică folosește aceeași perioadă și același nivel de costuri documentate.</p>
  <p>O unitate premium poate obține un tarif mai bun numai dacă diferența de încasare acoperă investiția suplimentară. De aceea analiza separă venitul operațional de aprecierea prețului proprietății. Recuperarea capitalului este prezentată ca scenariu și se schimbă atunci când modifici ocuparea, tariful sau creșterea anuală presupusă.</p>

  <h2>Scor investițional și reguli de decizie</h2>
  <p>Scorul de pe pagină combină randamentul net, ocuparea, aprecierea presupusă și diferența față de chiria clasică. Un rezultat de 82 sau mai mult indică un profil care merită analizat în detaliu; între 68 și 81 sunt utile negocierea și verificarea costurilor; sub 68 sunt necesare precauție și informații suplimentare. Scorul este un filtru de triere, nu o recomandare automată de cumpărare.</p>
  <p>Înainte de decizie verifică documentele, starea tehnică, costurile asociației, accesul, parcarea și posibilitatea de a folosi proprietatea așa cum ai planificat. Compară cel puțin trei variante de preț și ocupare. Dacă rezultatul devine negativ la o mică reducere a tarifului, riscul este mai mare decât arată scenariul standard.</p>

  <h2>Matrice de sensibilitate pentru ocupare și tarif</h2>
  <p>Matricea din pagină folosește ocupări de 65%, 70% și 75% și tarife de 60, 75 și 90 euro pe noapte. Astfel poți observa dacă venitul depinde prea mult de un singur parametru. Ocuparea anuală asumată de 65–75% nu înseamnă că fiecare lună are același rezultat: evenimentele, sezonul, competiția și calitatea recenziilor influențează rezervările.</p>
  <p>Folosește scenariul conservator pentru verificarea rezilienței investiției și scenariul standard pentru bugetare. Scenariul premium este util doar când proprietatea are dotări, poziționare și prezentare care justifică tariful. Randamentul net estimat comunicat de RealTrust rămâne în intervalul de 6,5–9,4% pe an, calculat cu ipotezele afișate.</p>

  <h2>Evoluția prețurilor și proiecția investiției</h2>
  <p>Graficul de evoluție prezintă serii orientative pentru segmente premium, centrale și metropolitane, iar proiecția combină valoarea estimată a proprietății cu venitul net anual. Aceste repere ajută la compararea scenariilor, dar nu înlocuiesc o evaluare actuală. Pentru o decizie reală verifică tranzacții și oferte comparabile din aceeași micro-zonă și dintr-o perioadă apropiată.</p>
  <p>Aprecierea capitalului are incertitudine separată de venitul din închiriere. O creștere anuală introdusă în calculator nu este o promisiune de revânzare la acel preț. Analizează și lichiditatea: numărul de proprietăți similare, timpul estimat de vânzare și diferența posibilă dintre prețul afișat și cel acceptat.</p>

  <h2>Checklist înainte de achiziție</h2>
  <p>Verifică suprafața utilă, compartimentarea, etajul, liftul, orientarea, lumina, zgomotul și calitatea finisajelor. Cere informații despre clădire, asociație, utilități și parcare. Pentru regim hotelier analizează accesul oaspeților, spațiul pentru bagaje, paturile, aerul condiționat, internetul și posibilitatea de curățenie eficientă. Pentru chirie clasică contează mai mult predictibilitatea costurilor și potrivirea cu profilul chiriașului.</p>
  <p>Documentează bugetul total înainte de negociere. Include mobilierul și o rezervă pentru reparații, apoi recalculează randamentul cu prețul final. Dacă proprietatea necesită o investiție mare, compară alternativa unei unități mai scumpe la achiziție, dar mai bine pregătite pentru exploatare.</p>

  <h2>Complexe și micro-zone pe care le poți compara</h2>
  <p>Pe lângă zonele descrise mai sus, analiza poate include City of Mara, Ateneo, Fructus Plaza, Vivalia, Monarch, Nord One, X City Oasis, Vox Vertical Village, Uranus Plaza, Adora Forest, Iris și Paltim. Compară unități cu suprafață și dotări apropiate și verifică ce include prețul: mobilier, loc de parcare, boxă sau taxe de ansamblu. O ofertă aparent mai ieftină poate avea costuri ulterioare care reduc randamentul.</p>
  <p>Pentru sejururi business analizează accesul la Iulius Town, Openville și Vox Park. Pentru cerere academică urmărește UVT, Politehnica și UMF; pentru turism, Piața Unirii, Piața Victoriei, Catedrala Mitropolitană și Bega. Parcul Central, Parcul Rozelor, Shopping City Timișoara, Aeroportul Timișoara, Gara de Nord și Spitalul Județean sunt repere utile numai după verificarea traseului de la proprietate.</p>

  <h2>Riscuri pe care analiza trebuie să le facă vizibile</h2>
  <p>Un preț peste comparabile poate reduce ani de profit, iar o amenajare greu de diferențiat poate limita tariful pe noapte. Costurile operaționale ignorate produc un randament artificial de mare. Alte riscuri sunt concentrarea rezervărilor într-un singur canal, lipsa unei rezerve pentru mentenanță și estimarea veniturilor numai din perioadele aglomerate.</p>
  <p>RealTrust poate verifica proprietatea și poate construi un scenariu adaptat obiectivului tău: cashflow lunar, apreciere sau revânzare. După calcul, folosește catalogul de investiții pentru comparații și pagina pieței imobiliare pentru context. Pentru validarea cifrelor concrete poți solicita o evaluare gratuită, fără a transforma estimarea într-un angajament de câștig.</p>

  <h2>Întrebări utile înainte de investiție</h2>
  <p>Care este costul total până când apartamentul poate produce venit? Ce chirie sau tarif pe noapte susțin proprietățile comparabile? Cum arată rezultatul la 65% ocupare? Ce costuri apar lunar și care sunt variabile? Cât de ușor poate fi revândută proprietatea? Răspunsurile la aceste întrebări oferă o imagine mai bună decât un singur procent afișat fără explicații.</p>
`;
