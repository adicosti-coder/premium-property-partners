export interface MockListing {
  id: string;
  title: string;
  price: number;
  pricePerSqm: number;
  rooms: number;
  floor: number;
  surface: number;
  badge: 'administrare' | 'vanzare';
  imageAlt: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface NeighborhoodData {
  slug: string;
  name: string;
  fullName: string;
  avgPricePerSqm: number;
  listingsCount: number;
  description: string;
  metaTitle: string;
  metaDescription: string;
  listings: MockListing[];
  faq: FAQItem[];
}

export const neighborhoods: NeighborhoodData[] = [
  {
    slug: 'zona-girocului',
    name: 'Girocului',
    fullName: 'Zona Girocului',
    avgPricePerSqm: 1650,
    listingsCount: 6,
    description:
      'Zona Girocului este unul dintre cele mai dinamice cartiere rezidențiale din Timișoara, aflat în sud-vestul orașului. Dezvoltarea imobiliară accelerată din ultimii ani a transformat această zonă într-un pol atractiv pentru familii tinere și investitori. Accesul facil către centrul orașului prin Calea Girocului, proximitatea parcurilor și a centrelor comerciale (Shopping City Timișoara la 5 minute) și oferta variată de apartamente noi fac din Girocului o alegere excelentă. Transportul public este bine dezvoltat, cu linii de autobuz frecvente. Profilul rezidenților: tineri profesioniști, familii cu copii și investitori în regim hotelier. Prețurile sunt cu 10-15% sub media orașului, oferind potențial de apreciere semnificativ.',
    metaTitle: 'Apartamente Zona Girocului Timișoara | RealTrust Imobiliare',
    metaDescription: 'Apartamente de vânzare în Zona Girocului, Timișoara. Prețuri de la 1.650 €/mp, administrare RealTrust inclusă. Investiții imobiliare cu randament verificat.',
    faq: [
      { question: 'Care este prețul mediu pe metru pătrat în zona Girocului?', answer: 'Prețul mediu în zona Girocului este de aproximativ 1.650 €/mp, cu 10-15% sub media orașului Timișoara, oferind un potențial excelent de apreciere.' },
      { question: 'Ce facilități sunt disponibile în zona Girocului?', answer: 'Zona Girocului beneficiază de Shopping City Timișoara la 5 minute, parcuri, școli, grădinițe și linii de autobuz frecvente către centrul orașului.' },
      { question: 'Este Girocului potrivit pentru investiții în regim hotelier?', answer: 'Da, Girocului este ideal pentru investiții datorită prețurilor accesibile și cererii ridicate din partea tinerilor profesioniști. RealTrust oferă administrare completă cu randamente de 7-9% net.' },
    ],
    listings: [
      { id: 'gir-1', title: 'Apartament 2 camere — Bloc Nou Girocului', price: 82500, pricePerSqm: 1650, rooms: 2, floor: 3, surface: 50, badge: 'administrare', imageAlt: 'Apartament 2 camere zona Girocului Timișoara' },
      { id: 'gir-2', title: 'Garsonieră modernă Girocului', price: 59400, pricePerSqm: 1620, rooms: 1, floor: 1, surface: 36, badge: 'vanzare', imageAlt: 'Garsonieră de vânzare Girocului Timișoara' },
      { id: 'gir-3', title: 'Apartament 3 camere decomandat', price: 123200, pricePerSqm: 1680, rooms: 3, floor: 2, surface: 73, badge: 'administrare', imageAlt: 'Apartament 3 camere Girocului Timișoara' },
      { id: 'gir-4', title: 'Studio investiție regim hotelier', price: 64000, pricePerSqm: 1600, rooms: 1, floor: 5, surface: 40, badge: 'administrare', imageAlt: 'Studio investiție Girocului Timișoara' },
      { id: 'gir-5', title: 'Apartament 2 camere — parter cu grădină', price: 99000, pricePerSqm: 1700, rooms: 2, floor: 0, surface: 58, badge: 'vanzare', imageAlt: 'Apartament parter grădină Girocului' },
      { id: 'gir-6', title: 'Penthouse 3 camere cu terasă', price: 148500, pricePerSqm: 1730, rooms: 3, floor: 7, surface: 86, badge: 'vanzare', imageAlt: 'Penthouse Girocului Timișoara' },
    ],
  },
  {
    slug: 'zona-aradului',
    name: 'Aradului',
    fullName: 'Zona Aradului',
    avgPricePerSqm: 1780,
    listingsCount: 5,
    description:
      'Calea Aradului conectează Timișoara de autostrada A1 și de aeroportul internațional, fiind una dintre arterele principale ale orașului. Zona este recunoscută pentru accesibilitatea excelentă, parcurile generoase (Parcul Botanic) și infrastructura modernă. Dezvoltări rezidențiale recente precum Vivalia și complexele de pe Calea Torontalului au crescut atractivitatea zonei. Profilul rezidenților include profesioniști IT, familii și persoane care navighează frecvent spre București sau alte orașe. Proximitatea mall-ului Iulius Town și a zonei de business Openville consolidează statutul de zonă premium pentru investiții.',
    metaTitle: 'Apartamente Zona Aradului Timișoara | RealTrust Imobiliare',
    metaDescription: 'Apartamente de vânzare pe Calea Aradului, Timișoara. Preț mediu 1.780 €/mp, acces rapid la aeroport. Administrare RealTrust și randament garantat.',
    faq: [
      { question: 'Cât de aproape este zona Aradului de aeroport?', answer: 'Aeroportul Internațional Timișoara Traian Vuia este la aproximativ 10 minute cu mașina de zona Aradului, prin acces direct la autostrada A1.' },
      { question: 'Care sunt avantajele zonei Aradului pentru investitori?', answer: 'Zona Aradului oferă acces rapid la aeroport, proximitatea Iulius Town și Openville, plus un profil de chiriași cu venituri ridicate (profesioniști IT). Prețul mediu este 1.780 €/mp.' },
      { question: 'Există parcuri și școli în zona Aradului?', answer: 'Da, zona include Parcul Botanic, mai multe grădinițe și școli, precum și acces la facilitățile medicale din centrul orașului.' },
    ],
    listings: [
      { id: 'ara-1', title: 'Apartament 2 camere Vivalia', price: 93500, pricePerSqm: 1870, rooms: 2, floor: 4, surface: 50, badge: 'administrare', imageAlt: 'Apartament Vivalia Calea Aradului' },
      { id: 'ara-2', title: 'Studio modern — investiție', price: 62300, pricePerSqm: 1780, rooms: 1, floor: 2, surface: 35, badge: 'administrare', imageAlt: 'Studio investiție Aradului Timișoara' },
      { id: 'ara-3', title: 'Apartament 3 camere premium', price: 147000, pricePerSqm: 1800, rooms: 3, floor: 6, surface: 82, badge: 'vanzare', imageAlt: 'Apartament 3 camere Aradului' },
      { id: 'ara-4', title: 'Garsonieră bloc nou 2024', price: 55500, pricePerSqm: 1740, rooms: 1, floor: 1, surface: 32, badge: 'vanzare', imageAlt: 'Garsonieră bloc nou Aradului' },
      { id: 'ara-5', title: 'Duplex 4 camere cu parcare', price: 198000, pricePerSqm: 1800, rooms: 4, floor: 3, surface: 110, badge: 'vanzare', imageAlt: 'Duplex Calea Aradului Timișoara' },
    ],
  },
  {
    slug: 'circumvalatiunii',
    name: 'Circumvalațiunii',
    fullName: 'Circumvalațiunii',
    avgPricePerSqm: 1920,
    listingsCount: 5,
    description:
      'Calea Circumvalațiunii este una dintre cele mai căutate zone din Timișoara pentru investiții în regim hotelier. Complexul City of Mara, situat pe această arteră, găzduiește deja multiple apartamente gestionate de RealTrust cu rate de ocupare de peste 90%. Zona beneficiază de proximitatea parcului Rozelor, a centrului comercial Bega Shopping Center și a Universității de Vest. Transportul este excelent — tramvai și autobuz la mai puțin de 100m. Rezidenții tipici sunt studenți, tineri profesioniști și turiști de business. Infrastructura matură și cererea constantă fac din Circumvalațiunii un punct fierbinte al pieței imobiliare timișorene.',
    metaTitle: 'Apartamente Circumvalațiunii Timișoara | RealTrust Imobiliare',
    metaDescription: 'Apartamente în zona Circumvalațiunii, Timișoara. Complex City of Mara, ocupare 90%+, preț mediu 1.920 €/mp. Management profesional RealTrust.',
    faq: [
      { question: 'Ce rată de ocupare au apartamentele din Circumvalațiunii?', answer: 'Apartamentele gestionate de RealTrust în zona Circumvalațiunii (Complex City of Mara) au o rată de ocupare de peste 90%, datorită cererii constante din partea studenților și turiștilor de business.' },
      { question: 'Ce facilități sunt în zona Circumvalațiunii?', answer: 'Zona include Parcul Rozelor, Bega Shopping Center, Universitatea de Vest, tramvai și autobuz la sub 100m, plus restaurante și cafenele.' },
      { question: 'Care este profilul chiriașilor din Circumvalațiunii?', answer: 'Chiriașii tipici sunt studenți ai universităților din Timișoara, tineri profesioniști și turiști de business care caută cazare pe termen scurt.' },
    ],
    listings: [
      { id: 'cir-1', title: 'Apartament 2 camere City of Mara', price: 110400, pricePerSqm: 1920, rooms: 2, floor: 5, surface: 58, badge: 'administrare', imageAlt: 'Apartament City of Mara Timișoara' },
      { id: 'cir-2', title: 'Studio DeLuxe — regim hotelier', price: 72000, pricePerSqm: 1950, rooms: 1, floor: 3, surface: 37, badge: 'administrare', imageAlt: 'Studio DeLuxe Circumvalațiunii' },
      { id: 'cir-3', title: 'Apartament 3 camere decomandat', price: 153600, pricePerSqm: 1920, rooms: 3, floor: 4, surface: 80, badge: 'vanzare', imageAlt: 'Apartament 3 camere Circumvalațiunii' },
      { id: 'cir-4', title: 'Garsonieră investiție cu randament', price: 59800, pricePerSqm: 1880, rooms: 1, floor: 2, surface: 32, badge: 'administrare', imageAlt: 'Garsonieră investiție Circumvalațiunii' },
      { id: 'cir-5', title: 'Apartament 2 camere — mobilat complet', price: 105600, pricePerSqm: 1960, rooms: 2, floor: 6, surface: 54, badge: 'administrare', imageAlt: 'Apartament mobilat Circumvalațiunii' },
    ],
  },
  {
    slug: 'sagului',
    name: 'Șagului',
    fullName: 'Zona Șagului',
    avgPricePerSqm: 1580,
    listingsCount: 5,
    description:
      'Calea Șagului este un bulevard major care conectează centrul Timișoarei de zona sudică a orașului. Cartierul a cunoscut o dezvoltare masivă în ultimii 5 ani, cu complexe rezidențiale noi care oferă apartamente la prețuri competitive. Proximitatea Amazonia Aquapark, a parcurilor și a școlilor face zona ideală pentru familii. Accesul auto este fluid, iar transportul public asigură conexiuni rapide spre centru (15 minute cu tramvaiul). Prețurile accesibile (sub media orașului cu 15-20%) și potențialul de creștere atrag investitori care caută randamente bune în regim hotelier. Profilul rezidenților: familii, studenți și angajați ai zonelor industriale din sud.',
    metaTitle: 'Apartamente Zona Șagului Timișoara | RealTrust Imobiliare',
    metaDescription: 'Apartamente de vânzare pe Calea Șagului, Timișoara. Prețuri accesibile de la 1.580 €/mp, lângă Amazonia Aquapark. Management profesional RealTrust.',
    faq: [
      { question: 'Cât costă un apartament pe Calea Șagului?', answer: 'Prețul mediu pe Calea Șagului este de 1.580 €/mp, cu 15-20% sub media orașului. Un apartament de 2 camere (50 mp) pornește de la aproximativ 79.000 €.' },
      { question: 'Ce atracții sunt în zona Șagului?', answer: 'Zona Șagului include Amazonia Aquapark (la 5 minute), parcuri, școli, grădinițe și acces rapid cu tramvaiul spre centrul orașului (15 minute).' },
      { question: 'Merită investiția în zona Șagului?', answer: 'Da, prețurile accesibile și dezvoltarea continuă oferă un potențial de apreciere de 5-8% anual. RealTrust administrează apartamente în regim hotelier cu randamente de 7-9% net.' },
    ],
    listings: [
      { id: 'sag-1', title: 'Apartament 2 camere — bloc nou 2025', price: 82100, pricePerSqm: 1580, rooms: 2, floor: 2, surface: 52, badge: 'vanzare', imageAlt: 'Apartament bloc nou Șagului Timișoara' },
      { id: 'sag-2', title: 'Studio ideal investiție', price: 52100, pricePerSqm: 1530, rooms: 1, floor: 4, surface: 34, badge: 'administrare', imageAlt: 'Studio investiție Șagului' },
      { id: 'sag-3', title: 'Apartament 3 camere cu parcare', price: 126400, pricePerSqm: 1600, rooms: 3, floor: 1, surface: 79, badge: 'vanzare', imageAlt: 'Apartament 3 camere Șagului' },
      { id: 'sag-4', title: 'Garsonieră renovată complet', price: 48000, pricePerSqm: 1500, rooms: 1, floor: 3, surface: 32, badge: 'vanzare', imageAlt: 'Garsonieră Șagului Timișoara' },
      { id: 'sag-5', title: 'Apartament 2 camere — investiție', price: 88200, pricePerSqm: 1620, rooms: 2, floor: 5, surface: 55, badge: 'administrare', imageAlt: 'Apartament investiție Șagului' },
    ],
  },
  {
    slug: 'complex-studentesc',
    name: 'Complexul Studențesc',
    fullName: 'Complexul Studențesc',
    avgPricePerSqm: 1720,
    listingsCount: 4,
    description:
      'Complexul Studențesc din Timișoara este o zonă vibrantă, dominată de campusurile Universității Politehnica și ale Universității de Vest. Cererea de cazare este constantă datorită populației studențești de peste 40.000 de persoane și a fluxului continuu de profesori, cercetători și participanți la conferințe. Zona dispune de facilități moderne — cantină, librării, terenuri sportive — și este conectată excelent la centrul orașului prin tramvai (10 minute). Investițiile în garsoniere și studiouri din această zonă generează randamente de 8-10% net, susținute de cererea ridicată pe tot parcursul anului universitar. Profilul rezidenților: studenți, cadre didactice și tineri profesioniști.',
    metaTitle: 'Apartamente Complex Studențesc Timișoara | RealTrust Imobiliare',
    metaDescription: 'Apartamente în Complexul Studențesc Timișoara. Cerere constantă, randament 8-10%, preț mediu 1.720 €/mp. Ideal investiții cu management RealTrust.',
    faq: [
      { question: 'Ce randament oferă o investiție în Complexul Studențesc?', answer: 'Garsonierele și studiourile din Complexul Studențesc generează randamente de 8-10% net, susținute de cererea constantă a celor peste 40.000 de studenți.' },
      { question: 'Cât de aproape este Complexul Studențesc de centrul orașului?', answer: 'Complexul Studențesc este conectat la centrul Timișoarei prin tramvai, cu o călătorie de aproximativ 10 minute.' },
      { question: 'Ce tip de proprietăți sunt cele mai căutate în Complex Studențesc?', answer: 'Garsonierele și apartamentele cu 2 camere sunt cele mai căutate, atât de studenți pentru închiriere pe termen lung, cât și de turiștii care vizitează universitățile.' },
    ],
    listings: [
      { id: 'stu-1', title: 'Garsonieră lângă UPT', price: 55000, pricePerSqm: 1720, rooms: 1, floor: 2, surface: 32, badge: 'administrare', imageAlt: 'Garsonieră Complex Studențesc Timișoara' },
      { id: 'stu-2', title: 'Apartament 2 camere — campus', price: 86000, pricePerSqm: 1720, rooms: 2, floor: 3, surface: 50, badge: 'administrare', imageAlt: 'Apartament 2 camere Complex Studențesc' },
      { id: 'stu-3', title: 'Studio modern ultracentral', price: 67000, pricePerSqm: 1750, rooms: 1, floor: 4, surface: 38, badge: 'vanzare', imageAlt: 'Studio ultracentral Complex Studențesc' },
      { id: 'stu-4', title: 'Apartament 2 camere renovat', price: 93500, pricePerSqm: 1700, rooms: 2, floor: 1, surface: 55, badge: 'vanzare', imageAlt: 'Apartament renovat Complex Studențesc' },
    ],
  },
  {
    slug: 'calea-lipovei',
    name: 'Calea Lipovei',
    fullName: 'Calea Lipovei',
    avgPricePerSqm: 1550,
    listingsCount: 5,
    description:
      'Calea Lipovei este unul dintre bulevardele principale din estul Timișoarei, cu acces direct spre centrul orașului. Este o zonă cu tradiție, apreciată pentru accesul la piețe agroalimentare, școli și parcuri. Dezvoltările recente au adus blocuri noi cu finisaje premium, iar prețurile rămân printre cele mai accesibile din Timișoara. Zona beneficiază de tramvai direct spre centru (12 minute), magazine de proximitate și facilități medicale. Profilul rezidenților include familii cu venituri medii, pensionari și tineri la primul apartament. Investitorii apreciază raportul preț-randament excelent, cu chirii stabile și cerere constantă din partea lucrătorilor locali.',
    metaTitle: 'Apartamente Calea Lipovei Timișoara | RealTrust Imobiliare',
    metaDescription: 'Apartamente de vânzare pe Calea Lipovei, Timișoara. Cele mai accesibile prețuri din oraș — 1.550 €/mp. Randament excelent cu administrare RealTrust.',
    faq: [
      { question: 'De ce sunt prețurile mai mici pe Calea Lipovei?', answer: 'Calea Lipovei oferă cele mai accesibile prețuri din Timișoara (1.550 €/mp) deoarece este o zonă în curs de modernizare, cu potențial mare de apreciere pe termen mediu.' },
      { question: 'Ce transport public este disponibil pe Calea Lipovei?', answer: 'Zona beneficiază de tramvai direct spre centrul Timișoarei (12 minute), precum și de linii de autobuz regulate.' },
      { question: 'Este Calea Lipovei potrivită pentru familii?', answer: 'Da, zona include școli, grădinițe, piețe agroalimentare, magazine de proximitate și facilități medicale, fiind ideală pentru familii cu venituri medii.' },
    ],
    listings: [
      { id: 'lip-1', title: 'Apartament 2 camere — renovat integral', price: 77500, pricePerSqm: 1550, rooms: 2, floor: 2, surface: 50, badge: 'vanzare', imageAlt: 'Apartament renovat Calea Lipovei' },
      { id: 'lip-2', title: 'Garsonieră investiție Lipovei', price: 49500, pricePerSqm: 1500, rooms: 1, floor: 1, surface: 33, badge: 'administrare', imageAlt: 'Garsonieră investiție Calea Lipovei' },
      { id: 'lip-3', title: 'Apartament 3 camere — familie', price: 117000, pricePerSqm: 1560, rooms: 3, floor: 3, surface: 75, badge: 'vanzare', imageAlt: 'Apartament 3 camere Calea Lipovei' },
      { id: 'lip-4', title: 'Studio compact — randament bun', price: 45000, pricePerSqm: 1500, rooms: 1, floor: 5, surface: 30, badge: 'administrare', imageAlt: 'Studio Calea Lipovei Timișoara' },
      { id: 'lip-5', title: 'Apartament 2 camere — bloc 2024', price: 85300, pricePerSqm: 1580, rooms: 2, floor: 4, surface: 54, badge: 'vanzare', imageAlt: 'Apartament bloc nou Calea Lipovei' },
    ],
  },
  {
    slug: 'isho',
    name: 'ISHO',
    fullName: 'ISHO & Fabric',
    avgPricePerSqm: 2150,
    listingsCount: 5,
    description:
      'ISHO (I Should Have One) este cel mai iconic proiect de regenerare urbană din Timișoara, dezvoltat pe fosta platformă industrială din cartierul Fabric. Complexul mixed-use include apartamente premium, birouri, spații comerciale și restaurante, toate proiectate de arhitecți de renume. Zona Fabric, cu atmosfera sa boemiană și proximitatea de malul Begăi, atrage profesioniști creativi, expați și investitori care caută proprietăți cu apreciere rapidă. Accesul pietonal spre centrul vechi durează 10 minute. Prețurile sunt cele mai ridicate din Timișoara, reflectând calitatea construcției și locația unică. Profilul rezidenților: profesioniști IT, manageri, artiști și turiști premium.',
    metaTitle: 'Apartamente ISHO Timișoara | RealTrust Imobiliare',
    metaDescription: 'Apartamente premium ISHO Fabric, Timișoara. Cel mai exclusivist complex — 2.150 €/mp, design urban premium. Administrare profesională RealTrust.',
    faq: [
      { question: 'Ce face ISHO diferit față de alte complexuri din Timișoara?', answer: 'ISHO este cel mai iconic proiect de regenerare urbană din Timișoara — un complex mixed-use cu apartamente premium, birouri, restaurante și spații comerciale, proiectat de arhitecți de renume pe malul Begăi.' },
      { question: 'Care este prețul mediu la ISHO?', answer: 'Prețul mediu la ISHO este de 2.150 €/mp, cel mai ridicat din Timișoara, reflectând calitatea construcției, designul arhitectural și locația premium lângă centrul vechi.' },
      { question: 'Este ISHO potrivit pentru investiții pe termen lung?', answer: 'Da, ISHO atrage chiriași premium (profesioniști IT, expați, turiști de business) și are un potențial ridicat de apreciere datorită locației unice și brandului puternic.' },
    ],
    listings: [
      { id: 'ish-1', title: 'Apartament 2 camere ISHO Living', price: 129000, pricePerSqm: 2150, rooms: 2, floor: 8, surface: 60, badge: 'administrare', imageAlt: 'Apartament ISHO Living Timișoara' },
      { id: 'ish-2', title: 'Studio premium cu vedere la Bega', price: 84000, pricePerSqm: 2200, rooms: 1, floor: 6, surface: 38, badge: 'administrare', imageAlt: 'Studio ISHO vedere Bega' },
      { id: 'ish-3', title: 'Apartament 3 camere penthouse', price: 236500, pricePerSqm: 2200, rooms: 3, floor: 12, surface: 108, badge: 'vanzare', imageAlt: 'Penthouse ISHO Timișoara' },
      { id: 'ish-4', title: 'Garsonieră ISHO — investiție', price: 72000, pricePerSqm: 2120, rooms: 1, floor: 3, surface: 34, badge: 'administrare', imageAlt: 'Garsonieră ISHO investiție' },
      { id: 'ish-5', title: 'Duplex 4 camere premium', price: 290000, pricePerSqm: 2230, rooms: 4, floor: 10, surface: 130, badge: 'vanzare', imageAlt: 'Duplex ISHO Timișoara' },
    ],
  },
];

export const getNeighborhoodBySlug = (slug: string): NeighborhoodData | undefined =>
  neighborhoods.find((n) => n.slug === slug);
