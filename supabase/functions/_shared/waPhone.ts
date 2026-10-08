// Normalizare unică a numerelor WhatsApp + rezervare „în curs de trimitere”
// înainte de apelul către Meta, ca rulările paralele să nu trimită de două ori.
// deno-lint-ignore-file no-explicit-any

/** "0733 783 540", "+40733783540", "0040733783540", "733783540" → "40733783540" (sau null). */
export function toWaDigits(raw: string | null | undefined): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "40" + d.slice(1);
  if (d.length === 9 && d.startsWith("7")) d = "40" + d;
  return /^40\d{9}$/.test(d) ? d : null;
}

/** Toate formele sub care același număr poate fi salvat în baza de date. */
export function phoneVariants(raw: string | null | undefined): string[] {
  const d = toWaDigits(raw);
  if (!d) return raw ? [String(raw)] : [];
  return [`+${d}`, d, `0${d.slice(2)}`];
}

/** Formatul canonic salvat în tabele: "+40XXXXXXXXX". */
export function canonicalWaPhone(raw: string | null | undefined): string | null {
  const d = toWaDigits(raw);
  return d ? `+${d}` : null;
}

const SCOPE_PREFIX = "wa-phone-send:";

/**
 * Rezervă atomic numărul ÎNAINTE de apelul către Meta. Returnează false dacă
 * numărul e deja rezervat (trimis / în curs) în intervalul dat — oricare altă
 * rulare, paralelă sau ulterioară, vede imediat rezervarea.
 */
export async function reservePhoneSend(
  supabase: any,
  phone: string | null | undefined,
  kind: string,
  ttlMs: number,
  meta: Record<string, unknown> = {},
): Promise<boolean> {
  const key = toWaDigits(phone);
  if (!key) return false;
  const scope = SCOPE_PREFIX + kind;
  const expires = new Date(Date.now() + ttlMs).toISOString();
  const { error } = await supabase
    .from("request_idempotency")
    .insert({ scope, key, expires_at: expires, response: { state: "sending", ...meta } });
  if (!error) return true;
  if (error.code !== "23505") {
    // Nu putem garanta unicitatea → mai bine nu trimitem.
    console.error("[waPhone] reserve failed:", error.message);
    return false;
  }
  const { data: row } = await supabase
    .from("request_idempotency")
    .select("expires_at")
    .eq("scope", scope).eq("key", key)
    .maybeSingle();
  if (row && new Date(row.expires_at).getTime() > Date.now()) return false;
  // Rezervare expirată → o preluăm condiționat (doar o singură rulare reușește).
  const { data: taken } = await supabase
    .from("request_idempotency")
    .update({ expires_at: expires, created_at: new Date().toISOString(), response: { state: "sending", ...meta } })
    .eq("scope", scope).eq("key", key).eq("expires_at", row?.expires_at ?? "")
    .select("key");
  return !!taken?.length;
}

/** Marchează rezervarea ca trimisă (rămâne activă până la expirare). */
export async function markPhoneSent(supabase: any, phone: string | null | undefined, kind: string, meta: Record<string, unknown> = {}) {
  const key = toWaDigits(phone);
  if (!key) return;
  await supabase.from("request_idempotency")
    .update({ response: { state: "sent", at: new Date().toISOString(), ...meta } })
    .eq("scope", SCOPE_PREFIX + kind).eq("key", key);
}

/** Eliberează rezervarea când Meta a respins sigur mesajul (nu a plecat nimic). */
export async function releasePhoneSend(supabase: any, phone: string | null | undefined, kind: string) {
  const key = toWaDigits(phone);
  if (!key) return;
  await supabase.from("request_idempotency").delete()
    .eq("scope", SCOPE_PREFIX + kind).eq("key", key);
}
