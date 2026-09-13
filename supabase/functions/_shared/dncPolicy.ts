// Politica "nu contacta" — distinge între blocaje TEHNICE (număr fix/VoIP, invalid,
// robot/AMD, imposibil de apelat) și CEREREA EXPRESĂ a persoanei de a nu fi contactată.
//
// Regula: o cerere expresă blochează TOATE canalele, inclusiv WhatsApp.
// Un blocaj tehnic blochează doar apelul telefonic — contactul poate continua pe WhatsApp,
// pentru că persoana nu a cerut niciodată să nu mai fie contactată.

const EXPRESS_OPT_OUT_PATTERNS: RegExp[] = [
  /nu\s*(mai\s*)?(m[ăa]\s*)?(sun|suna|apela|contacta)/i,
  /nu\s*(mai\s*)?doresc/i,
  /nu\s*(sunt\s*)?interesat/i,
  /refuz/i,
  /opt[\s_-]?out/i,
  /unsubscribe/i,
  /stop/i,
  /gdpr/i,
  /cerere/i,
  /solicitare/i,
  /reclama[țt]ie/i,
  /manual/i,
  /admin/i,
  /blacklist/i,
];

/** true dacă motivul „nu contacta” provine dintr-o cerere expresă a persoanei. */
export function isExpressOptOut(reason?: string | null): boolean {
  const r = (reason || "").trim();
  // Fără motiv cunoscut → tratăm conservator ca cerere expresă (nu contactăm).
  if (!r) return true;
  return EXPRESS_OPT_OUT_PATTERNS.some((re) => re.test(r));
}

/** true dacă blocajul este strict tehnic → WhatsApp rămâne permis. */
export function isTechnicalBlockOnly(reason?: string | null): boolean {
  return !isExpressOptOut(reason);
}
