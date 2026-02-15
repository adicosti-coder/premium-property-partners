// Property image imports — v4
import apt01 from "@/assets/apt-01.jpg";
const apt02 = "/properties/fullview-studio.jpg";
import apt03 from "@/assets/apt-03.jpg";
import apt04 from "@/assets/apt-04.jpg";
import apt05 from "@/assets/apt-05.jpg";
import apt06 from "@/assets/apt-06.jpg";
import apt07 from "@/assets/apt-07.jpg";
import apt08 from "@/assets/apt-08.jpg";
import apt09 from "@/assets/apt-09.jpg";
import apt11 from "@/assets/apt-11.jpg";
const modernStudio = "/properties/modern-studio.jpg";
import helios from "@/assets/helios.jpg";

export interface Property {
  id: number;
  slug: string;
  name: string;
  location: string;
  images: string[];
  features: string[];
  bookingUrl: string;
  description: string;
  descriptionEn: string;
  longDescription: string;
  longDescriptionEn: string;
  rating: number;
  reviews: number;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  pricePerNight: number;
  amenities: string[];
  amenitiesEn: string[];
  houseRules: string[];
  houseRulesEn: string[];
  checkInTime: string;
  checkOutTime: string;
  isActive?: boolean; // Default true, set false to hide property
}

export const properties: Property[] = [
  {
    id: 1,
    slug: "ring-apart-hotel-spacious-deluxe",
    name: "RING ApArt Hotel - Spacious DeLuxe Apartment",
    location: "Strada Loichița Vasile",
    images: [apt09],
    features: ["Terasă Mare", "Parcare Subterană", "WiFi"],
    bookingUrl: "https://ring.pynbooking.direct/",
    description: "Apartament spațios cu terasă mare și parcare subterană gratuită",
    descriptionEn: "Spacious apartment with big terrace and free underground parking",
    longDescription: "RING ApArt Hotel pe Strada Loichița Vasile 1-3, sc.B, et.3, ap.19 oferă un apartament generos de 80mp cu terasă mare și parcare subterană gratuită. Spațiu ideal pentru familii sau grupuri care caută confort și eleganță în Timișoara.",
    longDescriptionEn: "RING ApArt Hotel on Strada Loichița Vasile 1-3, sc.B, et.3, ap.19 offers a generous 80sqm apartment with big terrace and free underground parking. Ideal space for families or groups seeking comfort and elegance in Timișoara.",
    rating: 9.7,
    reviews: 27,
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    size: 80,
    amenities: ["WiFi de mare viteză", "Smart TV 55\"", "Aer condiționat", "Mașină de spălat", "Bucătărie complet utilată", "Parcare subterană gratuită", "Auto check-in", "Terasă mare", "Lenjerie premium", "Transfer aeroport"],
    amenitiesEn: ["High-speed WiFi", "55\" Smart TV", "Air conditioning", "Washing machine", "Fully equipped kitchen", "Free underground parking", "Self check-in", "Large terrace", "Premium linens", "Airport shuttle"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Fără petreceri", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "No parties", "Quiet hours after 10 PM"],
    pricePerNight: 85,
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 2,
    slug: "green-forest-apart-hotel",
    name: "GREEN FOREST ApArt Hotel",
    location: "Denya Forest",
    images: [apt06],
    features: ["Balcon", "Parcare Gratuită", "WiFi"],
    bookingUrl: "https://denya-forest-5.pynbooking.direct/",
    description: "Apartament DeLuxe cu balcon, parcare gratuită, lângă Amazonia",
    descriptionEn: "DeLuxe apartment with balcony, free parking, near Amazonia",
    longDescription: "GREEN FOREST ApArt Hotel este situat pe Strada Constructorilor 52, în complexul Denya Forest 5, Et.7, apt.73. Oferă un apartament spațios de 58mp cu balcon, parcare gratuită și apropierea de parcul acvatic Amazonia. Rating excepțional 10/10!",
    longDescriptionEn: "GREEN FOREST ApArt Hotel is located on Strada Constructorilor 52, in the Denya Forest 5 complex, floor 7, apt.73. It offers a spacious 58sqm apartment with balcony, free parking and proximity to Amazonia water park. Exceptional 10/10 rating!",
    rating: 10.0,
    reviews: 5,
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    size: 58,
    amenities: ["WiFi de mare viteză", "Smart TV", "Aer condiționat", "Bucătărie complet utilată", "Parcare gratuită", "Auto check-in", "Balcon", "Transfer aeroport", "Vedere panoramică"],
    amenitiesEn: ["High-speed WiFi", "Smart TV", "Air conditioning", "Fully equipped kitchen", "Free parking", "Self check-in", "Balcony", "Airport shuttle", "Panoramic view"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "Quiet hours after 10 PM"],
    pricePerNight: 75,
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 3,
    slug: "fructus-plaza-ultracentral-apart-hotel",
    name: "Fructus Plaza ULTRACENTRAL ApArt Hotel",
    location: "Fructus Plaza",
    images: [apt04],
    features: ["Parcare Gratuită", "Balcon Mare", "WiFi"],
    bookingUrl: "https://fructus-plaza.pynbooking.direct/",
    description: "Apartament DeLuxe ultracentral cu parcare gratuită și balcon mare",
    descriptionEn: "Ultracentral DeLuxe apartment with free parking and big balcony",
    longDescription: "Fructus Plaza ULTRACENTRAL ApArt Hotel, Et.7, ap.19, oferă un apartament DeLuxe spațios de 100mp într-o poziție privilegiată în centrul Timișoarei. Balconul generos și parcarea gratuită fac din acest loc alegerea perfectă pentru sejururi de afaceri sau leisure.",
    longDescriptionEn: "Fructus Plaza ULTRACENTRAL ApArt Hotel, floor 7, apt.19, offers a spacious 100sqm DeLuxe apartment in a privileged position in downtown Timișoara. The generous balcony and free parking make this place the perfect choice for business or leisure stays.",
    rating: 9.5,
    reviews: 29,
    capacity: 6,
    bedrooms: 2,
    bathrooms: 1,
    size: 100,
    amenities: ["WiFi de mare viteză", "Smart TV", "Aer condiționat", "Bucătărie complet utilată", "Parcare gratuită", "Auto check-in", "Balcon mare", "Transfer aeroport", "Baie privată"],
    amenitiesEn: ["High-speed WiFi", "Smart TV", "Air conditioning", "Fully equipped kitchen", "Free parking", "Self check-in", "Large balcony", "Airport shuttle", "Private bathroom"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "Quiet hours after 10 PM"],
    pricePerNight: 95,
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 4,
    slug: "fullview-studio-deluxe",
    name: "FullView Studio DeLuxe",
    location: "City of Mara",
    images: [apt02],
    features: ["Parcare Subterană", "WiFi", "Premium"],
    bookingUrl: "https://m9.pynbooking.direct/",
    description: "Studio DeLuxe cu parcare subterană gratuită",
    descriptionEn: "DeLuxe studio with free underground parking",
    longDescription: "FullView Studio DeLuxe în complexul City of Mara M9, et.9, ap.75 oferă un spațiu modern de 40mp cu parcare subterană inclusă. Design contemporan și dotări premium pentru o experiență de cazare de top în Timișoara.",
    longDescriptionEn: "FullView Studio DeLuxe in the City of Mara M9 complex, floor 9, apt.75 offers a modern 40sqm space with underground parking included. Contemporary design and premium amenities for a top accommodation experience in Timișoara.",
    rating: 9.6,
    reviews: 59,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 40,
    amenities: ["WiFi de mare viteză", "Smart TV", "Aer condiționat", "Bucătărie utilată", "Parcare subterană gratuită", "Auto check-in", "Balcon", "Transfer aeroport", "Vedere panoramică"],
    amenitiesEn: ["High-speed WiFi", "Smart TV", "Air conditioning", "Equipped kitchen", "Free underground parking", "Self check-in", "Balcony", "Airport shuttle", "Panoramic view"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "Quiet hours after 10 PM"],
    pricePerNight: 65,
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 5,
    slug: "avenue-of-mara-apart-hotel",
    name: "AVENUE of MARA ApArt Hotel",
    location: "Circumvalațiunii",
    images: [apt03],
    features: ["Ultracentral", "Parcare Subterană", "WiFi"],
    bookingUrl: "https://apart-hotel.pynbooking.direct/",
    description: "Studio DeLuxe ultracentral cu parcare subterană gratuită",
    descriptionEn: "Ultracentral DeLuxe studio with free underground parking",
    longDescription: "AVENUE of MARA ApArt Hotel pe Calea Circumvalațiunii nr.1, City of Mara M8, et.1, ap.5 oferă un studio ultracentral de 40mp cu parcare subterană. Combină locația premium cu confortul modern pentru o experiență de neuitat.",
    longDescriptionEn: "AVENUE of MARA ApArt Hotel on Calea Circumvalațiunii nr.1, City of Mara M8, floor 1, apt.5 offers an ultracentral 40sqm studio with underground parking. Combines premium location with modern comfort for an unforgettable experience.",
    rating: 9.4,
    reviews: 85,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 40,
    amenities: ["WiFi de mare viteză", "Smart TV", "Aer condiționat", "Bucătărie utilată", "Parcare subterană gratuită", "Auto check-in", "Balcon", "Transfer aeroport", "Baie privată"],
    amenitiesEn: ["High-speed WiFi", "Smart TV", "Air conditioning", "Equipped kitchen", "Free underground parking", "Self check-in", "Balcony", "Airport shuttle", "Private bathroom"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "Quiet hours after 10 PM"],
    pricePerNight: 60,
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 6,
    slug: "helios-apart-hotel",
    name: "HELIOS ApArt Hotel - DeLuxe Residence",
    location: "Strada Argeș",
    images: [helios],
    features: ["Central", "Parcare", "WiFi"],
    bookingUrl: "https://helios.pynbooking.direct/",
    description: "Reședință DeLuxe aproape de centrul orașului",
    descriptionEn: "DeLuxe residence close to the city center",
    longDescription: "HELIOS ApArt Hotel pe Strada Argeș 4 oferă o reședință DeLuxe de 50mp cu acces facil la centrul Timișoarei. Spațiu confortabil și modern cu balcon, parcare și transfer aeroport inclus.",
    longDescriptionEn: "HELIOS ApArt Hotel on Strada Argeș 4 offers a 50sqm DeLuxe residence with easy access to downtown Timișoara. Comfortable and modern space with balcony, parking and airport shuttle included.",
    rating: 9.2,
    reviews: 16,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 50,
    amenities: ["WiFi de mare viteză", "Smart TV", "Aer condiționat", "Bucătărie complet utilată", "Parcare", "Balcon", "Transfer aeroport", "Vedere", "Camere nefumători"],
    amenitiesEn: ["High-speed WiFi", "Smart TV", "Air conditioning", "Fully equipped kitchen", "Parking", "Balcony", "Airport shuttle", "View", "Non-smoking rooms"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "Quiet hours after 10 PM"],
    pricePerNight: 55,
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 7,
    slug: "ateneo-trevi-2-apart-hotel",
    name: "ATENEO - TREVI 2 ApArt Hotel",
    location: "Calea Torontalului",
    images: [apt05],
    features: ["Terasă Mare", "Parcare Gratuită", "WiFi"],
    bookingUrl: "https://ateneo-2.pynbooking.direct/",
    description: "Apartament modern DeLuxe cu terasă mare și parcare gratuită",
    descriptionEn: "Modern DeLuxe apartment with big terrace and free parking",
    longDescription: "ATENEO - TREVI 2 ApArt Hotel pe Calea Torontalului 104K oferă un apartament modern de 68mp cu terasă generoasă și parcare gratuită. Design contemporan cu toate facilitățile necesare pentru un sejur confortabil.",
    longDescriptionEn: "ATENEO - TREVI 2 ApArt Hotel on Calea Torontalului 104K offers a modern 68sqm apartment with generous terrace and free parking. Contemporary design with all necessary amenities for a comfortable stay.",
    rating: 9.5,
    reviews: 37,
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    size: 68,
    amenities: ["WiFi de mare viteză", "Smart TV", "Aer condiționat", "Mașină de spălat", "Bucătărie complet utilată", "Parcare gratuită", "Auto check-in", "Terasă mare", "Transfer aeroport"],
    amenitiesEn: ["High-speed WiFi", "Smart TV", "Air conditioning", "Washing machine", "Fully equipped kitchen", "Free parking", "Self check-in", "Large terrace", "Airport shuttle"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Fără petreceri", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "No parties", "Quiet hours after 10 PM"],
    pricePerNight: 80,
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 8,
    slug: "sunset-da-ra-studio-deluxe",
    name: "Sunset Da-Ra - Studio DeLuxe",
    location: "Circumvalațiunii",
    images: [apt11],
    features: ["Parcare Subterană", "WiFi", "Modern"],
    bookingUrl: "https://m11.pynbooking.direct/",
    description: "Studio DeLuxe cu parcare subterană gratuită - by FullViewTour",
    descriptionEn: "DeLuxe studio with free underground parking - by FullViewTour",
    longDescription: "Sunset Da-Ra pe Circumvalațiunii M11 Et.6, ap.51 oferă un studio elegant de 42mp cu parcare subterană gratuită. Parte din portofoliul FullViewTour, acest apartament combină confortul modern cu o locație accesibilă în Timișoara.",
    longDescriptionEn: "Sunset Da-Ra on Circumvalațiunii M11 floor 6, apt.51 offers an elegant 42sqm studio with free underground parking. Part of the FullViewTour portfolio, this apartment combines modern comfort with an accessible location in Timișoara.",
    rating: 9.4,
    reviews: 15,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 42,
    amenities: ["WiFi de mare viteză", "Smart TV", "Aer condiționat", "Bucătărie utilată", "Parcare subterană gratuită", "Balcon", "Baie privată", "Camere nefumători", "Duș"],
    amenitiesEn: ["High-speed WiFi", "Smart TV", "Air conditioning", "Equipped kitchen", "Free underground parking", "Balcony", "Private bathroom", "Non-smoking rooms", "Shower"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "Quiet hours after 10 PM"],
    pricePerNight: 58,
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 9,
    slug: "mara-luxury-golden-apart-hotel",
    name: "MARA Luxury Golden ApArt Hotel",
    location: "Ultracentral",
    images: [apt01],
    features: ["Ultracentral", "Parcare Gratuită", "WiFi"],
    bookingUrl: "https://www.booking.com/hotel/ro/mara-gold-accent-deluxe-residence.html",
    description: "Apartament ultracentral de lux cu parcare gratuită",
    descriptionEn: "Ultracentral luxury apartment with free parking",
    longDescription: "MARA Luxury Golden ApArt Hotel pe Strada Sinaia nr.2B, sc.5, et.7, ap.45 oferă o experiență de cazare premium de 54mp. Cu design deosebit, finisaje de lux, parcare gratuită și acces facil la toate atracțiile din centrul orașului. Rating excepțional 9.8/10!",
    longDescriptionEn: "MARA Luxury Golden ApArt Hotel on Strada Sinaia nr.2B, sc.5, floor 7, apt.45 offers a premium 54sqm accommodation experience. With distinctive design, luxury finishes, free parking and easy access to all attractions in the city center. Exceptional 9.8/10 rating!",
    rating: 9.8,
    reviews: 13,
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    size: 54,
    amenities: ["WiFi de mare viteză", "Smart TV", "Aer condiționat", "Bucătărie complet utilată", "Parcare gratuită", "Transfer aeroport", "Vedere", "Camere nefumători", "Baie privată"],
    amenitiesEn: ["High-speed WiFi", "Smart TV", "Air conditioning", "Fully equipped kitchen", "Free parking", "Airport shuttle", "View", "Non-smoking rooms", "Private bathroom"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Fără petreceri", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "No parties", "Quiet hours after 10 PM"],
    pricePerNight: 90,
    checkInTime: "15:00",
    checkOutTime: "11:00",
    isActive: false, // Temporar ascunsă
  },
  {
    id: 10,
    slug: "ateneo-apart-hotel-studio-deluxe",
    name: "ATENEO ApArt Hotel - Studio DeLuxe",
    location: "Calea Torontalului",
    images: [apt07],
    features: ["Balcon Mare", "Parcare Gratuită", "WiFi"],
    bookingUrl: "https://ateneo-1.pynbooking.direct/",
    description: "Apartament modern cu balcon mare și parcare gratuită",
    descriptionEn: "Modern apartment with big balcony and free parking",
    longDescription: "ATENEO ApArt Hotel - Studio DeLuxe pe Calea Torontalului 104K, Trevi 2, et.4, ap.23 oferă un apartament modern de 44mp cu balcon generos și parcare gratuită. Design elegant pentru o experiență de cazare memorabilă.",
    longDescriptionEn: "ATENEO ApArt Hotel - Studio DeLuxe on Calea Torontalului 104K, Trevi 2, floor 4, apt.23 offers a modern 44sqm apartment with generous balcony and free parking. Elegant design for a memorable accommodation experience.",
    rating: 9.4,
    reviews: 22,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 44,
    amenities: ["WiFi de mare viteză", "Smart TV", "Aer condiționat", "Bucătărie utilată", "Parcare gratuită", "Balcon mare", "Transfer aeroport", "Baie privată"],
    amenitiesEn: ["High-speed WiFi", "Smart TV", "Air conditioning", "Equipped kitchen", "Free parking", "Large balcony", "Airport shuttle", "Private bathroom"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Fără petreceri", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "No parties", "Quiet hours after 10 PM"],
    pricePerNight: 68,
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
  {
    id: 11,
    slug: "modern-studio-apart-hotel",
    name: "MODERN Studio ApArt Hotel",
    location: "Simion Bărnuțiu",
    images: [modernStudio],
    features: ["Parcare", "WiFi", "Lângă Amazonia"],
    bookingUrl: "https://modern.pynbooking.direct/",
    description: "Studio modern lângă AquaPark Amazonia și Spitalele Babeș și Cardiologie",
    descriptionEn: "Modern studio near AquaPark Amazonia and Babes and Cardiology Hospitals",
    longDescription: "MODERN Studio ApArt Hotel pe Strada Simion Bărnuțiu 79, Et.5 oferă un spațiu modern de 36mp, perfect pentru cei care vizitează AquaPark Amazonia sau spitalele din zonă. Design contemporan cu toate facilitățile necesare.",
    longDescriptionEn: "MODERN Studio ApArt Hotel on Strada Simion Bărnuțiu 79, floor 5 offers a modern 36sqm space, perfect for those visiting AquaPark Amazonia or nearby hospitals. Contemporary design with all necessary amenities.",
    rating: 9.4,
    reviews: 10,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    size: 36,
    amenities: ["WiFi de mare viteză", "Smart TV", "Aer condiționat", "Bucătărie utilată", "Parcare gratuită", "Balcon", "Baie privată", "Camere nefumători", "Duș"],
    amenitiesEn: ["High-speed WiFi", "Smart TV", "Air conditioning", "Equipped kitchen", "Free parking", "Balcony", "Private bathroom", "Non-smoking rooms", "Shower"],
    houseRules: ["Fără fumat", "Fără animale de companie", "Liniște după ora 22:00"],
    houseRulesEn: ["No smoking", "No pets", "Quiet hours after 10 PM"],
    pricePerNight: 52,
    checkInTime: "15:00",
    checkOutTime: "11:00",
  },
];

// Get all active properties (filters out properties with isActive: false)
export const getActiveProperties = (): Property[] => {
  return properties.filter((property) => property.isActive !== false);
};

export const getPropertyBySlug = (slug: string): Property | undefined => {
  return properties.find((property) => property.slug === slug);
};

export const getPropertyById = (id: number): Property | undefined => {
  return properties.find((property) => property.id === id);
};
