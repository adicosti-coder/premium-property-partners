/**
 * Extended, zone-specific editorial profiles for the neighborhood pages
 * (/imobiliare-timisoara/:zona).
 *
 * WHY A SEPARATE FILE
 * `src/data/neighborhoods.ts` holds the short marketing summary, price index,
 * mock listings and FAQ used by cards and schema. This file adds the long-form
 * local content required for E-E-A-T: how the area actually feels, who it suits,
 * access, amenities, housing stock, pros/cons, a pre-purchase checklist,
 * investment potential and risks.
 *
 * EDITORIAL RULES (do not break)
 *  - Only verifiable, zone-specific facts: geography, transport corridors, real
 *    landmarks, the era/type of the housing stock, real developments.
 *  - No invented statistics, transactions, clients, ratings or certifications.
 *  - Every figure that is not a published RealTrust assumption is labelled as
 *    an internal estimate ("estimare internă RealTrust"), including the price
 *    index which comes from src/data/neighborhoods.ts.
 *  - Published RealTrust assumptions that may be repeated: 9,4% randament net
 *    de referință, ocupare 75%, deducere operațională 27%, 15 apartamente
 *    administrate.
 *  - Structure and wording must differ between zones — no template paragraphs.
 */

export interface ProfileSection {
  heading: string;
  paragraphs: string[];
}

export interface NeighborhoodProfile {
  /** Matches NeighborhoodData.slug */
  slug: string;
  /** 40–100 word standalone answer, extractable by AI engines. */
  geoQuestion: string;
  geoAnswer: string;
  sections: ProfileSection[];
  pros: string[];
  cons: string[];
  /** "Ce verifici înainte de cumpărare" */
  checklist: string[];
  investment: string[];
  risks: string[];
}

export const neighborhoodProfiles: NeighborhoodProfile[] = [
  /* ═══════════════════════════ ISHO & FABRIC ═══════════════════════════ */
  {
    slug: "isho",
    geoQuestion: "Cum este zona ISHO – Fabric din Timișoara?",
    geoAnswer:
      "ISHO este un ansamblu mixed-use ridicat pe fosta platformă industrială UMT, pe malul Begăi, la marginea cartierului Fabric. Include apartamente, birouri, spații comerciale și restaurante într-un perimetru compact, pietonal, la aproximativ 10–15 minute de mers pe jos de Piața Unirii. Este zona cu cele mai mari prețuri pe metru pătrat din Timișoara și atrage în principal angajați din IT și servicii, expați și oaspeți în tranzit de business.",
    sections: [
      {
        heading: "Cum este zona",
        paragraphs: [
          "ISHO nu este un cartier istoric, ci un ansamblu construit în etape pe terenul fostei platforme industriale de pe malul stâng al Begăi, în continuarea cartierului Fabric. Rezultatul este un microcartier cu densitate mare, arhitectură contemporană, alei interioare pietonale și parter comercial activ — o experiență urbană diferită de restul Timișoarei, unde locuințele noi apar de obicei izolat, în extensii de la marginea orașului.",
          "Contrastul cu Fabricul propriu-zis este parte din identitatea zonei: la câteva minute de blocurile de sticlă începe țesutul de clădiri de secol XIX–XX, cu fabrica de bere, sinagoga din Fabric și piața Traian. Pentru un cumpărător, asta înseamnă că poți alege între locuință nouă cu servicii la parter și imobil istoric la câteva străzi distanță, în același perimetru.",
          "Traficul auto este cel mai vizibil punct sensibil. Accesul se face pe artere care se aglomerează la orele de vârf, iar parcarea la suprafață este limitată în interiorul ansamblului — locurile de parcare sunt în general subterane și se vând sau se închiriază separat.",
        ],
      },
      {
        heading: "Pentru cine este potrivită",
        paragraphs: [
          "Profilul dominant este cel al angajatului din IT, servicii corporate sau industrii creative care vrea să locuiască aproape de birou și să nu depindă de mașină. A doua categorie este cea a investitorilor care caută unități ușor de închiriat, fie pe termen lung către chiriași cu venituri peste medie, fie în regim hotelier către oaspeți de business.",
          "Este mai puțin potrivită pentru familii care pun accent pe curte, liniște și grădiniță/școală la câțiva pași: densitatea este mare, iar spațiile verzi generoase încep abia pe malul Begăi și în parcurile din centru.",
        ],
      },
      {
        heading: "Acces și mobilitate",
        paragraphs: [
          "Centrul istoric este accesibil pe jos, pe traseul de-a lungul Begăi — cel mai predictibil mijloc de deplasare din zonă. Transportul public de pe arterele Fabricului acoperă legătura cu Piața Traian, centrul și gara, iar pistele de biciclete de pe malul canalului fac legătura cu Iulius Town și cu Cetate.",
          "Pentru deplasările cu mașina, ieșirea spre inelul de circulație și spre autostrada A1 trece prin zone care se blochează dimineața și seara. Un test util înainte de cumpărare: parcurge traseul spre locul tău de muncă la ora 8:30, nu la 11:00.",
        ],
      },
      {
        heading: "Servicii și puncte de interes",
        paragraphs: [
          "În interiorul ansamblului există restaurante, cafenele, spații de birouri, sală de fitness și magazine de proximitate — o parte din motivele pentru care zona funcționează și fără mașină. La scurtă distanță se află Piața Traian, malul Begăi cu promenada și parcurile care leagă Fabricul de centru.",
          "RealTrust administrează unități în perimetrul ISHO și în zona Fabric, deci datele operaționale pe care le folosim în discuțiile cu proprietarii din această zonă provin din apartamente reale, nu din estimări de piață generale.",
        ],
      },
      {
        heading: "Ce tip de proprietăți găsești",
        paragraphs: [
          "Oferta este dominată de apartamente noi, de la studiouri de 30–40 mp până la unități de 3–4 camere și penthouse-uri, în clădiri cu lift, izolație recentă și parcare subterană. Compartimentările sunt în mare parte semidecomandate sau open-space, cu bucătărie deschisă spre living — atractiv pentru chiriași tineri, mai puțin pentru familiile care vor bucătărie separată.",
          "În Fabricul învecinat apar apartamente în clădiri interbelice și case, cu suprafețe și înălțimi generoase, dar și cu nevoi de renovare structurală și de instalații. Cele două categorii nu se compară direct nici la preț, nici la costuri de întreținere.",
        ],
      },
    ],
    pros: [
      "Ansamblu compact, pietonal, cu servicii la parter — se poate locui fără mașină.",
      "Distanță pe jos până în centrul istoric, pe promenada Begăi.",
      "Clădiri recente: lift, izolație, parcare subterană, costuri de întreținere previzibile.",
      "Cerere constantă de închiriere din partea angajaților din IT și servicii.",
    ],
    cons: [
      "Cel mai ridicat preț pe metru pătrat din oraș, conform indicelui nostru intern de zonă.",
      "Densitate mare și spații verzi limitate în interiorul ansamblului.",
      "Trafic dificil la orele de vârf pe arterele de acces.",
      "Locurile de parcare se tranzacționează separat și pot lipsi la unitățile revândute.",
    ],
    checklist: [
      "Verifică dacă locul de parcare este inclus în act sau se vinde separat.",
      "Cere fondul de rulment și cheltuielile lunare reale de administrare pentru apartamentul respectiv.",
      "Verifică orientarea și nivelul de zgomot dinspre arterele de acces, la ore diferite.",
      "Confirmă recepția la terminare și eventualele lucrări neterminate în etapa respectivă a ansamblului.",
      "Pentru regim hotelier: verifică regulamentul asociației privind închirierea pe termen scurt.",
    ],
    investment: [
      "Argumentul investițional al zonei este cererea dublă: chiriași pe termen lung cu venituri peste medie și oaspeți de business care vor să fie aproape de birouri și de centru. Acest mix reduce dependența de sezon, o problemă reală pentru unitățile poziționate exclusiv turistic.",
      "Contraargumentul este prețul de intrare. La un preț pe metru pătrat mai mare, randamentul net depinde de capacitatea de a susține un tarif mediu pe noapte peste media orașului. În analizele noastre pornim de la ipoteze publice — ocupare 75% și o deducere operațională de 27% — și verificăm dacă tariful realizabil susține pragul de referință de 9,4% net; la ISHO acest prag se atinge mai des cu unități mici, bine amenajate, decât cu apartamente mari.",
    ],
    risks: [
      "Concentrare mare de unități similare în același perimetru: presiune pe tarif în lunile slabe.",
      "Preț de achiziție ridicat, deci sensibilitate mai mare la o corecție de piață.",
      "Posibile restricții de regulament privind închirierea pe termen scurt.",
    ],
  },

  /* ═══════════════════════ CIRCUMVALAȚIUNII ═══════════════════════ */
  {
    slug: "circumvalatiunii",
    geoQuestion: "Cum este zona Circumvalațiunii din Timișoara?",
    geoAnswer:
      "Circumvalațiunii este o arteră de legătură din nordul Timișoarei, între zona Gării de Nord și Calea Aradului, cu blocuri construite majoritar în anii '70–'80 și ansambluri noi inserate între ele. Zona are transport public dens, comerț de proximitate matur și acces rapid la Iulius Town și la Universitatea de Vest. Este una dintre zonele cu cerere constantă atât de chirie clasică, cât și de cazare pe termen scurt.",
    sections: [
      {
        heading: "Cum este zona",
        paragraphs: [
          "Circumvalațiunii funcționează ca un inel: nu este un cartier cu limite clare, ci o arteră lungă pe care se înșiră grupuri de blocuri, unități comerciale la parter și, în ultimii ani, ansambluri rezidențiale noi ridicate pe loturi rămase libere. Rezultatul este un amestec de fond locativ vechi consolidat și clădiri recente, uneori pe aceeași stradă.",
          "Avantajul practic al acestei configurații este maturitatea infrastructurii: rețelele, transportul public, școlile și magazinele existau deja înainte ca dezvoltările noi să apară. Dezavantajul este eterogenitatea: calitatea vecinătății imediate poate diferi semnificativ de la un tronson la altul.",
        ],
      },
      {
        heading: "Pentru cine este potrivită",
        paragraphs: [
          "Zona se potrivește cumpărătorilor care vor să fie aproape de centru fără să plătească prețurile din Cetate, familiilor care au nevoie de școli și magazine la câteva minute, dar și studenților și tinerilor angajați, datorită legăturilor rapide cu universitățile și cu Iulius Town.",
          "Pentru investitori, atracția principală este lichiditatea: apartamentele de 2 camere din această zonă sunt printre cele mai ușor de închiriat și de revândut, pentru că adresează simultan mai multe categorii de chiriași.",
        ],
      },
      {
        heading: "Acces și mobilitate",
        paragraphs: [
          "Artera este deservită de tramvai și autobuz pe cea mai mare parte a traseului, iar legătura cu Gara Timișoara Nord, cu Piața Victoriei și cu zona universitară se face fără schimbări complicate. Ieșirea spre Calea Aradului și spre A1 este directă.",
          "Traficul este intens pe tronsoanele apropiate de intersecțiile majore, iar parcarea în fața blocurilor vechi este subdimensionată — un punct de verificat pentru cine se mută cu două mașini sau intenționează să ofere parcare oaspeților.",
        ],
      },
      {
        heading: "Servicii și puncte de interes",
        paragraphs: [
          "Zona are comerț de proximitate dens (supermarketuri, farmacii, cabinete), Bega Shopping Center pe traseu, Parcul Rozelor și zona universitară la scurtă distanță, plus acces rapid la Iulius Town. Pentru oaspeți, combinația „supermarket la 3 minute + tramvai spre centru” este exact ce caută călătoriile de business scurte.",
          "Complexul City of Mara, aflat pe această arteră, este unul dintre ansamblurile din care RealTrust administrează unități — datele de ocupare pe care le folosim pentru zonă provin din operarea acestor apartamente.",
        ],
      },
      {
        heading: "Ce tip de proprietăți găsești",
        paragraphs: [
          "Majoritatea fondului este format din apartamente de 2 și 3 camere în blocuri de patru și zece etaje, ridicate în anii '70–'80, multe cu termoizolație adăugată ulterior și cu instalații înlocuite parțial. Peste acest fond se suprapun apartamente noi în ansambluri recente, cu parcare subterană și lift modern.",
          "Diferența de preț dintre un apartament vechi renovat și unul nou din același tronson este de obicei mai mică decât diferența de cost lunar de întreținere — un calcul care merită făcut înainte de decizie.",
        ],
      },
    ],
    pros: [
      "Transport public dens și legături directe cu centrul, gara și zona universitară.",
      "Infrastructură comercială și educațională matură, nu în curs de dezvoltare.",
      "Lichiditate bună la revânzare pentru apartamentele de 2 camere.",
      "Cerere mixtă: studenți, tineri angajați, familii, oaspeți de business.",
    ],
    cons: [
      "Trafic și zgomot pe tronsoanele apropiate de intersecțiile mari.",
      "Parcare insuficientă la blocurile construite înainte de 1990.",
      "Calitate a vecinătății foarte variabilă de la un tronson la altul.",
    ],
    checklist: [
      "Verifică anul construcției blocului și dacă instalațiile de apă și canalizare au fost înlocuite.",
      "Cere ultima factură de întreținere și situația restanțelor asociației.",
      "Verifică expunerea la zgomot dinspre arteră, cu geamurile deschise.",
      "Confirmă existența unui loc de parcare utilizabil, nu doar disponibil teoretic.",
      "Pentru regim hotelier: verifică accesul independent și acordul asociației.",
    ],
    investment: [
      "Zona este atractivă pentru investiție prin combinația dintre preț de intrare moderat și cerere constantă. Un apartament de 2 camere aici are, în practica noastră, cel mai scurt interval între listare și primul chiriaș sau prima rezervare, tocmai pentru că adresează mai multe categorii simultan.",
      "Pentru regim hotelier, argumentul este proximitatea de Iulius Town, de zona universitară și de arterele de acces — util pentru șederi de 1–3 nopți. Calculele pornesc de la ipotezele publice de ocupare 75% și deducere de 27%; pragul de referință de 9,4% net este realist pentru unități mici, complet mobilate, cu check-in independent.",
    ],
    risks: [
      "Fond locativ vechi: costuri neprevăzute la instalații și fațadă.",
      "Presiune competitivă din partea ansamblurilor noi construite pe aceeași arteră.",
      "Sensibilitate la calendarul universitar pentru chiria clasică pe termen lung.",
    ],
  },

  /* ═══════════════════════════ CALEA ARADULUI ═══════════════════════════ */
  {
    slug: "zona-aradului",
    geoQuestion: "Cum este zona Calea Aradului din Timișoara?",
    geoAnswer:
      "Calea Aradului este axa nordică a Timișoarei, care leagă centrul de ieșirea spre Arad și de Aeroportul Internațional Timișoara. Concentrează campusuri universitare, Iulius Town și o densitate mare de birouri, iar fondul locativ combină blocuri mai vechi cu ansambluri noi ridicate în ultimul deceniu. Este una dintre zonele cu cea mai stabilă cerere de închiriere din oraș, datorită studenților și angajaților din servicii.",
    sections: [
      {
        heading: "Cum este zona",
        paragraphs: [
          "Spre deosebire de cartierele istorice, Calea Aradului se citește ca un coridor: pornește din apropierea centrului și urcă spre nord, adunând pe traseu campusuri, comerț mare, birouri și, la extremitate, ieșirea spre autostradă și spre aeroport. Această liniaritate influențează totul — de la trafic până la prețuri, care scad pe măsură ce te depărtezi de oraș.",
          "Segmentul apropiat de Iulius Town și de universități este cel mai dens și cel mai scump; segmentul dinspre ieșirea din oraș este mai aerisit, cu dezvoltări noi și cu dependență mai mare de mașină.",
        ],
      },
      {
        heading: "Pentru cine este potrivită",
        paragraphs: [
          "Este zona firească pentru cine lucrează în birourile din nordul orașului sau studiază la universitățile de pe traseu: naveta se face pe distanțe scurte, adesea pe bicicletă. Pentru familii, atracția este oferta de locuințe noi la prețuri mai mici decât în Cetate, cu școli și comerț la distanță rezonabilă.",
          "Pentru investitori, este una dintre puținele zone unde cererea vine simultan din trei surse independente: studenți, angajați corporate și călători de business care aterizează la Timișoara.",
        ],
      },
      {
        heading: "Acces și mobilitate",
        paragraphs: [
          "Legătura cu centrul se face cu tramvai și autobuz pe artera principală, iar accesul rutier spre A1 și spre aeroport este cel mai direct din oraș. Pentru oaspeți care sosesc cu avionul, timpul de transfer este un avantaj concret față de cazările din sud.",
          "Contrapartida este congestia: dimineața spre centru și seara spre nord, artera se blochează. Cine cumpără aici ar trebui să testeze traseul zilnic la ore de vârf, în ambele sensuri.",
        ],
      },
      {
        heading: "Servicii și puncte de interes",
        paragraphs: [
          "Pe traseu se află Iulius Town cu comerț, birouri și restaurante, campusurile universitare, spații verzi și baze sportive, plus retail de mari dimensiuni spre ieșirea din oraș. Aeroportul internațional este la câteva minute cu mașina de segmentul nordic.",
          "Zona Aradului este una dintre zonele pe care le prioritizăm pentru administrare, alături de Cetate/Centru, Iosefin, Fabric și Dumbrăvița, tocmai din cauza acestei diversități de cerere.",
        ],
      },
      {
        heading: "Ce tip de proprietăți găsești",
        paragraphs: [
          "Găsești atât apartamente în blocuri ridicate înainte de 1990, aproape de segmentul central, cât și ansambluri noi cu parcare subterană spre nord. Studiourile și apartamentele de 2 camere domină oferta destinată închirierii, în timp ce spre marginea orașului apar unități mai mari și case.",
          "Diferența dintre două apartamente aparent similare vine aici aproape întotdeauna din distanța până la stația de transport și din poziția față de campus — două criterii care contează mai mult decât finisajele pentru chiriașul tipic al zonei.",
        ],
      },
    ],
    pros: [
      "Cel mai bun acces din oraș spre aeroport și spre autostrada A1.",
      "Cerere de închiriere din trei surse independente: universități, birouri, business travel.",
      "Ofertă amplă de locuințe noi la prețuri sub nivelul zonei centrale.",
      "Iulius Town și campusurile universitare pe același traseu.",
    ],
    cons: [
      "Congestie pronunțată la orele de vârf pe artera principală.",
      "Zonă liniară: calitatea depinde puternic de tronsonul exact.",
      "Segmentul nordic este dependent de mașină pentru viața de zi cu zi.",
    ],
    checklist: [
      "Măsoară distanța reală de mers pe jos până la cea mai apropiată stație de transport.",
      "Verifică stadiul de finalizare al infrastructurii pe tronsoanele nou dezvoltate (trotuare, iluminat, canalizare).",
      "Cere costurile lunare de întreținere pentru ansamblurile noi, inclusiv taxele pentru spații comune.",
      "Testează traseul spre locul de muncă la orele 8:30 și 17:30.",
      "Pentru regim hotelier: verifică dacă unitatea are parcare proprie — oaspeții de business o cer frecvent.",
    ],
    investment: [
      "Investițional, zona este apreciată pentru stabilitatea cererii, nu pentru randamente spectaculoase. Fluxul de studenți asigură ocupare în perioada universitară, iar birourile și aeroportul acoperă parțial lunile de vacanță — motivul pentru care sezonalitatea este mai puțin brutală decât în zonele exclusiv turistice.",
      "În simulările pe care le facem pentru proprietari folosim aceleași ipoteze publice (ocupare 75%, deducere operațională 27%) și un prag de referință de 9,4% net. Pe Calea Aradului, unitățile care ating acest prag sunt de regulă studiourile și apartamentele de 2 camere aflate la mai puțin de 10 minute pe jos de un campus sau de Iulius Town.",
    ],
    risks: [
      "Ofertă nouă abundentă: risc de suprasaturare pe anumite tronsoane.",
      "Dependență de calendarul universitar pentru o parte a cererii.",
      "Diferențe mari de calitate a infrastructurii între tronsoane recent dezvoltate.",
    ],
  },

  /* ═══════════════════════════ CALEA ȘAGULUI ═══════════════════════════ */
  {
    slug: "sagului",
    geoQuestion: "Cum este zona Calea Șagului din Timișoara?",
    geoAnswer:
      "Calea Șagului este axa sud-vestică a Timișoarei, orientată spre parcurile industriale și logistice de la ieșirea spre Șag și Moravița. Fondul locativ este dominat de blocuri din anii '70–'80, cu inserții de locuințe noi, iar prețurile pe metru pătrat sunt sub media orașului. Cererea de închiriere vine în special din partea angajaților din producție, logistică și retail care lucrează în vecinătate.",
    sections: [
      {
        heading: "Cum este zona",
        paragraphs: [
          "Calea Șagului este o zonă de locuit strâns legată de economia reală a orașului: pe direcția ei se află o parte importantă a platformelor industriale și logistice ale Timișoarei, plus retail de mari dimensiuni. Asta îi dă un caracter practic — mai puțin spectaculos decât Cetate sau ISHO, dar cu o funcție clară.",
          "Pe tronsoanele apropiate de centru, țesutul este de bloc dens cu comerț la parter. Spre ieșirea din oraș apar hale, showroom-uri și dezvoltări rezidențiale mai noi, cu densitate mai mică.",
        ],
      },
      {
        heading: "Pentru cine este potrivită",
        paragraphs: [
          "Se potrivește cumpărătorilor cu buget limitat care vor un apartament în oraș, nu în comună, și celor care lucrează în zonele industriale din sud-vest — pentru ei, naveta este de minute, nu de jumătate de oră.",
          "Pentru investitorii care mizează pe chirie clasică pe termen lung, zona are un argument solid: cererea de la angajați care preferă să locuiască aproape de locul de muncă este constantă și mai puțin sezonieră decât cererea studențească.",
        ],
      },
      {
        heading: "Acces și mobilitate",
        paragraphs: [
          "Artera este deservită de tramvai și autobuz spre centru, iar ieșirea spre drumul național spre Moravița se face direct. Pentru transport de marfă și navetă industrială, poziția este printre cele mai bune din oraș.",
          "Pentru cine lucrează în nordul orașului, însă, traversarea Timișoarei dinspre Șagului este lungă la ore de vârf — un detaliu care schimbă complet evaluarea zonei în funcție de angajator.",
        ],
      },
      {
        heading: "Servicii și puncte de interes",
        paragraphs: [
          "Zona are supermarketuri și retail de mari dimensiuni pe traseu, școli și grădinițe în interiorul cartierelor de blocuri, cabinete medicale și comerț de proximitate matur. Spațiile verzi sunt punctuale, în interiorul ansamblurilor de blocuri, nu concentrate într-un parc mare.",
          "Pentru cazare pe termen scurt, cererea este orientată spre călătorii de lucru legați de firmele din vecinătate, nu spre turismul de weekend din centrul istoric.",
        ],
      },
      {
        heading: "Ce tip de proprietăți găsești",
        paragraphs: [
          "Predomină apartamentele de 2 și 3 camere în blocuri de patru etaje și în blocuri-turn din anii '70–'80, multe cu termoizolație aplicată ulterior. Garsonierele sunt relativ puține raportat la cerere, ceea ce le menține atractive pentru închiriere.",
          "Locuințele noi apar în proiecte de dimensiuni mici și medii, mai ales spre marginea zonei; ele aduc lift, parcare și costuri de întreținere previzibile, la un preț sensibil mai mare decât fondul vechi.",
        ],
      },
    ],
    pros: [
      "Preț de intrare sub media orașului, conform indicelui nostru intern de zonă.",
      "Navetă foarte scurtă pentru cei care lucrează în platformele industriale din sud-vest.",
      "Retail mare și comerț de proximitate pe traseu.",
      "Cerere de chirie clasică puțin sezonieră.",
    ],
    cons: [
      "Atractivitate turistică redusă: potențial mai mic pentru regim hotelier.",
      "Traversarea orașului spre nord este consumatoare de timp la ore de vârf.",
      "Fond locativ preponderent vechi, cu nevoi de modernizare.",
    ],
    checklist: [
      "Verifică izolația termică și tâmplăria — impact direct pe costurile de iarnă.",
      "Cere istoricul lucrărilor asociației (bloc reabilitat, instalații, acoperiș).",
      "Verifică expunerea la trafic greu pe tronsonul respectiv.",
      "Confirmă existența școlii/grădiniței de care ai nevoie, cu locurile disponibile.",
      "Pentru închiriere: verifică ce angajatori mari sunt efectiv în vecinătate.",
    ],
    investment: [
      "Aici logica investițională este inversă celei din centru: nu tarif mare pe noapte, ci preț de achiziție mic și chiriaș stabil pe termen lung. Un apartament de 2 camere cumpărat sub media orașului și închiriat unui angajat din zonă produce un flux previzibil, cu cheltuieli de operare reduse.",
      "Pentru regim hotelier, zona funcționează selectiv — doar acolo unde există un angajator mare în apropiere care generează vizite de lucru. Pragul nostru de referință de 9,4% net (la ocupare 75% și deducere operațională 27%) este mai greu de atins aici prin cazare pe termen scurt decât prin chirie clasică bine negociată.",
    ],
    risks: [
      "Dependență de câțiva angajatori mari din vecinătate.",
      "Cerere turistică slabă, deci flexibilitate redusă între modele de închiriere.",
      "Costuri de renovare mai mari la fondul locativ vechi neizolat.",
    ],
  },

  /* ═══════════════════════════ CALEA LIPOVEI ═══════════════════════════ */
  {
    slug: "calea-lipovei",
    geoQuestion: "Cum este zona Calea Lipovei din Timișoara?",
    geoAnswer:
      "Calea Lipovei este o zonă rezidențială din nord-vestul Timișoarei, formată în principal din cartiere de blocuri construite în anii '70–'80, cu spații verzi între imobile și comerț de proximitate. Este apropiată de zona universitară și de nordul orașului, iar prețurile pe metru pătrat sunt printre cele mai accesibile din oraș. Cererea vine mai ales de la familii tinere și de la chiriași pe termen lung.",
    sections: [
      {
        heading: "Cum este zona",
        paragraphs: [
          "Calea Lipovei are caracterul unui cartier de locuit clasic: blocuri așezate în ansambluri cu spații verzi între ele, alei interioare, magazine mici la parter și o viață de cartier previzibilă. Nu este o zonă de destinație — oamenii ajung aici pentru că locuiesc, nu pentru că vizitează.",
          "Această liniște este principalul activ al zonei. În schimb, densitatea comercială și de servicii este mai mică decât pe Circumvalațiunii sau pe Calea Aradului, iar fondul locativ este în majoritate vechi.",
        ],
      },
      {
        heading: "Pentru cine este potrivită",
        paragraphs: [
          "Se potrivește familiilor tinere care caută primul apartament la un preț rezonabil, cu grădiniță și școală la câteva minute, și cumpărătorilor care preferă un cartier liniștit în locul unei artere aglomerate.",
          "Pentru investitori, este o zonă de chirie clasică, nu de cazare pe termen scurt: chiriașul tipic stă mai mult, iar rotația este mică.",
        ],
      },
      {
        heading: "Acces și mobilitate",
        paragraphs: [
          "Legătura cu centrul și cu zona universitară se face cu tramvai și autobuz, cu timpi rezonabili în afara orelor de vârf. Accesul rutier spre nord-vestul orașului este simplu, iar traficul din interiorul cartierului este redus, pentru că nu este o zonă de tranzit intens.",
          "Distanța de mers pe jos până în centrul istoric este prea mare pentru rutina zilnică, deci mobilitatea depinde de transportul public sau de mașină.",
        ],
      },
      {
        heading: "Servicii și puncte de interes",
        paragraphs: [
          "Zona are supermarketuri, farmacii, cabinete medicale, școli și grădinițe, plus spații verzi și locuri de joacă între blocuri. Baza sportivă și zonele de plimbare din nord-vestul orașului sunt la scurtă distanță.",
          "Pentru cazare pe termen scurt, absența unor generatori de trafic (universitate în imediata apropiere, mall, centru istoric) limitează cererea — un factor care trebuie asumat înainte de a cumpăra aici pentru regim hotelier.",
        ],
      },
      {
        heading: "Ce tip de proprietăți găsești",
        paragraphs: [
          "Oferta este dominată de apartamente de 2 și 3 camere în blocuri de patru etaje, cu suprafețe compacte și compartimentări semidecomandate sau decomandate. O parte a blocurilor a fost reabilitată termic, ceea ce face diferența la costurile de iarnă.",
          "Locuințele noi sunt puține și apar în proiecte mici; ele se vând la un preț apropiat de zonele mai centrale, ceea ce reduce avantajul de preț al zonei.",
        ],
      },
    ],
    pros: [
      "Preț de achiziție accesibil raportat la restul orașului.",
      "Cartier liniștit, cu spații verzi între blocuri și trafic intern redus.",
      "Școli, grădinițe și comerț de proximitate în interiorul cartierului.",
      "Rotație mică a chiriașilor pe termen lung.",
    ],
    cons: [
      "Potențial slab pentru cazare pe termen scurt: lipsesc generatorii de trafic.",
      "Fond locativ preponderent construit înainte de 1990.",
      "Densitate mai mică de servicii comparativ cu arterele mari din nord.",
    ],
    checklist: [
      "Verifică dacă blocul a fost reabilitat termic și cine a suportat costul.",
      "Cere nivelul cheltuielilor de întreținere pentru o lună de iarnă.",
      "Verifică starea instalațiilor comune (coloane de apă, canalizare).",
      "Confirmă situația juridică a locului de parcare din fața blocului.",
      "Pentru investiție: estimează chiria realizabilă pe baza anunțurilor active din același cartier, nu din zone vecine.",
    ],
    investment: [
      "Zona este potrivită pentru o strategie conservatoare: preț de intrare mic, chirie stabilă, cheltuieli de operare reduse. Randamentul brut raportat la prețul de achiziție poate fi competitiv, chiar dacă chiria nominală este mai mică decât în centru.",
      "Pentru regim hotelier, recomandarea noastră este prudență: fără un generator de cerere în apropiere, ocuparea de referință de 75% este greu de susținut, iar pragul de 9,4% net devine improbabil. Preferăm să spunem asta direct, în loc să prezentăm o simulare optimistă.",
    ],
    risks: [
      "Lichiditate mai lentă la revânzare decât în zonele centrale.",
      "Cerere de cazare pe termen scurt insuficientă pentru un model hotelier stabil.",
      "Costuri de modernizare la apartamentele nerenovate.",
    ],
  },

  /* ═══════════════════════ COMPLEX STUDENȚESC ═══════════════════════ */
  {
    slug: "complex-studentesc",
    geoQuestion: "Cum este zona Complexul Studențesc din Timișoara?",
    geoAnswer:
      "Complexul Studențesc este zona din sudul centrului Timișoarei care grupează campusurile universitare, căminele studențești și o densitate mare de baruri, terase și restaurante. Este la 10–15 minute de mers pe jos de Piața Victoriei, cu transport public frecvent. Cererea de închiriere este cea mai intensă din oraș în perioada universitară, iar viața de noapte activă este simultan principalul atu și principalul dezavantaj al zonei.",
    sections: [
      {
        heading: "Cum este zona",
        paragraphs: [
          "Complexul Studențesc este singura zonă din Timișoara construită în jurul unei singure funcții: universitatea. Căminele, facultățile, bibliotecile, cantinele și zona de baruri formează un ecosistem compact, cu un ritm dictat de calendarul academic — plin din octombrie până în iunie, mult mai gol în vară.",
          "Concentrarea de terase și cluburi face zona vie până târziu. Pentru unii chiriași și oaspeți este exact motivul pentru care aleg zona; pentru alții, zgomotul de weekend este un motiv suficient de respingere. Nu există un răspuns unic: contează strada exactă și etajul.",
        ],
      },
      {
        heading: "Pentru cine este potrivită",
        paragraphs: [
          "Este zona firească pentru studenți, doctoranzi și cadre didactice, dar și pentru tineri angajați care vor să fie la pas de centru. Pentru familii cu copii mici, profilul zgomotos al anumitor străzi este un impediment real.",
          "Pentru investitori, este zona cu cea mai previzibilă cerere sezonieră din oraș: contractele se semnează în bloc la începutul anului universitar, iar garsonierele și apartamentele de 2 camere compartimentate pe camere se închiriază cel mai repede.",
        ],
      },
      {
        heading: "Acces și mobilitate",
        paragraphs: [
          "Totul se face pe jos sau cu bicicleta: facultăți, Piața Victoriei, malul Begăi, parcurile de pe Bega. Transportul public completează legăturile cu gara și cu nordul orașului.",
          "Parcarea este, în schimb, cea mai dificilă problemă practică a zonei — densitatea de locuitori și de vizitatori depășește cu mult numărul de locuri disponibile.",
        ],
      },
      {
        heading: "Servicii și puncte de interes",
        paragraphs: [
          "Zona are cea mai mare densitate de baruri, terase, fast-food și cafenele din oraș, magazine deschise până târziu, biblioteci universitare, baze sportive și acces rapid la parcurile de pe malul Begăi.",
          "Pentru cazare pe termen scurt, publicul natural este format din părinți în vizită, participanți la conferințe universitare, candidați la admitere și tineri turiști atrași de viața de noapte.",
        ],
      },
      {
        heading: "Ce tip de proprietăți găsești",
        paragraphs: [
          "Fondul locativ este format din blocuri ridicate în anii '60–'80, cu garsoniere și apartamente de 2–3 camere, multe adaptate în timp pentru închiriere pe camere. Suprafețele sunt compacte, iar starea variază puternic de la un imobil la altul.",
          "Apartamentele complet renovate se închiriază semnificativ mai repede și la tarife mai bune, pentru că oferta de unități uzate este abundentă — diferențierea prin amenajare are un efect direct și măsurabil aici.",
        ],
      },
    ],
    pros: [
      "Cerere de închiriere foarte intensă în perioada universitară.",
      "Totul la distanță de mers pe jos: facultăți, centru, Bega.",
      "Ofertă densă de servicii și comerț deschis până târziu.",
      "Diferențierea prin renovare are efect imediat pe tarif.",
    ],
    cons: [
      "Zgomot nocturn pe străzile cu terase și cluburi.",
      "Sezonalitate accentuată: vara cererea scade puternic.",
      "Parcare foarte dificilă.",
      "Uzură ridicată a apartamentelor închiriate studenților.",
    ],
    checklist: [
      "Verifică ce se află la parterul și în vecinătatea imediată a imobilului (bar, terasă, club).",
      "Vizitează apartamentul și vineri seara, nu doar în timpul zilei.",
      "Verifică starea instalațiilor și a tâmplăriei — uzura este mai mare aici decât în alte zone.",
      "Confirmă dacă asociația permite închirierea pe camere sau pe termen scurt.",
      "Estimează bugetul de reamenajare între cicluri de chiriași.",
    ],
    investment: [
      "Modelul dominant este chiria pe camere în perioada universitară, cu venit brut ridicat raportat la prețul de achiziție. Riscul principal nu este ocuparea, ci uzura și costul de repunere în stare la fiecare doi-trei ani.",
      "Pentru regim hotelier, zona funcționează ca strategie mixtă: cazare pe termen scurt în lunile de vară, când studenții plecă, și închiriere clasică în timpul anului universitar. În simulările noastre, ipotezele publice rămân aceleași (ocupare 75%, deducere operațională 27%), dar aici distribuția ocupării pe luni este mult mai neuniformă decât media orașului — un detaliu care schimbă fluxul de numerar, nu neapărat randamentul anual.",
    ],
    risks: [
      "Golul de vară pentru unitățile dependente exclusiv de studenți.",
      "Uzură accelerată și costuri periodice de reamenajare.",
      "Reclamații de zgomot și tensiuni cu vecinii la închirierea pe termen scurt.",
    ],
  },

  /* ═══════════════════════════ ZONA GIROCULUI ═══════════════════════════ */
  {
    slug: "zona-girocului",
    geoQuestion: "Cum este zona Girocului din Timișoara?",
    geoAnswer:
      "Calea Girocului este zona din sudul Timișoarei care face legătura între oraș și comuna Giroc. Combină cartiere de blocuri din anii '80 cu dezvoltări rezidențiale recente ridicate spre limita administrativă, iar prețurile pe metru pătrat sunt sub media orașului. Este căutată de familii tinere care vor locuință nouă la buget moderat, cu acces rapid spre spitalul județean și spre sudul orașului.",
    sections: [
      {
        heading: "Cum este zona",
        paragraphs: [
          "Zona Girocului are două fețe. Prima, dinspre oraș, este de cartier de blocuri consolidat, cu comerț la parter și infrastructură matură. A doua, spre Giroc, este o zonă de expansiune: ansambluri noi, străzi recent deschise și infrastructură care se completează în ritmul construcțiilor.",
          "Această dublă natură explică diferențele mari de preț și de calitate a vieții pe distanțe scurte. Cumpărătorul trebuie să stabilească întâi în care dintre cele două zone se află efectiv apartamentul care îl interesează.",
        ],
      },
      {
        heading: "Pentru cine este potrivită",
        paragraphs: [
          "Se potrivește familiilor tinere care vor apartament nou, mai spațios, la un preț sub cel din zonele centrale, și celor care lucrează în sudul orașului sau în sistemul medical din apropierea spitalului județean.",
          "Este mai puțin potrivită pentru cine depinde de transport public frecvent sau lucrează în nordul orașului: naveta zilnică traversează tot orașul.",
        ],
      },
      {
        heading: "Acces și mobilitate",
        paragraphs: [
          "Artera principală face legătura directă cu centrul și cu inelul de circulație, iar transportul public acoperă tronsonul urban. Spre limita cu Giroc, frecvența scade și dependența de mașină crește.",
          "Traficul de intrare în oraș dimineața este consistent, pentru că artera colectează și fluxul dinspre comunele din sud. Este util să verifici traseul în ambele sensuri la ore de vârf înainte de a cumpăra.",
        ],
      },
      {
        heading: "Servicii și puncte de interes",
        paragraphs: [
          "Zona are supermarketuri, școli, grădinițe și cabinete în segmentul urban, plus proximitatea spitalului județean — un reper important atât pentru locuit, cât și pentru închiriere către personal medical.",
          "În zonele de expansiune, serviciile apar cu întârziere față de locuințe: școlile, trotuarele și transportul public pot rămâne în urmă cu câțiva ani față de blocurile deja locuite.",
        ],
      },
      {
        heading: "Ce tip de proprietăți găsești",
        paragraphs: [
          "În segmentul urban predomină apartamentele de 2–3 camere în blocuri din anii '80. Spre Giroc, oferta este de locuințe noi: apartamente de 2–3 camere cu balcon generos, uneori cu grădină la parter, plus case înșiruite.",
          "Locuințele noi din zona de expansiune oferă cel mai mult metru pătrat pentru buget din tot orașul, cu compromisul infrastructurii încă în formare.",
        ],
      },
    ],
    pros: [
      "Cel mai bun raport suprafață/preț pentru locuințe noi, conform indicelui nostru intern.",
      "Proximitatea spitalului județean și a sudului orașului.",
      "Apartamente noi cu balcoane mari și, punctual, grădini la parter.",
      "Comerț și școli consolidate în segmentul urban.",
    ],
    cons: [
      "Infrastructură incompletă în zonele de expansiune spre Giroc.",
      "Trafic dens la intrarea în oraș dimineața.",
      "Transport public mai rar spre limita administrativă.",
      "Potențial limitat pentru cazare pe termen scurt.",
    ],
    checklist: [
      "Verifică dacă adresa este în Timișoara sau în comuna Giroc — diferă taxele și autoritatea competentă.",
      "Confirmă racordarea la utilități și stadiul rețelei de canalizare pentru dezvoltările noi.",
      "Verifică autorizația de construire și recepția la terminarea lucrărilor.",
      "Întreabă despre planurile de dezvoltare pentru terenurile libere din jur.",
      "Verifică distanța până la cea mai apropiată stație de transport public și frecvența.",
    ],
    investment: [
      "Argumentul investițional principal este prețul de achiziție: la același buget cumperi o suprafață mai mare decât în zonele centrale, ceea ce ajută la închirierea către familii. Chiria nominală este însă mai mică, deci randamentul depinde strict de prețul de intrare negociat.",
      "Pentru regim hotelier, zona nu este printre prioritățile noastre — cererea de cazare pe termen scurt este ocazională, legată mai ales de vizite la spital sau de tranzit. Într-un astfel de context, ocuparea de referință de 75% nu este o ipoteză prudentă, iar preferăm să o spunem explicit înainte de o simulare de randament.",
    ],
    risks: [
      "Ofertă nouă abundentă care poate ține chiriile plate.",
      "Decalaj între livrarea locuințelor și livrarea infrastructurii publice.",
      "Lichiditate mai lentă la revânzare în zonele de expansiune.",
    ],
  },

  /* ═══════════════════════════ ELISABETIN ═══════════════════════════ */
  {
    slug: "elisabetin",
    geoQuestion: "Cum este cartierul Elisabetin din Timișoara?",
    geoAnswer:
      "Elisabetin este un cartier istoric situat imediat la sud de centrul Timișoarei, format în principal din vile și imobile mici interbelice, cu străzi umbrite și Piața Bălcescu ca reper central. Se ajunge pe jos în Piața Victoriei în 10–15 minute. Fondul construit protejat, densitatea mică și proximitatea centrului îl fac una dintre zonele rezidențiale cele mai căutate din oraș.",
    sections: [
      {
        heading: "Cum este zona",
        paragraphs: [
          "Elisabetin are o structură urbană rară în România: străzi liniștite cu vile interbelice, curți interioare, arbori maturi și o piață de cartier cu biserică monumentală, toate la câteva minute de centrul administrativ al orașului. Densitatea este mică, iar traficul de tranzit este redus.",
          "Această calitate vine cu un cost: o mare parte a fondului construit are peste 80 de ani, cu tot ce implică — structură, instalații, șarpantă, curți comune și, adesea, statut de imobil în zonă protejată, cu restricții de intervenție.",
        ],
      },
      {
        heading: "Pentru cine este potrivită",
        paragraphs: [
          "Se potrivește cumpărătorilor care caută caracter arhitectural și liniște la pas de centru și sunt dispuși să gestioneze un imobil vechi. Este zona preferată de familii cu venituri peste medie, de profesii liberale care combină locuința cu biroul și de investitori interesați de apartamente cu identitate, nu de unități standardizate.",
          "Nu se potrivește cui vrea o clădire nouă cu lift, parcare subterană și costuri de întreținere previzibile — acele produse sunt rare aici.",
        ],
      },
      {
        heading: "Acces și mobilitate",
        paragraphs: [
          "Mersul pe jos este mijlocul principal de deplasare: Piața Victoriei, Catedrala, parcurile de pe Bega și zona universitară sunt toate la distanțe scurte. Transportul public de pe arterele care mărginesc cartierul completează legăturile cu restul orașului.",
          "Parcarea pe stradă este limitată, iar garajele sunt puține — un aspect care influențează direct atractivitatea unei proprietăți la revânzare sau închiriere.",
        ],
      },
      {
        heading: "Servicii și puncte de interes",
        paragraphs: [
          "Piața Bălcescu cu piața agroalimentară și biserica, cafenele și restaurante de cartier, școli și licee cu tradiție, cabinete medicale, plus parcurile de pe malul Begăi la câteva minute. Comerțul este de proximitate, nu de mari suprafețe.",
          "Pentru cazare pe termen scurt, zona are un avantaj clar: oaspeții care vor centrul istoric fără zgomotul din Piața Unirii găsesc aici exact acest compromis.",
        ],
      },
      {
        heading: "Ce tip de proprietăți găsești",
        paragraphs: [
          "Apartamente în vile și imobile interbelice de 2–3 niveluri, cu tavane înalte, camere generoase și compartimentări atipice; case individuale cu curte; punctual, imobile noi inserate pe loturi libere. Suprafețele utile sunt de regulă mai mari decât în blocurile din aceeași categorie de preț.",
          "Starea tehnică variază enorm: de la imobile complet consolidate și renovate până la clădiri cu instalații originale. Diferența de preț dintre cele două extreme este mai mică decât costul real al aducerii la standard, ceea ce face expertiza tehnică obligatorie înainte de ofertă.",
        ],
      },
    ],
    pros: [
      "Caracter arhitectural și liniște la 10–15 minute pe jos de Piața Victoriei.",
      "Suprafețe utile generoase și tavane înalte.",
      "Densitate mică, arbori maturi, trafic de tranzit redus.",
      "Cerere solidă atât pentru locuit, cât și pentru cazare pe termen scurt de calitate.",
    ],
    cons: [
      "Fond construit vechi, cu costuri de renovare și întreținere greu de estimat.",
      "Restricții de intervenție pentru imobilele din zone protejate.",
      "Parcare limitată și puține garaje.",
      "Ofertă mică de locuințe noi.",
    ],
    checklist: [
      "Comandă o expertiză tehnică pentru structură, șarpantă și instalații înainte de ofertă.",
      "Verifică dacă imobilul este clasat sau se află în zonă protejată și ce autorizații sunt necesare.",
      "Clarifică regimul curții și al părților comune (cote, servituți, acces).",
      "Verifică sursa de încălzire și posibilitatea de a monta centrală proprie.",
      "Confirmă cadastrul și intabularea, mai ales pentru apartamente rezultate din partajări succesive.",
    ],
    investment: [
      "Elisabetin este una dintre puținele zone din Timișoara unde diferențierea prin amenajare are efect direct pe tarif: un apartament restaurat cu grijă, la pas de centru, se poziționează într-un segment cu mai puțină concurență decât studiourile din ansamblurile noi.",
      "În schimb, bugetul de intrare trebuie să includă renovarea, nu doar prețul de achiziție. Verificăm dacă tariful realizabil susține pragul nostru de referință de 9,4% net în ipotezele publice (ocupare 75%, deducere operațională 27%) după ce adăugăm costul lucrărilor la prețul de cumpărare — altfel randamentul afișat inițial devine nerealist.",
    ],
    risks: [
      "Surprize tehnice la imobile vechi: costuri suplimentare după achiziție.",
      "Durată mai lungă de autorizare pentru lucrări în zone protejate.",
      "Absența parcării poate limita cererea la anumite categorii de chiriași și oaspeți.",
    ],
  },
];

export const getNeighborhoodProfile = (slug: string): NeighborhoodProfile | undefined =>
  neighborhoodProfiles.find((p) => p.slug === slug);
