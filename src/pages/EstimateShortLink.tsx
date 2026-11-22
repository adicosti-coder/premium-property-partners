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
