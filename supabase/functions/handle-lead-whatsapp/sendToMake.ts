// Trimiterea către Make.com pentru formularul „Calcul venit”.
// E separată de index.ts ca să poată fi testată fără a porni funcția.
// Nu aruncă niciodată excepții:apelantul răspunde vizitatorului cu succes
// indiferent de rezultat, deci o eroare aici trebuie doar înregistrată.

/** Câte milisecunde așteptăm răspunsul Make.com înainte să renunțăm. */
export const DEFAULT_TIMEOUT_MS = 3000;

export type MakeSendStatus = "sent" | "failed" | "timeout" | "network_error";

export interface MakeSendResult {
  status: MakeSendStatus;
  /** Codul HTTP primit; 0 când nu am ajuns la Make. */
  httpStatus: number;
  /** Primii 300 de caractere din răspuns sau din eroare, pentru log. */
  detail: string;
  elapsedMs: number;
}

export async function sendToMake(
  url: string,
  payload: unknown,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<MakeSendResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    const elapsedMs = Date.now() - started;
    if (!res.ok) {
      return { status: "failed", httpStatus: res.status, detail, elapsedMs };
    }
    return { status: "sent", httpStatus: res.status, detail, elapsedMs };
  } catch (err) {
    return {
      status: controller.signal.aborted ? "timeout" : "network_error",
      httpStatus: 0,
      detail: String(err).slice(0, 300),
      elapsedMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}
