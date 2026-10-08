// Numere interne RealTrust: numărul personal de administrare și numerele
// companiei. Nu primesc niciodată mesaje de prospectare, reamintiri, oferte
// sau recontactări automate (alertele admin folosesc alte funcții).
export const INTERNAL_WA_NUMBERS = new Set(["40723154520", "40733783540", "40799069256"]);

export function isInternalWaNumber(phone: string | null | undefined): boolean {
  const d = String(phone || "").replace(/\D/g, "");
  return INTERNAL_WA_NUMBERS.has(d);
}
