import apt01 from "@/assets/apt-01.jpg";
import apt02 from "@/assets/apt-02.jpg";
import apt03 from "@/assets/apt-03.jpg";
import apt04 from "@/assets/apt-04.jpg";
import apt05 from "@/assets/apt-05.jpg";
import apt06 from "@/assets/apt-06.jpg";
import apt07 from "@/assets/apt-07.jpg";
import apt08 from "@/assets/apt-08.jpg";
import apt09 from "@/assets/apt-09.jpg";
import apt11 from "@/assets/apt-11.jpg";

export interface Property {
  id: number;
  slug: string;
  name: string;
  location: string;
  images: string[];
  features: string[];
  bookingUrl: string;
  description: string;
  longDescription: string;
  rating: number;
  reviews: number;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  amenities: string[];
  houseRules: string[];
  checkInTime: string;
  checkOutTime: string;
}

export const properties: Property[] = [
  {
    id: 1,
    slug: "mara-luxury-golden-apart",
    name: "MARA Luxury Golden ApArt",
    location: "Ultracentral",
    images: [apt01, apt02, apt03],
    features: ["Auto Check-in", "Parcare", "WiFi"],
    bookingUrl: "https://booking.com",
    description: "Apartament elegant cu finisaje de lux în inima orașului",
    longDescription: "Descoperă rafinamentul și confortul într-un apartament de excepție, situat în centrul vibrării Timișoarei. Cu finisaje premium, decorațiuni elegante și dotări moderne, MARA Luxury Golden ApArt oferă o experiență de cazare memorabilă. Ideal pentru cupluri sau familii mici care caută luxul și comoditatea în centrul orașului.",
    rating: 4.9,
    reviews: 127,
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    size: 65,
    amenities: ["WiFi de mare viteză", "Smart TV 55\"", "Aer condiționat", "Mașină de spălat", "Bucătărie complet utilată", "Parcare privată", "Auto check-in cu cod", "Lenjerie premium", "Produse de curățenie", "Uscător de păr"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Fără petreceri", "Liniște după ora 22:00"],
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 2,
    slug: "elegance-suite-timisoara",
    name: "Elegance Suite Timișoara",
    location: "Piața Victoriei",
    images: [apt02, apt01, apt04],
    features: ["Auto Check-in", "WiFi", "AC"],
    bookingUrl: "https://booking.com",
    description: "Suită modernă cu vedere panoramică spre piață",
    longDescription: "Situată la doar câțiva pași de emblematica Piață Victoriei, această suită modernă îmbină stilul contemporan cu confortul suprem. Bucură-te de vederi panoramice spectaculoase și de acces facil la cele mai bune restaurante, cafenele și atracții turistice din Timișoara.",
    rating: 4.8,
    reviews: 89,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 45,
    amenities: ["WiFi de mare viteză", "Smart TV 43\"", "Aer condiționat", "Bucătărie complet utilată", "Auto check-in cu cod", "Lenjerie premium", "Espressor Nespresso", "Balcon cu vedere"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Liniște după ora 22:00"],
    checkInTime: "14:00",
    checkOutTime: "11:00",
  },
  {
    id: 3,
    slug: "modern-loft-central",
    name: "Modern Loft Central",
    location: "Cetate",
    images: [apt03, apt05, apt06],
    features: ["Parcare", "WiFi", "Smart TV"],
    bookingUrl: "https://booking.com",
    description: "Loft industrial cu design contemporan și dotări premium",
    longDescription: "Un spațiu unic cu design industrial-modern, ce combină estetica contemporană cu funcționalitatea maximă. Tavanele înalte, lumina naturală abundentă și finisajele de calitate creează o atmosferă unică, perfectă pentru city breaks sau sejururi de afaceri.",
    rating: 4.9,
    reviews: 156,
    capacity: 3,
    bedrooms: 1,
    bathrooms: 1,
    size: 55,
    amenities: ["WiFi de mare viteză", "Smart TV 55\"", "Aer condiționat", "Mașină de spălat", "Bucătărie complet utilată", "Parcare subterană", "Sistem audio Sonos", "Iluminat ambient"],
    houseRules: ["Fără fumat", "Animale mici acceptate", "Fără petreceri"],
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 4,
    slug: "cozy-studio-premium",
    name: "Cozy Studio Premium",
    location: "Fabric",
    images: [apt04, apt07, apt08],
    features: ["Auto Check-in", "WiFi"],
    bookingUrl: "https://booking.com",
    description: "Studio confortabil, perfect pentru city breaks",
    longDescription: "Un studio compact dar perfect echipat, ideal pentru călătorii solo sau cupluri care explorează Timișoara. Situat în cartierul istoric Fabric, oferă acces rapid la centrul orașului și la principalele atracții turistice.",
    rating: 4.7,
    reviews: 64,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 32,
    amenities: ["WiFi de mare viteză", "Smart TV 40\"", "Aer condiționat", "Chicineta", "Auto check-in cu cod", "Lenjerie premium"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Liniște după ora 22:00"],
    checkInTime: "14:00",
    checkOutTime: "10:00",
  },
  {
    id: 5,
    slug: "grand-view-apartment",
    name: "Grand View Apartment",
    location: "Iosefin",
    images: [apt05, apt09, apt11],
    features: ["Parcare", "WiFi", "Balcon"],
    bookingUrl: "https://booking.com",
    description: "Apartament spațios cu balcon și priveliște spectaculoasă",
    longDescription: "Un apartament generos cu 3 dormitoare, perfect pentru familii sau grupuri de prieteni. Balconul spațios oferă vederi spectaculoase peste cartierul Iosefin, unul dintre cele mai frumoase din Timișoara. Dotări complete pentru sejururi lungi sau scurte.",
    rating: 4.8,
    reviews: 92,
    capacity: 6,
    bedrooms: 3,
    bathrooms: 2,
    size: 95,
    amenities: ["WiFi de mare viteză", "Smart TV în living", "Aer condiționat în fiecare cameră", "Mașină de spălat și uscător", "Bucătărie complet utilată", "Parcare privată", "Balcon mare", "Lenjerie premium", "Pat pliant suplimentar"],
    houseRules: ["Fără fumat în interior", "Animale mici acceptate", "Fără petreceri zgomotoase"],
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 6,
    slug: "executive-suite-tm",
    name: "Executive Suite TM",
    location: "Ultracentral",
    images: [apt06, apt01, apt02],
    features: ["Auto Check-in", "Parcare", "WiFi"],
    bookingUrl: "https://booking.com",
    description: "Suită executivă ideală pentru călătorii de afaceri",
    longDescription: "Proiectată special pentru profesioniști și călători de afaceri, Executive Suite oferă un spațiu de lucru dedicat, internet ultra-rapid și toate facilitățile necesare pentru productivitate maximă. Locația centrală asigură acces rapid la principalele puncte de interes din oraș.",
    rating: 5.0,
    reviews: 78,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 50,
    amenities: ["WiFi de mare viteză - 500 Mbps", "Birou ergonomic", "Monitor extern disponibil", "Smart TV 50\"", "Aer condiționat", "Espressor premium", "Parcare în garaj", "Auto check-in"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Business casual environment"],
    checkInTime: "14:00",
    checkOutTime: "12:00",
  },
  {
    id: 7,
    slug: "urban-retreat-studio",
    name: "Urban Retreat Studio",
    location: "Mehala",
    images: [apt07, apt04, apt03],
    features: ["WiFi", "AC", "Bucătărie"],
    bookingUrl: "https://booking.com",
    description: "Refugiu urban cu toate facilitățile necesare",
    longDescription: "Un spațiu liniștit și confortabil, perfect pentru cei care caută o evadare din agitația urbană. Deși situat într-o zonă rezidențială liniștită, beneficiezi de acces facil la centrul orașului prin transport public.",
    rating: 4.6,
    reviews: 45,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 38,
    amenities: ["WiFi de mare viteză", "Smart TV 43\"", "Aer condiționat", "Bucătărie complet utilată", "Lenjerie premium", "Zonă de relaxare"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Liniște după ora 21:00"],
    checkInTime: "15:00",
    checkOutTime: "10:00",
  },
  {
    id: 8,
    slug: "deluxe-city-apartment",
    name: "Deluxe City Apartment",
    location: "Piața Unirii",
    images: [apt08, apt06, apt05],
    features: ["Auto Check-in", "Parcare", "WiFi"],
    bookingUrl: "https://booking.com",
    description: "Apartament deluxe în zona istorică a orașului",
    longDescription: "Situat în inima zonei istorice, lângă magnifica Piață Unirii, acest apartament deluxe oferă o combinație perfectă între eleganță clasică și confort modern. Plimbă-te prin cele mai frumoase străzi ale Timișoarei direct din ușa ta.",
    rating: 4.9,
    reviews: 134,
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    size: 70,
    amenities: ["WiFi de mare viteză", "Smart TV în fiecare cameră", "Aer condiționat", "Mașină de spălat", "Bucătărie complet utilată", "Loc de parcare dedicat", "Auto check-in premium", "Lenjerie de lux"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Fără petreceri", "Respect pentru vecinătate"],
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 9,
    slug: "premium-corner-suite",
    name: "Premium Corner Suite",
    location: "Cetate",
    images: [apt09, apt11, apt01],
    features: ["Parcare", "WiFi", "Smart TV"],
    bookingUrl: "https://booking.com",
    description: "Suită de colț cu lumină naturală abundentă",
    longDescription: "O suită luminoasă situată la colț de clădire, beneficiind de ferestre mari pe două laturi. Lumina naturală abundentă și vederea panoramică fac din acest spațiu o alegere excelentă pentru cei care apreciază aerul și luminozitatea.",
    rating: 4.8,
    reviews: 67,
    capacity: 3,
    bedrooms: 1,
    bathrooms: 1,
    size: 52,
    amenities: ["WiFi de mare viteză", "Smart TV 55\"", "Aer condiționat", "Bucătărie complet utilată", "Parcare în curte", "Terasă mică", "Jaluzele blackout", "Lenjerie premium"],
    houseRules: ["Fără fumat", "Animale mici acceptate cu aprobare", "Fără petreceri"],
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 10,
    slug: "timisoara-central-lux",
    name: "Timișoara Central Lux",
    location: "Ultracentral",
    images: [apt11, apt08, apt09],
    features: ["Auto Check-in", "Parcare", "WiFi"],
    bookingUrl: "https://booking.com",
    description: "Lux și confort în centrul vibrant al Timișoarei",
    longDescription: "Experimentează cel mai înalt nivel de confort și eleganță în centrul Timișoarei. Timișoara Central Lux combină designul sofisticat cu tehnologia modernă, oferind o experiență de cazare de neuitat pentru cei mai pretențioși oaspeți.",
    rating: 4.9,
    reviews: 189,
    capacity: 5,
    bedrooms: 2,
    bathrooms: 2,
    size: 85,
    amenities: ["WiFi ultra-rapid - 1 Gbps", "Smart TV 65\" 4K", "Aer condiționat în fiecare cameră", "Mașină de spălat și uscător", "Bucătărie premium Bosch", "Parcare subterană", "Sistem smart home", "Jacuzzi", "Espressor De'Longhi", "Lenjerie de lux egipteană"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Fără petreceri", "Check-in flexibil disponibil"],
    checkInTime: "15:00",
    checkOutTime: "12:00",
  },
];

export const getPropertyBySlug = (slug: string): Property | undefined => {
  return properties.find(p => p.slug === slug);
};

export const getPropertyById = (id: number): Property | undefined => {
  return properties.find(p => p.id === id);
};