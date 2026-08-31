export type GeoPoiCategory = 'tourist' | 'restaurant' | 'supermarket' | 'pharmacy' | 'cafe' | 'park' | 'transport' | 'mall' | 'bar';
export type TravelMode = 'walk' | 'drive';

export interface GeoInput {
  slug?: string | null;
  name?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface GeoPoi {
  name: string;
  nameEn: string;
  lat: number;
  lng: number;
  category: GeoPoiCategory;
  emoji: string;
  minutes: number;
  mode: TravelMode;
}

interface GeoProfile {
  key: string;
  aliases: string[];
  center: { lng: number; lat: number };
  scores: {
    transport: number;
    education: number;
    lifestyle: number;
    overallLabelRo: string;
    overallLabelEn: string;
  };
  pois: GeoPoi[];
}

const normalize = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const hasFiniteCoordinates = (latitude?: number | null, longitude?: number | null) =>
  Number.isFinite(latitude) && Number.isFinite(longitude);

const exactCoordinatesBySlug: Record<string, [number, number]> = {
  'ring-apart-hotel-spacious-deluxe': [21.217955, 45.756134],
  'green-forest-apart-hotel': [21.248071, 45.7791585],
  'fructus-plaza-ultracentral-apart-hotel': [21.220902, 45.7595474],
  'fullview-studio-deluxe': [21.232860, 45.741866],
  'avenue-of-mara-apart-hotel': [21.2148126, 45.753754],
  'helios-apart-hotel': [21.2344862, 45.7432988],
  'ateneo-trevi-2-apart-hotel': [21.236043, 45.721480],
  'sunset-da-ra-studio-deluxe': [21.2148126, 45.753754],
  'mara-luxury-golden-apart-hotel': [21.2148126, 45.753754],
  'ateneo-apart-hotel-studio-deluxe': [21.2098, 45.779],
  'modern-studio-apart-hotel': [21.2602816, 45.7656277],
  'moonlight-emerald-suite': [21.2390186, 45.731261],
  'apartament-1-5-camere-43-5-m2-4-5-m2-ext-vivalia-v6-full-mobilat-la-comanda': [21.2402393, 45.7634713],
  'apartament-2-camere-vivalia-parter-parcare-terasa-mare-iulius-mall': [21.240401, 45.762866],
  'ideal-investitie-utilat-complet-mobilat': [21.234161, 45.7579883],
  'apartament-2-camere-business-regim-hotelier-activ-cu-istoric-si-grad-de-ocupare-': [21.237569, 45.760929],
  'apartament-premium-3-camere-bulevardul-revolutiei-randament-9-net': [21.2330843, 45.7556125],
  '3-camere-complet-decomandat-hol-spatios-medicina-garaj': [21.2367143, 45.7570915],
  'apartament-3-camere-gh-lazar-investitie-premium-randament-9-net': [21.220902, 45.7595474],
  'city-of-mara-apartament-cu-2-camere': [21.2148126, 45.753754],
  'ultra-central-piata-unirii-ideal-investitie': [21.2298369, 45.7579403],
  'studio-premium-2025-zona-sagului-utilitati-incluse-management-realtrust': [21.2402, 45.7293],
  'garsoniera-calea-buziasului-investitie-cu-randament-ridicat-si-management-realtr': [21.260844, 45.730332],
};

const profiles: GeoProfile[] = [
  {
    key: 'city_of_mara',
    aliases: ['city of mara', 'circumvalatiunii 1', 'circumvalatiunii', 'sinaia 2b', 'mara luxury', 'fullview', 'avenue of mara', 'sunset da ra', 'apartament premium 2 camere'],
    center: { lng: 21.2148126, lat: 45.753754 },
    scores: { transport: 9.4, education: 9.1, lifestyle: 9.6, overallLabelRo: 'Excelent', overallLabelEn: 'Excellent' },
    pois: [
      { name: 'Piața Victoriei', nameEn: 'Victory Square', lng: 21.2246, lat: 45.7537, category: 'tourist', emoji: '🏛️', minutes: 6, mode: 'drive' },
      { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 8, mode: 'drive' },
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 8, mode: 'drive' },
      { name: 'Gara de Nord', nameEn: 'North Railway Station', lng: 21.207, lat: 45.749, category: 'transport', emoji: '🚂', minutes: 5, mode: 'drive' },
      { name: 'Lidl Circumvalațiunii', nameEn: 'Lidl Circumvalațiunii', lng: 21.216, lat: 45.751, category: 'supermarket', emoji: '🛒', minutes: 4, mode: 'walk' },
      { name: 'Restaurante & cafenele premium', nameEn: 'Premium restaurants & cafés', lng: 21.2165, lat: 45.754, category: 'restaurant', emoji: '🍽️', minutes: 3, mode: 'walk' },
    ],
  },
  {
    key: 'vivalia_take_ionescu',
    aliases: ['vivalia', 'take ionescu', 'zimbrului', 'bucuresti langa ing', 'bucuresti langa ing ul de pe take ionescu', 'ideal investitie'],
    center: { lng: 21.2392, lat: 45.7623 },
    scores: { transport: 9.7, education: 9.4, lifestyle: 9.8, overallLabelRo: 'Excelent', overallLabelEn: 'Excellent' },
    pois: [
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 5, mode: 'walk' },
      { name: 'Restaurante & cafenele Take Ionescu', nameEn: 'Take Ionescu restaurants & cafés', lng: 21.2365, lat: 45.7605, category: 'restaurant', emoji: '🍽️', minutes: 4, mode: 'walk' },
      { name: 'Supermarket de proximitate', nameEn: 'Nearby supermarket', lng: 21.2388, lat: 45.7612, category: 'supermarket', emoji: '🛒', minutes: 3, mode: 'walk' },
      { name: 'UVT Oituz', nameEn: 'West University Oituz campus', lng: 21.2319, lat: 45.7618, category: 'tourist', emoji: '🎓', minutes: 6, mode: 'walk' },
      { name: 'Bastionul Theresia', nameEn: 'Theresia Bastion', lng: 21.2327, lat: 45.7587, category: 'tourist', emoji: '🏰', minutes: 6, mode: 'drive' },
      { name: 'Stații tramvai Take Ionescu', nameEn: 'Take Ionescu tram stops', lng: 21.2372, lat: 45.7604, category: 'transport', emoji: '🚋', minutes: 4, mode: 'walk' },
    ],
  },
  {
    key: 'fructus_gh_lazar',
    aliases: ['fructus', 'gheorghe lazar', 'gh lazar'],
    center: { lng: 21.220902, lat: 45.7595474 },
    scores: { transport: 9.3, education: 8.9, lifestyle: 9.5, overallLabelRo: 'Excelent', overallLabelEn: 'Excellent' },
    pois: [
      { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 10, mode: 'walk' },
      { name: 'Piața Victoriei', nameEn: 'Victory Square', lng: 21.2246, lat: 45.7537, category: 'tourist', emoji: '🏛️', minutes: 12, mode: 'walk' },
      { name: 'Penny / supermarket', nameEn: 'Penny / supermarket', lng: 21.22, lat: 45.758, category: 'supermarket', emoji: '🛒', minutes: 2, mode: 'walk' },
      { name: 'Restaurante din centru', nameEn: 'Downtown restaurants', lng: 21.225, lat: 45.7565, category: 'restaurant', emoji: '🍽️', minutes: 5, mode: 'walk' },
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 4, mode: 'drive' },
      { name: 'Gara de Nord', nameEn: 'North Railway Station', lng: 21.207, lat: 45.749, category: 'transport', emoji: '🚂', minutes: 5, mode: 'drive' },
    ],
  },
  {
    key: 'ring_aradului',
    aliases: ['ring apart hotel', 'loichita', 'loichita vasile 1 3', 'aradului vest', 'ring 2 camere'],
    center: { lng: 21.2115815, lat: 45.7801861 },
    scores: { transport: 8.6, education: 8.1, lifestyle: 8.4, overallLabelRo: 'Foarte Bun', overallLabelEn: 'Very Good' },
    pois: [
      { name: 'Lidl Calea Aradului', nameEn: 'Lidl Calea Aradului', lng: 21.2125, lat: 45.783, category: 'supermarket', emoji: '🛒', minutes: 3, mode: 'walk' },
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 5, mode: 'drive' },
      { name: 'Centrul Vechi', nameEn: 'Old Town Center', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 10, mode: 'drive' },
      { name: 'Aquapark Amazonia', nameEn: 'Amazonia Aquapark', lng: 21.257, lat: 45.772, category: 'tourist', emoji: '🏊', minutes: 12, mode: 'drive' },
      { name: 'Stații transport Calea Aradului', nameEn: 'Calea Aradului transit stops', lng: 21.211, lat: 45.7815, category: 'transport', emoji: '🚋', minutes: 3, mode: 'walk' },
      { name: 'Parc de cartier', nameEn: 'Neighborhood park', lng: 21.2105, lat: 45.781, category: 'park', emoji: '🌳', minutes: 4, mode: 'walk' },
    ],
  },
  {
    key: 'ateneo_torontalului',
    aliases: ['ateneo', 'torontalului 104k', 'trevi 2'],
    center: { lng: 21.2098, lat: 45.779 },
    scores: { transport: 8.5, education: 7.9, lifestyle: 8.3, overallLabelRo: 'Foarte Bun', overallLabelEn: 'Very Good' },
    pois: [
      { name: 'Lidl Torontalului', nameEn: 'Lidl Torontalului', lng: 21.21, lat: 45.78, category: 'supermarket', emoji: '🛒', minutes: 2, mode: 'walk' },
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 5, mode: 'drive' },
      { name: 'Aquapark Amazonia', nameEn: 'Amazonia Aquapark', lng: 21.257, lat: 45.772, category: 'tourist', emoji: '🏊', minutes: 12, mode: 'drive' },
      { name: 'Restaurante rezidențiale', nameEn: 'Residential-area restaurants', lng: 21.212, lat: 45.779, category: 'restaurant', emoji: '🍽️', minutes: 3, mode: 'walk' },
      { name: 'Transport public Torontalului', nameEn: 'Torontalului public transport', lng: 21.2108, lat: 45.7788, category: 'transport', emoji: '🚌', minutes: 3, mode: 'walk' },
      { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 9, mode: 'drive' },
    ],
  },
  {
    key: 'apicultorilor',
    aliases: ['apicultorilor', 'apicultorilor 31'],
    center: { lng: 21.236043, lat: 45.72148 },
    scores: { transport: 8.2, education: 7.8, lifestyle: 8.1, overallLabelRo: 'Foarte Bun', overallLabelEn: 'Very Good' },
    pois: [
      { name: 'Supermarket de cartier', nameEn: 'Neighborhood supermarket', lng: 21.2345, lat: 45.7225, category: 'supermarket', emoji: '🛒', minutes: 4, mode: 'walk' },
      { name: 'Centrul Vechi', nameEn: 'Old Town Center', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 12, mode: 'drive' },
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 13, mode: 'drive' },
      { name: 'Transport public Calea Martirilor', nameEn: 'Calea Martirilor public transport', lng: 21.2335, lat: 45.7228, category: 'transport', emoji: '🚌', minutes: 5, mode: 'walk' },
      { name: 'Parc de cartier', nameEn: 'Neighborhood park', lng: 21.2372, lat: 45.7208, category: 'park', emoji: '🌳', minutes: 4, mode: 'walk' },
    ],
  },
  {
    key: 'green_forest_constructorilor',
    aliases: ['green forest', 'constructorilor 52'],
    center: { lng: 21.248071, lat: 45.7791585 },
    scores: { transport: 8.1, education: 7.8, lifestyle: 8, overallLabelRo: 'Foarte Bun', overallLabelEn: 'Very Good' },
    pois: [
      { name: 'Aquapark Amazonia', nameEn: 'Amazonia Aquapark', lng: 21.257, lat: 45.772, category: 'tourist', emoji: '🏊', minutes: 11, mode: 'walk' },
      { name: 'Lidl Constructorilor', nameEn: 'Lidl Constructorilor', lng: 21.251, lat: 45.781, category: 'supermarket', emoji: '🛒', minutes: 5, mode: 'walk' },
      { name: 'Pădurea Verde', nameEn: 'Green Forest Park', lng: 21.262, lat: 45.785, category: 'park', emoji: '🌳', minutes: 12, mode: 'walk' },
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 6, mode: 'drive' },
      { name: 'Transport Constructorilor', nameEn: 'Constructorilor transport', lng: 21.248, lat: 45.7798, category: 'transport', emoji: '🚌', minutes: 3, mode: 'walk' },
      { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 9, mode: 'drive' },
    ],
  },
  {
    key: 'helios_elisabetin',
    aliases: ['helios', 'arges 4', 'argeș 4'],
    center: { lng: 21.2344862, lat: 45.7432988 },
    scores: { transport: 8.8, education: 9.1, lifestyle: 8.9, overallLabelRo: 'Excelent', overallLabelEn: 'Excellent' },
    pois: [
      { name: 'Universitatea de Vest', nameEn: 'West University', lng: 21.228, lat: 45.7475, category: 'tourist', emoji: '🎓', minutes: 9, mode: 'walk' },
      { name: 'Parcul Civic', nameEn: 'Civic Park', lng: 21.231, lat: 45.751, category: 'park', emoji: '🌳', minutes: 7, mode: 'walk' },
      { name: 'Kaufland', nameEn: 'Kaufland', lng: 21.236, lat: 45.741, category: 'supermarket', emoji: '🛒', minutes: 5, mode: 'walk' },
      { name: 'Restaurante & cafenele', nameEn: 'Restaurants & cafés', lng: 21.235, lat: 45.7445, category: 'restaurant', emoji: '🍽️', minutes: 4, mode: 'walk' },
      { name: 'Piața Victoriei', nameEn: 'Victory Square', lng: 21.2246, lat: 45.7537, category: 'tourist', emoji: '🏛️', minutes: 6, mode: 'drive' },
      { name: 'Transport universitar', nameEn: 'University-area transport', lng: 21.233, lat: 45.7442, category: 'transport', emoji: '🚋', minutes: 4, mode: 'walk' },
    ],
  },
  {
    key: 'modern_barnutiu',
    aliases: ['modern studio', 'simion barnutiu 79', 'barnutiu 79'],
    center: { lng: 21.2602816, lat: 45.7656277 },
    scores: { transport: 8.4, education: 8.7, lifestyle: 8.3, overallLabelRo: 'Foarte Bun', overallLabelEn: 'Very Good' },
    pois: [
      { name: 'Aquapark Amazonia', nameEn: 'Amazonia Aquapark', lng: 21.257, lat: 45.772, category: 'tourist', emoji: '🏊', minutes: 4, mode: 'drive' },
      { name: 'Lidl Bărnuțiu', nameEn: 'Lidl Bărnuțiu', lng: 21.258, lat: 45.767, category: 'supermarket', emoji: '🛒', minutes: 3, mode: 'walk' },
      { name: 'Spital / servicii medicale', nameEn: 'Hospital / medical services', lng: 21.255, lat: 45.763, category: 'pharmacy', emoji: '🏥', minutes: 5, mode: 'walk' },
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 9, mode: 'drive' },
      { name: 'Transport Bărnuțiu', nameEn: 'Bărnuțiu transport', lng: 21.2595, lat: 45.7665, category: 'transport', emoji: '🚌', minutes: 3, mode: 'walk' },
      { name: 'Centrul Vechi', nameEn: 'Old Town Center', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 8, mode: 'drive' },
    ],
  },
  {
    key: 'revolutiei',
    aliases: ['revolutiei', 'revolutiei din 1989', 'bulevardul revolutiei'],
    center: { lng: 21.2330843, lat: 45.7556125 },
    scores: { transport: 9.4, education: 8.9, lifestyle: 9.5, overallLabelRo: 'Excelent', overallLabelEn: 'Excellent' },
    pois: [
      { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 8, mode: 'walk' },
      { name: 'Bastionul Theresia', nameEn: 'Theresia Bastion', lng: 21.2327, lat: 45.7587, category: 'tourist', emoji: '🏰', minutes: 5, mode: 'walk' },
      { name: 'Supermarket de proximitate', nameEn: 'Nearby supermarket', lng: 21.2322, lat: 45.7547, category: 'supermarket', emoji: '🛒', minutes: 4, mode: 'walk' },
      { name: 'Restaurante centrale', nameEn: 'Central restaurants', lng: 21.2308, lat: 45.7563, category: 'restaurant', emoji: '🍽️', minutes: 4, mode: 'walk' },
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 7, mode: 'drive' },
      { name: 'Transport Revoluției', nameEn: 'Revoluției transport', lng: 21.2328, lat: 45.7554, category: 'transport', emoji: '🚋', minutes: 3, mode: 'walk' },
    ],
  },
  {
    key: 'medicina',
    aliases: ['medicina', 'universitate', 'victor babes', 'regimentul 13 calarasi'],
    center: { lng: 21.2367143, lat: 45.7570915 },
    scores: { transport: 9, education: 9.7, lifestyle: 8.9, overallLabelRo: 'Excelent', overallLabelEn: 'Excellent' },
    pois: [
      { name: 'UMF / zona Medicina', nameEn: 'Medical University area', lng: 21.2371, lat: 45.7568, category: 'tourist', emoji: '🎓', minutes: 4, mode: 'walk' },
      { name: 'Bastionul Theresia', nameEn: 'Theresia Bastion', lng: 21.2327, lat: 45.7587, category: 'tourist', emoji: '🏰', minutes: 6, mode: 'walk' },
      { name: 'Supermarket', nameEn: 'Supermarket', lng: 21.2362, lat: 45.7564, category: 'supermarket', emoji: '🛒', minutes: 3, mode: 'walk' },
      { name: 'Restaurante universitare', nameEn: 'University-area restaurants', lng: 21.2359, lat: 45.7569, category: 'restaurant', emoji: '🍽️', minutes: 4, mode: 'walk' },
      { name: 'Parcul Rozelor', nameEn: 'Rose Park', lng: 21.229, lat: 45.762, category: 'park', emoji: '🌳', minutes: 6, mode: 'drive' },
      { name: 'Transport universitar', nameEn: 'University-area transport', lng: 21.2365, lat: 45.7575, category: 'transport', emoji: '🚋', minutes: 3, mode: 'walk' },
    ],
  },
  {
    key: 'unirii',
    aliases: ['piata unirii', 'piața unirii', 'ultra central', 'ultracentral'],
    center: { lng: 21.2298369, lat: 45.7579403 },
    scores: { transport: 9.8, education: 9.2, lifestyle: 10, overallLabelRo: 'Excelent', overallLabelEn: 'Excellent' },
    pois: [
      { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 2, mode: 'walk' },
      { name: 'Bastionul Theresia', nameEn: 'Theresia Bastion', lng: 21.2327, lat: 45.7587, category: 'tourist', emoji: '🏰', minutes: 4, mode: 'walk' },
      { name: 'Restaurante premium', nameEn: 'Premium restaurants', lng: 21.2288, lat: 45.7575, category: 'restaurant', emoji: '🍽️', minutes: 2, mode: 'walk' },
      { name: 'Supermarket central', nameEn: 'Central supermarket', lng: 21.2276, lat: 45.7568, category: 'supermarket', emoji: '🛒', minutes: 4, mode: 'walk' },
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 8, mode: 'drive' },
      { name: 'Transport central', nameEn: 'Central transport', lng: 21.2284, lat: 45.7574, category: 'transport', emoji: '🚋', minutes: 3, mode: 'walk' },
    ],
  },
  {
    key: 'sagului',
    aliases: ['sagului', 'calea sagului', 'zona sagului', 'studio premium 2025 zona sagului'],
    center: { lng: 21.2402, lat: 45.7293 },
    scores: { transport: 8.2, education: 7.8, lifestyle: 8.0, overallLabelRo: 'Foarte Bun', overallLabelEn: 'Very Good' },
    pois: [
      { name: 'Shopping City Timișoara', nameEn: 'Shopping City Timișoara', lng: 21.2468, lat: 45.7188, category: 'mall', emoji: '🛍️', minutes: 5, mode: 'drive' },
      { name: 'Kaufland Calea Șagului', nameEn: 'Kaufland Calea Șagului', lng: 21.2385, lat: 45.7310, category: 'supermarket', emoji: '🛒', minutes: 3, mode: 'walk' },
      { name: 'Amazonia Aquapark', nameEn: 'Amazonia Aquapark', lng: 21.257, lat: 45.772, category: 'tourist', emoji: '🏊', minutes: 10, mode: 'drive' },
      { name: 'Stații tramvai Calea Șagului', nameEn: 'Calea Șagului tram stops', lng: 21.2395, lat: 45.7300, category: 'transport', emoji: '🚋', minutes: 3, mode: 'walk' },
      { name: 'Restaurante & cafenele', nameEn: 'Restaurants & cafés', lng: 21.2410, lat: 45.7285, category: 'restaurant', emoji: '🍽️', minutes: 4, mode: 'walk' },
      { name: 'Centrul Vechi', nameEn: 'Old Town Center', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 10, mode: 'drive' },
    ],
  },
  {
    key: 'buziasului',
    aliases: ['buziasului', 'calea buziasului', 'zona buziasului', 'garsoniera calea buziasului', 'buziaș'],
    center: { lng: 21.2608, lat: 45.7303 },
    scores: { transport: 8.6, education: 8.0, lifestyle: 8.4, overallLabelRo: 'Foarte Bun', overallLabelEn: 'Very Good' },
    pois: [
      { name: 'Real Park / Auchan Sud', nameEn: 'Real Park / Auchan South', lng: 21.2625, lat: 45.7275, category: 'mall', emoji: '🛍️', minutes: 4, mode: 'drive' },
      { name: 'Kaufland Buziașului', nameEn: 'Kaufland Buziașului', lng: 21.2585, lat: 45.7320, category: 'supermarket', emoji: '🛒', minutes: 4, mode: 'walk' },
      { name: 'Stație tramvai Buziașului', nameEn: 'Buziașului tram stop', lng: 21.2598, lat: 45.7305, category: 'transport', emoji: '🚋', minutes: 3, mode: 'walk' },
      { name: 'Restaurante zona Soarelui', nameEn: 'Soarelui-area restaurants', lng: 21.2570, lat: 45.7290, category: 'restaurant', emoji: '🍽️', minutes: 5, mode: 'walk' },
      { name: 'Parcul Lidia', nameEn: 'Lidia Park', lng: 21.2540, lat: 45.7345, category: 'park', emoji: '🌳', minutes: 6, mode: 'walk' },
      { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 12, mode: 'drive' },
    ],
  },
];

const fallbackProfile: GeoProfile = {
  key: 'timisoara_central',
  aliases: ['timisoara', 'timișoara'],
  center: { lng: 21.2246, lat: 45.7537 },
  scores: { transport: 8.4, education: 8.1, lifestyle: 8.5, overallLabelRo: 'Foarte Bun', overallLabelEn: 'Very Good' },
  pois: [
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️', minutes: 8, mode: 'drive' },
    { name: 'Supermarket', nameEn: 'Supermarket', lng: 21.22, lat: 45.758, category: 'supermarket', emoji: '🛒', minutes: 5, mode: 'walk' },
    { name: 'Iulius Town', nameEn: 'Iulius Town', lng: 21.227, lat: 45.7695, category: 'mall', emoji: '🛍️', minutes: 8, mode: 'drive' },
    { name: 'Gara de Nord', nameEn: 'North Railway Station', lng: 21.207, lat: 45.749, category: 'transport', emoji: '🚂', minutes: 10, mode: 'drive' },
    { name: 'Restaurante & cafenele', nameEn: 'Restaurants & cafés', lng: 21.224, lat: 45.7555, category: 'restaurant', emoji: '🍽️', minutes: 5, mode: 'walk' },
    { name: 'Parc urban', nameEn: 'Urban park', lng: 21.229, lat: 45.762, category: 'park', emoji: '🌳', minutes: 7, mode: 'drive' },
  ],
};

const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const findProfile = (input: GeoInput): GeoProfile => {
  const searchable = [input.slug, input.name, input.location].map(normalize).filter(Boolean);
  const exactBySlug = input.slug ? exactCoordinatesBySlug[input.slug] : undefined;

  if (hasFiniteCoordinates(input.latitude, input.longitude)) {
    const nearest = profiles
      .map((profile) => ({
        profile,
        distance: haversineKm(input.latitude as number, input.longitude as number, profile.center.lat, profile.center.lng),
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearest && nearest.distance <= 2.2) return nearest.profile;
  }

  if (exactBySlug) {
    const [lng, lat] = exactBySlug;
    const nearest = profiles
      .map((profile) => ({ profile, distance: haversineKm(lat, lng, profile.center.lat, profile.center.lng) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearest) return nearest.profile;
  }

  const aliasMatch = profiles.find((profile) =>
    profile.aliases.some((alias) => searchable.some((value) => value.includes(normalize(alias))))
  );

  return aliasMatch || fallbackProfile;
};

export const resolvePropertyCoordinates = (input: GeoInput): [number, number] => {
  if (hasFiniteCoordinates(input.latitude, input.longitude)) {
    return [input.longitude as number, input.latitude as number];
  }

  if (input.slug && exactCoordinatesBySlug[input.slug]) {
    return exactCoordinatesBySlug[input.slug];
  }

  const profile = findProfile(input);
  return [profile.center.lng, profile.center.lat];
};

export const getPropertyGeoProfile = (input: GeoInput) => {
  const profile = findProfile(input);
  const [lng, lat] = resolvePropertyCoordinates(input);
  const overall = Number(((profile.scores.transport + profile.scores.education + profile.scores.lifestyle) / 3).toFixed(1));

  return {
    ...profile,
    resolvedCoordinates: { lng, lat },
    overall,
  };
};

export const getNeighborhoodScores = (input: GeoInput) => {
  const profile = getPropertyGeoProfile(input);
  return {
    transport: profile.scores.transport,
    education: profile.scores.education,
    lifestyle: profile.scores.lifestyle,
    overall: profile.overall,
    overallLabelRo: profile.scores.overallLabelRo,
    overallLabelEn: profile.scores.overallLabelEn,
  };
};

export const getPropertyPois = (input: GeoInput) => getPropertyGeoProfile(input).pois;

export const getDisplayLocation = (input: GeoInput) => {
  const rawLocation = input.location?.trim();
  if (rawLocation && !/^https?:\/\//i.test(rawLocation)) return rawLocation;

  const profile = getPropertyGeoProfile(input);
  switch (profile.key) {
    case 'city_of_mara':
      return 'City of Mara / Circumvalațiunii, Timișoara';
    case 'vivalia_take_ionescu':
      return 'Vivalia / Take Ionescu, Timișoara';
    case 'fructus_gh_lazar':
      return 'Gheorghe Lazăr / Fructus Plaza, Timișoara';
    case 'ring_aradului':
      return 'NordOne / Calea Circumvalațiunii, Timișoara';
    case 'ateneo_torontalului':
      return 'Torontalului / Ateneo, Timișoara';
    case 'apicultorilor':
      return 'Apicultorilor / Sud, Timișoara';
    case 'green_forest_constructorilor':
      return 'Constructorilor / Green Forest, Timișoara';
    case 'helios_elisabetin':
      return 'Elisabetin / Argeș, Timișoara';
    case 'modern_barnutiu':
      return 'Simion Bărnuțiu, Timișoara';
    case 'revolutiei':
      return 'Bulevardul Revoluției, Timișoara';
    case 'medicina':
      return 'Zona Medicina / Universitate, Timișoara';
    case 'unirii':
      return 'Piața Unirii, Timișoara';
    case 'sagului':
      return 'Calea Șagului, Timișoara';
    default:
      return 'Timișoara';
  }
};