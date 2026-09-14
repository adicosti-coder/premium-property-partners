// Politica "nu contacta" — distinge între blocaje TEHNICE (număr fix/VoIP, invalid,
// robot/AMD, imposibil de apelat) și orice alt motiv (cerere expresă, sentiment negativ,
// marcaj manual, GDPR etc.).
//
// Regula: doar un blocaj STRICT TEHNIC permite continuarea pe WhatsApp.
// Orice alt motiv — inclusiv iritare/sentiment negativ detectat în apel — blochează
// TOATE canalele. Lista este deci o allowlist de motive tehnice, nu o listă de cuvinte
// de refuz (o listă de refuz ar rata formulări noi și ar contacta oameni supărați).

const TECHNICAL_BLOCK_PATTERNS: RegExp[] = [
  /landline/i,
  /num[ăa]r\s*fix/i,
  /fix\s*telephony/i,
  /voip/i,
  /invalid/i,
  /inexistent/i,
  /nealocat/i,
  /unallocated/i,
  /unreachable/i,
  /not\s*in\s*service/i,
  /lookup/i,
  /twilio/i,
  /\bamd\b/i,
  /answering\s*machine/i,
  /robot/i,
  /mesagerie/i,
  /voicemail/i,
  /\bfax\b/i,
  /num[ăa]r\s*(gre[șs]it|incomplet|duplicat)/i,
  /f[ăa]r[ăa]\s*num[ăa]r/i,
  /no\s*answer/i,
  /busy/i,
  /call\s*failed/i,
  /apel\s*e[șs]uat/i,
];

/** true dacă blocajul este strict tehnic → WhatsApp rămâne permis. */
export function isTechnicalBlockOnly(reason?: string | null): boolean {
  const r = (reason || "").trim();
  if (!r) return false; // motiv necunoscut → nu contactăm pe niciun canal
  return TECHNICAL_BLOCK_PATTERNS.some((re) => re.test(r));
}

/**
 * true dacă marcajul „nu contacta” trebuie respectat pe toate canalele
 * (cerere expresă, sentiment negativ, marcaj manual, motiv necunoscut).
 */
export function isExpressOptOut(reason?: string | null): boolean {
  return !isTechnicalBlockOnly(reason);
}
