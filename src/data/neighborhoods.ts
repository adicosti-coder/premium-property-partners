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
  // ═══════════════════════════════════════════════════════════════
  // ZONE PREMIUM (avgPricePerSqm >= 1900€) — apar primele
  // ═══════════════════════════════════════════════════════════════
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
  // ═══════════════════════════════════════════════════════════════
  // ZONE NON-PREMIUM — sortate descrescător după numărul de anunțuri
  // ═══════════════════════════════════════════════════════════════
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
    slug: 'iosefin',
    name: 'Iosefin',
    fullName: 'Iosefin',
    avgPricePerSqm: 1850,
    listingsCount: 4,
    description:
      'Iosefin este unul dintre cele mai vechi și emblematice cartiere ale Timișoarei, situat la sud-vest de centrul istoric, pe malul Begăi. Cu o arhitectură habsburgică spectaculoasă, Piața Iosefin (reper comercial vital al cartierului), Sinagoga din Iosefin (monument istoric și arhitectural emblematic) și acces pietonal de 8 minute spre Piața Unirii, Iosefin atrage turiști culturali, profesioniști creativi și investitori care caută proprietăți cu identitate. Bulevardul 16 Decembrie 1989 traversează cartierul și asigură legături excelente de tramvai (liniile 1, 2) către Universitatea de Vest (UVT) și Iulius Town (10 minute). Prețurile apartamentelor în Iosefin Timișoara variază între 1.700 și 2.100 €/mp, în funcție de starea clădirii istorice (renovate vs. originale) și de proximitatea față de Bega. Garsonierele de vânzare în Iosefin sunt foarte căutate (60.000–75.000 €) datorită cererii constante pentru regim hotelier. Piața imobiliară Iosefin a crescut cu 7% în 2025, susținută de cererea pentru închirieri pe termen lung din partea expaților și a profesioniștilor creativi, plus apreciere de capital constantă pentru clădirile istorice renovate. Investiția într-un apartament regim hotelier Iosefin Timișoara generează randamente de 8-9% net, datorită ocupării ridicate (78–85%) și a tarifelor premium pentru turism cultural.',
    metaTitle: 'Apartamente Iosefin Timișoara | Regim Hotelier RealTrust',
    metaDescription: 'Apartamente Iosefin Timișoara — regim hotelier în cartierul istoric. Aproape de Piața Iosefin, Sinagogă, Bega și UVT. Preț 1.850 €/mp, randament 8-9%.',
    faq: [
      { question: 'Care este prețul mediu pe metru pătrat în Iosefin Timișoara?', answer: 'Prețurile apartamentelor în Iosefin variază între 1.700 și 2.100 €/mp (medie 1.850 €/mp). Clădirile istorice renovate ating 2.000–2.100 €/mp, iar cele cu lucrări necesare 1.700–1.800 €/mp. Garsonierele se tranzacționează între 60.000 și 75.000 €.' },
      { question: 'De ce să investesc într-un apartament în Iosefin Timișoara?', answer: 'Iosefin combină arhitectură habsburgică, atracții turistice (Catedrala Romano-Catolică, Sinagoga din Iosefin, Piața Iosefin) și acces pietonal de 8 minute spre Piața Unirii. Cererea pentru regim hotelier este constantă, generând randamente de 8-9% net.' },
      { question: 'Cum evoluează piața imobiliară Iosefin?', answer: 'Piața imobiliară Iosefin a crescut cu aproximativ 7% în 2025, susținută de cererea pentru închirieri pe termen lung din partea expaților și profesioniștilor creativi, plus apreciere de capital constantă pentru clădirile istorice renovate.' },
      { question: 'Cât de aproape este Iosefin de UVT și Iulius Town?', answer: 'Iosefin este la 10 minute cu tramvaiul (liniile 1 și 2 de pe Bulevardul 16 Decembrie 1989) de Universitatea de Vest (UVT) și de complexul Iulius Town, ideal pentru chiriași tineri și turiști.' },
      { question: 'Sunt disponibile garsoniere de vânzare în Iosefin?', answer: 'Da, garsonierele de vânzare în Iosefin sunt o tipologie căutată (60.000–75.000 €), atât în clădiri istorice renovate, cât și în proiecte noi pe malul Begăi. Cerere ridicată pentru regim hotelier.' },
    ],
    listings: [
      { id: 'ios-1', title: 'Apartament 2 camere — clădire istorică', price: 96200, pricePerSqm: 1850, rooms: 2, floor: 1, surface: 52, badge: 'administrare', imageAlt: 'Apartament regim hotelier Iosefin Timișoara' },
      { id: 'ios-2', title: 'Studio Iosefin — lângă Piața Unirii', price: 68500, pricePerSqm: 1900, rooms: 1, floor: 2, surface: 36, badge: 'administrare', imageAlt: 'Studio Iosefin lângă Piața Unirii' },
      { id: 'ios-3', title: 'Apartament 3 camere renovat habsburgic', price: 162800, pricePerSqm: 1880, rooms: 3, floor: 2, surface: 87, badge: 'vanzare', imageAlt: 'Apartament 3 camere Iosefin Timișoara' },
      { id: 'ios-4', title: 'Garsonieră investiție lângă Bega', price: 60800, pricePerSqm: 1840, rooms: 1, floor: 3, surface: 33, badge: 'administrare', imageAlt: 'Garsonieră investiție Iosefin Bega' },
    ],
  },
  {
    slug: 'elisabetin',
    name: 'Elisabetin',
    fullName: 'Elisabetin',
    avgPricePerSqm: 1820,
    listingsCount: 4,
    description:
      'Elisabetin este unul dintre cele mai elegante cartiere rezidențiale ale Timișoarei, recunoscut pentru vilele sale interbelice, străzile umbrite și atmosfera liniștită. Situat la sud de centrul istoric, Elisabetin oferă acces pietonal de 10 minute spre Piața Victoriei și conexiune directă cu tramvaiul către Universitatea de Vest (UVT) și Universitatea Politehnica (UPT). Zona include Parcul Rozelor, una dintre cele mai frumoase atracții ale orașului, și o densitate ridicată de cafenele specialty și restaurante de autor. Apartamentele de închiriat Elisabetin Timișoara sunt căutate atât de familii tinere, cât și de turiști care preferă o experiență premium, departe de zgomotul centrului. Investitorii apreciază stabilitatea prețurilor și ratele de ocupare ridicate în regim hotelier.',
    metaTitle: 'Apartamente Elisabetin Timișoara | Cartier Premium RealTrust',
    metaDescription: 'Apartamente Elisabetin Timișoara — cartier rezidențial premium lângă Parcul Rozelor și UVT. Preț 1.820 €/mp, regim hotelier cu randament verificat.',
    faq: [
      { question: 'Ce face Elisabetin un cartier premium?', answer: 'Elisabetin se distinge prin arhitectura interbelică, vile elegante, Parcul Rozelor și o densitate ridicată de cafenele și restaurante de autor. Atmosferă rezidențială liniștită la 10 minute pietonal de Piața Victoriei.' },
      { question: 'Sunt apartamente de închiriat Elisabetin Timișoara potrivite pentru investiții?', answer: 'Da. Cererea constantă din partea familiilor tinere și a turiștilor premium asigură ocupare ridicată în regim hotelier, cu randamente nete de 7-9%. Prețul mediu este 1.820 €/mp.' },
      { question: 'Cât de aproape este Elisabetin de universități?', answer: 'Tramvaiul direct leagă Elisabetin de Universitatea de Vest (UVT) și Universitatea Politehnica (UPT) în 8-12 minute, atrăgând și chiriași academici.' },
    ],
    listings: [
      { id: 'eli-1', title: 'Apartament 2 camere — vilă interbelică', price: 94600, pricePerSqm: 1820, rooms: 2, floor: 1, surface: 52, badge: 'administrare', imageAlt: 'Apartament Elisabetin lângă Parcul Rozelor' },
      { id: 'eli-2', title: 'Studio premium lângă Parcul Rozelor', price: 67000, pricePerSqm: 1860, rooms: 1, floor: 2, surface: 36, badge: 'administrare', imageAlt: 'Studio Elisabetin Parcul Rozelor' },
      { id: 'eli-3', title: 'Apartament 3 camere renovat complet', price: 154700, pricePerSqm: 1850, rooms: 3, floor: 2, surface: 84, badge: 'vanzare', imageAlt: 'Apartament 3 camere Elisabetin Timișoara' },
      { id: 'eli-4', title: 'Garsonieră elegantă — investiție', price: 59850, pricePerSqm: 1810, rooms: 1, floor: 3, surface: 33, badge: 'administrare', imageAlt: 'Garsonieră investiție Elisabetin Timișoara' },
    ],
  },
  {
    slug: 'dumbravita',
    name: 'Dumbrăvița',
    fullName: 'Dumbrăvița',
    avgPricePerSqm: 1680,
    listingsCount: 4,
    description:
      'Dumbrăvița este cea mai dinamică zonă metropolitană a Timișoarei, situată la nord-est de oraș, cu acces direct la centura Timișoara și la Aeroportul Internațional „Traian Vuia" (8 minute). Cartierul a explodat demografic în ultimii 10 ani datorită ansamblurilor rezidențiale noi (Iris Residence, Lipovei Residence, Cetatea Veche Residence), prețurilor accesibile (1.680 €/mp față de 2.000+ €/mp în Centru) și calității vieții pentru familii. Pădurea Verde, parc natural protejat la marginea cartierului, oferă spațiu de recreere unic în zonă. Infrastructura include 5+ școli și grădinițe (Școala „Dimitrie Țichindeal", Grădinița Smart Kids, Happy Kids), supermarketuri Lidl și Kaufland, Selgros la 3 minute și transport public regulat (autobuze E1, E4, 33). Profilul cumpărătorilor: familii tinere 28–45 ani, profesioniști IT din Iulius Town și Openville, navetiști care preferă liniștea suburbană. Casele de vânzare în Dumbrăvița (vile P+1, duplex-uri) variază între 180.000 și 380.000 €, iar terenurile intravilane între 80 și 150 €/mp. Apartamentele noi în ansamblurile rezidențiale au prețuri 65.000–145.000 €.',
    metaTitle: 'Imobiliare Dumbrăvița: Apartamente & Case Noi | RealTrust',
    metaDescription: 'Cauți apartamente noi sau case de vânzare în Dumbrăvița? Descoperă selecția premium de proprietăți, vile și ansambluri rezidențiale. Consultanță gratuită!',
    faq: [
      { question: 'Care este prețul mediu pe metru pătrat în Dumbrăvița?', answer: 'Prețul mediu este de 1.680 €/mp pentru apartamente noi, cu 15-20% sub media orașului Timișoara. Casele și vilele variază între 180.000 și 380.000 € în funcție de suprafață și nivelul de finisaje.' },
      { question: 'Ce ansambluri rezidențiale sunt disponibile în Dumbrăvița?', answer: 'Cele mai populare ansambluri rezidențiale Dumbrăvița sunt Iris Residence, Lipovei Residence, Cetatea Veche Residence și proiectele dezvoltatorilor locali — toate cu apartamente noi clasa A energetică, finisaje moderne și locuri de parcare incluse.' },
      { question: 'Sunt disponibile case de vânzare în Dumbrăvița?', answer: 'Da, oferim case de vânzare Dumbrăvița (vile P+1, duplex-uri și case individuale) între 180.000 și 380.000 €, în zone rezidențiale liniștite, aproape de școli și de Pădurea Verde.' },
      { question: 'Cum este accesul din Dumbrăvița spre centură și aeroport?', answer: 'Dumbrăvița are acces centura Timișoara direct (3 minute) și Aeroportul Internațional „Traian Vuia" la 8 minute cu mașina. Transport public regulat (autobuze E1, E4, 33) spre Iulius Town și Centru.' },
      { question: 'Ce școli și grădinițe sunt în Dumbrăvița?', answer: 'Dumbrăvița dispune de Școala Gimnazială „Dimitrie Țichindeal", grădinițele Smart Kids și Happy Kids, plus liceu particular Spectrum și creșe private — infrastructură educațională completă pentru familii.' },
      { question: 'Există terenuri intravilane de vânzare în Dumbrăvița?', answer: 'Da, intermediez teren intravilan Dumbrăvița între 80 și 150 €/mp pentru construcții rezidențiale (case, duplex-uri) sau pentru dezvoltatori interesați de ansambluri mici.' },
    ],
    listings: [
      { id: 'dum-1', title: 'Apartament 3 camere — Iris Residence', price: 138000, pricePerSqm: 1700, rooms: 3, floor: 2, surface: 81, badge: 'vanzare', imageAlt: 'Apartament nou Iris Residence Dumbrăvița' },
      { id: 'dum-2', title: 'Casă vilă P+1 — zonă rezidențială', price: 285000, pricePerSqm: 1850, rooms: 4, floor: 1, surface: 154, badge: 'vanzare', imageAlt: 'Casă vânzare Dumbrăvița lângă Pădurea Verde' },
      { id: 'dum-3', title: 'Apartament 2 camere — ansamblu nou', price: 92500, pricePerSqm: 1680, rooms: 2, floor: 3, surface: 55, badge: 'vanzare', imageAlt: 'Apartament 2 camere ansamblu rezidențial Dumbrăvița' },
      { id: 'dum-4', title: 'Duplex modern — finisaje premium', price: 215000, pricePerSqm: 1750, rooms: 4, floor: 1, surface: 123, badge: 'vanzare', imageAlt: 'Duplex Dumbrăvița finisaje premium' },
    ],
  },
  {
    slug: 'giroc',
    name: 'Giroc',
    fullName: 'Giroc',
    avgPricePerSqm: 1620,
    listingsCount: 4,
    description:
      'Giroc este una dintre cele mai căutate comune metropolitane de la sud de Timișoara, situată la 10 minute de Centru și la 5 minute de Shopping City Timișoara (Auchan). Giroc s-a transformat radical în ultimii 8 ani — de la sat tradițional la pol rezidențial premium pentru familii tinere și profesioniști care lucrează la Continental, Hella și în zona industrială Calea Șagului. Apartamentele de vânzare în Giroc au prețuri 1.500–1.800 €/mp (medie 1.620 €/mp), iar casele noi în ansambluri rezidențiale variază între 165.000 și 320.000 €. Ansamblurile rezidențiale principale: Green Forest Residence, Pădurea Verde Giroc, Lake View Residence și City Garden Giroc — toate cu apartamente clasa A energetică, parcare inclusă și locuri de joacă pentru copii. Infrastructura include Primăria Giroc, 3 școli (Școala Gimnazială Giroc, Liceul Tehnologic), 5+ grădinițe, supermarketuri Lidl și Penny, plus stadionul comunal renovat. Transport în comun Giroc Timișoara: autobuze 33 și 40 cu frecvență 15 minute spre Piața Maria și UVT (drum 25 min ora de vârf, 12 min în afara orelor de vârf). Terenuri intravilane Giroc: 70–130 €/mp, ideale pentru construcții familiale. Avantaje: liniște, spațiu verde abundent (lacul Giroc, parcuri), aer curat. Dezavantaje: trafic aglomerat dimineața pe DJ595 spre centru.',
    metaTitle: 'Apartamente de Vânzare și Închiriat Giroc | Imobiliare RealTrust',
    metaDescription: 'Cauți apartamente sau case în Giroc? Descoperă oferte de vânzare și închirieri în ansambluri noi și vechi. Consultanță imobiliară completă. Contactează RealTrust!',
    faq: [
      { question: 'Care este prețul mediu pe metru pătrat în Giroc?', answer: 'Apartamentele de vânzare în Giroc au prețuri 1.500–1.800 €/mp (medie 1.620 €/mp). Casele noi variază între 165.000 și 320.000 €, iar terenurile intravilane Giroc între 70 și 130 €/mp.' },
      { question: 'Ce ansambluri rezidențiale sunt disponibile în Giroc?', answer: 'Principalele ansambluri rezidențiale Giroc sunt Green Forest Residence, Pădurea Verde Giroc, Lake View Residence și City Garden Giroc — apartamente clasa A energetică, parcare inclusă și locuri de joacă.' },
      { question: 'Ce școli și grădinițe sunt în Giroc?', answer: 'Giroc dispune de Școala Gimnazială Giroc, Liceul Tehnologic, plus 5+ grădinițe publice și private. Infrastructură educațională completă pentru familii cu copii.' },
      { question: 'Cum este transportul în comun Giroc Timișoara?', answer: 'Autobuzele 33 și 40 leagă Giroc de Piața Maria și UVT cu frecvență de 15 minute. Drumul durează 12 minute în afara orelor de vârf și 25 minute la ora de vârf pe DJ595.' },
      { question: 'Cât durează drumul până în centrul Timișoarei la ora de vârf?', answer: 'Drumul cu mașina din Giroc spre Centru durează 12 minute în afara orelor de vârf și 25–30 minute la ora de vârf (08:00–09:30 și 17:00–18:30) pe DJ595.' },
      { question: 'Ce magazine și facilități sunt în Giroc?', answer: 'Magazine Giroc: Lidl, Penny Market, supermarket-uri locale, farmacii, plus Shopping City Timișoara (Auchan) la 5 minute. Stadion comunal renovat, lac Giroc și parcuri pentru recreere.' },
      { question: 'Există case noi de vânzare în Giroc?', answer: 'Da, case noi Giroc între 165.000 și 320.000 € — vile P+1, duplex-uri și case individuale în zone rezidențiale liniștite, în ansambluri ca Green Forest sau Lake View.' },
    ],
    listings: [
      { id: 'gir2-1', title: 'Apartament 2 camere — Green Forest Giroc', price: 89000, pricePerSqm: 1620, rooms: 2, floor: 2, surface: 55, badge: 'vanzare', imageAlt: 'Apartament 2 camere Green Forest Giroc' },
      { id: 'gir2-2', title: 'Casă vilă P+1 — zona Pădurea Verde Giroc', price: 245000, pricePerSqm: 1700, rooms: 4, floor: 1, surface: 144, badge: 'vanzare', imageAlt: 'Casă vilă Pădurea Verde Giroc' },
      { id: 'gir2-3', title: 'Apartament 3 camere — Lake View Giroc', price: 132000, pricePerSqm: 1650, rooms: 3, floor: 3, surface: 80, badge: 'vanzare', imageAlt: 'Apartament 3 camere Lake View Giroc' },
      { id: 'gir2-4', title: 'Duplex modern — City Garden Giroc', price: 198000, pricePerSqm: 1720, rooms: 4, floor: 1, surface: 115, badge: 'vanzare', imageAlt: 'Duplex City Garden Giroc' },
    ],
  },
];

export const getNeighborhoodBySlug = (slug: string): NeighborhoodData | undefined =>
  neighborhoods.find((n) => n.slug === slug);
