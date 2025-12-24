import { useState } from "react";
import { MapPin, Wifi, Car, Key, ExternalLink, X, ChevronLeft, ChevronRight, Star, Users, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import all apartment images
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

interface Property {
  id: number;
  name: string;
  location: string;
  image: string;
  features: string[];
  bookingUrl: string;
  description: string;
  rating: number;
  reviews: number;
  capacity: number;
  bedrooms: number;
}

const properties: Property[] = [
  {
    id: 1,
    name: "MARA Luxury Golden ApArt",
    location: "Ultracentral",
    image: apt01,
    features: ["Auto Check-in", "Parcare", "WiFi"],
    bookingUrl: "https://booking.com",
    description: "Apartament elegant cu finisaje de lux în inima orașului",
    rating: 4.9,
    reviews: 127,
    capacity: 4,
    bedrooms: 2,
  },
  {
    id: 2,
    name: "Elegance Suite Timișoara",
    location: "Piața Victoriei",
    image: apt02,
    features: ["Auto Check-in", "WiFi", "AC"],
    bookingUrl: "https://booking.com",
    description: "Suită modernă cu vedere panoramică spre piață",
    rating: 4.8,
    reviews: 89,
    capacity: 2,
    bedrooms: 1,
  },
  {
    id: 3,
    name: "Modern Loft Central",
    location: "Cetate",
    image: apt03,
    features: ["Parcare", "WiFi", "Smart TV"],
    bookingUrl: "https://booking.com",
    description: "Loft industrial cu design contemporan și dotări premium",
    rating: 4.9,
    reviews: 156,
    capacity: 3,
    bedrooms: 1,
  },
  {
    id: 4,
    name: "Cozy Studio Premium",
    location: "Fabric",
    image: apt04,
    features: ["Auto Check-in", "WiFi"],
    bookingUrl: "https://booking.com",
    description: "Studio confortabil, perfect pentru city breaks",
    rating: 4.7,
    reviews: 64,
    capacity: 2,
    bedrooms: 1,
  },
  {
    id: 5,
    name: "Grand View Apartment",
    location: "Iosefin",
    image: apt05,
    features: ["Parcare", "WiFi", "Balcon"],
    bookingUrl: "https://booking.com",
    description: "Apartament spațios cu balcon și priveliște spectaculoasă",
    rating: 4.8,
    reviews: 92,
    capacity: 6,
    bedrooms: 3,
  },
  {
    id: 6,
    name: "Executive Suite TM",
    location: "Ultracentral",
    image: apt06,
    features: ["Auto Check-in", "Parcare", "WiFi"],
    bookingUrl: "https://booking.com",
    description: "Suită executivă ideală pentru călătorii de afaceri",
    rating: 5.0,
    reviews: 78,
    capacity: 2,
    bedrooms: 1,
  },
  {
    id: 7,
    name: "Urban Retreat Studio",
    location: "Mehala",
    image: apt07,
    features: ["WiFi", "AC", "Bucătărie"],
    bookingUrl: "https://booking.com",
    description: "Refugiu urban cu toate facilitățile necesare",
    rating: 4.6,
    reviews: 45,
    capacity: 2,
    bedrooms: 1,
  },
  {
    id: 8,
    name: "Deluxe City Apartment",
    location: "Piața Unirii",
    image: apt08,
    features: ["Auto Check-in", "Parcare", "WiFi"],
    bookingUrl: "https://booking.com",
    description: "Apartament deluxe în zona istorică a orașului",
    rating: 4.9,
    reviews: 134,
    capacity: 4,
    bedrooms: 2,
  },
  {
    id: 9,
    name: "Premium Corner Suite",
    location: "Cetate",
    image: apt09,
    features: ["Parcare", "WiFi", "Smart TV"],
    bookingUrl: "https://booking.com",
    description: "Suită de colț cu lumină naturală abundentă",
    rating: 4.8,
    reviews: 67,
    capacity: 3,
    bedrooms: 1,
  },
  {
    id: 10,
    name: "Timișoara Central Lux",
    location: "Ultracentral",
    image: apt11,
    features: ["Auto Check-in", "Parcare", "WiFi"],
    bookingUrl: "https://booking.com",
    description: "Lux și confort în centrul vibrant al Timișoarei",
    rating: 4.9,
    reviews: 189,
    capacity: 5,
    bedrooms: 2,
  },
];

const getFeatureIcon = (feature: string) => {
  switch (feature.toLowerCase()) {
    case "wifi":
      return <Wifi className="w-3 h-3" />;
    case "parcare":
      return <Car className="w-3 h-3" />;
    case "auto check-in":
      return <Key className="w-3 h-3" />;
    default:
      return null;
  }
};

const PropertyGallery = () => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % properties.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + properties.length) % properties.length);
  };

  return (
    <section id="portofoliu" className="py-24 bg-gradient-subtle relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4">Portofoliu</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            Proprietăți în <span className="text-gradient-gold">Administrarea Noastră</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Descoperă apartamentele premium pe care le gestionăm în Timișoara. Fiecare proprietate este menținută la cele mai înalte standarde.
          </p>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {properties.map((property, index) => (
            <div
              key={property.id}
              className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant"
            >
              {/* Image */}
              <div
                className="relative h-48 overflow-hidden cursor-pointer"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={property.image}
                  alt={property.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Location badge */}
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-foreground">{property.location}</span>
                </div>

                {/* Rating badge */}
                <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-primary/90 backdrop-blur-sm flex items-center gap-1">
                  <Star className="w-3 h-3 fill-primary-foreground text-primary-foreground" />
                  <span className="text-xs font-bold text-primary-foreground">{property.rating}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-serif font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {property.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {property.description}
                </p>

                {/* Capacity info */}
                <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {property.capacity} oaspeți
                  </span>
                  <span className="flex items-center gap-1">
                    <BedDouble className="w-4 h-4" />
                    {property.bedrooms} {property.bedrooms === 1 ? 'dormitor' : 'dormitoare'}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    ({property.reviews} recenzii)
                  </span>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {property.features.slice(0, 3).map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground"
                    >
                      {getFeatureIcon(feature)}
                      {feature}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
                  onClick={() => window.open(property.bookingUrl, "_blank")}
                >
                  Rezervă pe Booking.com
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-foreground hover:text-primary transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 md:left-8 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          <div className="max-w-4xl w-full">
            <img
              src={properties[currentImageIndex].image}
              alt={properties[currentImageIndex].name}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <div className="text-center mt-4">
              <h3 className="text-xl font-serif font-semibold text-foreground">
                {properties[currentImageIndex].name}
              </h3>
              <p className="text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {properties[currentImageIndex].location}
              </p>
            </div>
          </div>

          <button
            onClick={nextImage}
            className="absolute right-4 md:right-8 text-foreground hover:text-primary transition-colors"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </div>
      )}
    </section>
  );
};

export default PropertyGallery;
