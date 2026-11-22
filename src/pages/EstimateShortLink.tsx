import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AnalizaAnunt, { type AnalizaPrefill } from "@/pages/AnalizaAnunt";
import { estimatePrefillFromRpc, normalizeEstimateCode } from "@/lib/estimateShortLink";

/** Linkul scurt din mesajele WhatsApp: https://realtrust.ro/e/<cod> → estimarea anunțului, fără URL lung. */
const EstimateShortLink = () => {
  const { code } = useParams();
  const clean = normalizeEstimateCode(code);
  const [state, setState] = useState<{ status: "loading" | "ready" | "missing"; prefill?: AnalizaPrefill }>(
    () => ({ status: clean ? "loading" : "missing" }),
  );

  useEffect(() => {
    if (!clean) { setState({ status: "missing" }); return; }
    let alive = true;
    setState({ status: "loading" });
    supabase.rpc("get_estimate_link", { p_code: clean }).then(({ data, error }) => {
      if (!alive) return;
      const prefill = error ? null : estimatePrefillFromRpc(data);
      setState(prefill ? { status: "ready", prefill } : { status: "missing" });
    });
    return () => { alive = false; };
  }, [clean]);

  // Prima deschidere reală (estimare afișată, pagină vizibilă cel puțin 2 secunde) → follow-up unic la 24h.
  // Echipa autentificată și browserele automatizate nu contează ca deschidere.
  useEffect(() => {
    if (state.status !== "ready" || !clean) return;
    if (typeof document === "undefined" || navigator.webdriver) return;
    const key = `rt-estimate-open:${clean}`;
    try { if (sessionStorage.getItem(key)) return; } catch { /* stocare indisponibilă */ }
    let sent = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const send = async () => {
      if (sent || document.visibilityState !== "visible") return;
      sent = true;
      try { sessionStorage.setItem(key, "1"); } catch { /* ignorat */ }
      const { data } = await supabase.auth.getSession();
      if (data.session) return;
      await supabase.functions.invoke("estimate-link-open", { body: { code: clean } }).catch(() => undefined);
    };
    const arm = () => {
      if (document.visibilityState === "visible" && !timer) timer = setTimeout(send, 2000);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => { if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", arm); };
  }, [state.status, clean]);

  if (state.status === "ready" && state.prefill) return <AnalizaAnunt key={clean ?? ""} prefill={state.prefill} />;

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 pt-24 pb-16">
      {state.status === "loading" ? (
        <p className="flex items-center gap-2 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Se încarcă estimarea…
        </p>
      ) : (
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Linkul nu mai este valabil</h1>
          <p className="text-muted-foreground">
            Puteți face oricând o estimare gratuită sau ne puteți scrie la 0799 069 256.
          </p>
          <Link to="/analiza-anunt" className="inline-flex min-h-12 items-center rounded-md bg-primary px-5 text-primary-foreground">
            Fă o estimare gratuită
          </Link>
        </div>
      )}
    </main>
  );
};

export default EstimateShortLink;
