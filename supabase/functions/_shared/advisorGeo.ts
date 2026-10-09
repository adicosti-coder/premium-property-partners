// Approximate neighborhood reference points, NOT exact property coordinates.
// Martirilor reference matches the existing propertyGeo transport landmark.
export const ADVISOR_GEO_VERSION = "geo-v3-2026-10-09";
const CENTER = { latitude: 45.7537, longitude: 21.2246 }; // Piața Victoriei
const ZONES = [
  { name: "Martirilor / Girocului", keys: ["martirilor", "girocului"], latitude: 45.7228, longitude: 21.2335 },
  { name: "Spitalul Județean / Pius Brînzeu", keys: ["judetean", "pius brinzeu"], latitude: 45.732, longitude: 21.241 },
  { name: "Soarelui", keys: ["soarelui"], latitude: 45.728, longitude: 21.249 },
  { name: "Iosefin", keys: ["iosefin"], latitude: 45.747, longitude: 21.207 },
  { name: "Fabric", keys: ["fabric"], latitude: 45.758, longitude: 21.252 },
  { name: "Aradului", keys: ["aradului"], latitude: 45.781, longitude: 21.225 },
];
export function advisorDirection(latitude: number, longitude: number): string {
  const north = latitude - CENTER.latitude;
  const east = (longitude - CENTER.longitude) * Math.cos(CENTER.latitude * Math.PI / 180);
  if (Math.hypot(north, east) < 0.003) return "Centru / Central";
  const angle = (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
  return ["Nord / North", "Nord-Est / Northeast", "Est / East", "Sud-Est / Southeast", "Sud / South", "Sud-Vest / Southwest", "Vest / West", "Nord-Vest / Northwest"][Math.round(angle / 45) % 8];
}
export function buildAdvisorGeoContext(location: string, latitude?: unknown, longitude?: unknown): string {
  const normalized = location.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const zone = ZONES.find(z => z.keys.some(key => normalized.includes(key)));
  const lat = Number(latitude), lng = Number(longitude);
  const hasGps = latitude != null && longitude != null && Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 45.6 && lat <= 45.9 && lng >= 21 && lng <= 21.5;
  const point = hasGps ? { latitude: lat, longitude: lng } : zone;
  return `GEOGRAFIE OBLIGATORIE / MANDATORY GEOGRAPHY:
Timișoara este în vestul României, dar acest lucru NU situează fiecare cartier în vestul orașului. Timișoara being in western Romania does NOT imply a western city district.
Martirilor / Girocului = Sud / South; Spitalul Județean / Pius Brînzeu și Soarelui = Sud/Sud-Est / South/Southeast, NU Vest / NOT West.
${point ? `WGS84 latitude=${point.latitude}, longitude=${point.longitude}; orientare față de Piața Victoriei / direction from city centre: ${advisorDirection(point.latitude, point.longitude)}. Sursă / source: ${hasGps ? "GPS proprietate salvat în DB / stored property GPS" : "reper aproximativ de cartier, NU adresa proprietății / approximate district reference, NOT property address"}.` : "Poziție exactă necunoscută / exact position unknown: do not invent a compass direction."}
Nu inventa distanțe sau timpi de mers. Do not invent distances, walking times or proximity to unrelated landmarks.`;
}