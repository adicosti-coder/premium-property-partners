// Numărul de test al lui Adrian (0799 069 256) ocolește excluderea do-not-contact,
// ca testele WhatsApp prin Make.com să poată rula oricând.
const TEST_PHONES = new Set(["40799069256"]);

export function isTestPhone(raw: string | null | undefined): boolean {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("0040")) d = d.slice(2);
  if (d.startsWith("07")) d = "4" + d;
  return TEST_PHONES.has(d);
}
