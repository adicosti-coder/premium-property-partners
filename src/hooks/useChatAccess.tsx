/**
 * Verificarea anti-robot pentru asistentul Andrei. `gate` se randează lângă câmpul de mesaj
 * (Turnstile apare doar dacă e nevoie de interacțiune), `ensureToken()` întoarce biletul de
 * sesiune sau null dacă verificarea nu a reușit, `prepare()` pornește verificarea din timp.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { supabase } from "@/lib/supabaseClient";
import { clearChatToken, readChatToken, storeChatToken } from "@/lib/chatAccess";

let siteKeyPromise: Promise<string | null> | null = null;
const loadSiteKey = () => {
  siteKeyPromise ??= supabase.functions.invoke("get-turnstile-site-key")
    .then(({ data }) => (typeof data?.siteKey === "string" ? data.siteKey : null))
    .catch(() => null)
    .then((k) => { if (!k) siteKeyPromise = null; return k; });
  return siteKeyPromise;
};

const WAIT_MS = 30_000;

export function useChatAccess(language: "ro" | "en" | string = "ro") {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const waiters = useRef<((t: string | null) => void)[]>([]);
  const widget = useRef<TurnstileInstance | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const settle = useCallback((token: string | null) => {
    const list = waiters.current;
    waiters.current = [];
    list.forEach((resolve) => resolve(token));
    if (mounted.current) setActive(false);
  }, []);

  const start = useCallback(() => {
    if (readChatToken()) return;
    setActive(true);
    void loadSiteKey().then((k) => {
      if (!mounted.current) return;
      if (k) setSiteKey(k);
      else settle(null);
    });
  }, [settle]);

  const ensureToken = useCallback((): Promise<string | null> => {
    const cached = readChatToken();
    if (cached) return Promise.resolve(cached);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        waiters.current = waiters.current.filter((w) => w !== done);
        resolve(null);
      }, WAIT_MS);
      const done = (t: string | null) => { clearTimeout(timer); resolve(t); };
      waiters.current.push(done);
      start();
    });
  }, [start]);

  /** După un răspuns 401: biletul a expirat, se cere unul nou la următorul mesaj. */
  const invalidate = useCallback(() => { clearChatToken(); widget.current?.reset(); }, []);

  const onSuccess = useCallback(async (turnstileToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("chat-session", { body: { turnstileToken } });
      const token = !error && typeof data?.token === "string" ? data.token : null;
      if (token) storeChatToken(token, Number(data.expires_at) || Date.now() + 3600_000);
      settle(token);
    } catch {
      settle(null);
    } finally {
      widget.current?.reset();
    }
  }, [settle]);

  const gate = active && siteKey ? (
    <div className="flex justify-center py-1" aria-live="polite">
      <Turnstile
        ref={widget}
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={() => settle(null)}
        onExpire={() => widget.current?.reset()}
        options={{ appearance: "interaction-only", size: "flexible", language: language === "en" ? "en" : "ro", action: "chat" }}
      />
    </div>
  ) : null;

  return { gate, ensureToken, prepare: start, invalidate };
}

type ChatAccess = Pick<ReturnType<typeof useChatAccess>, "ensureToken" | "invalidate">;

/** POST către asistent cu biletul de sesiune; la sesiune expirată cere un bilet nou și reîncearcă o dată. */
export async function postChatStream(access: ChatAccess, url: string, apiKey: string | null | undefined, body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const chatToken = await access.ensureToken();
    if (!chatToken) throw new Error("verification");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey ?? ""}`, apikey: apiKey ?? "" },
      body: JSON.stringify({ ...body, chatToken }),
      signal,
    });
    if (res.status !== 401) return res;
    access.invalidate();
  }
  throw new Error("verification");
}
