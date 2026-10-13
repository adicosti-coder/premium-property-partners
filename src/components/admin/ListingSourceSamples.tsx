/**
 * „Vezi anunțurile” — dezvăluie la cerere câteva anunțuri reale dintr-un rând de raport:
 * titlul extras de pe platformă și linkul către pagina-sursă. Așa poți verifica rapid că
 * cifrele din tabel provin din anunțuri reale, nu din pagini de căutare salvate din greșeală.
 *
 * Se încarcă doar la click (maximum 5 anunțuri o dată), ca să nu încetinească pagina.
 */
import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type Sample = {
  id: string;
  title: string | null;
  source_url: string | null;
  source_platform: string | null;
  price: number | null;
};

const eur = (v: number | null) => (v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`);

export default function ListingSourceSamples({
  label = "Vezi anunțurile",
  load,
}: {
  label?: string;
  /** Aduce maximum 5 anunțuri care aparțin rândului (zi, portal, zonă). */
  load: () => Promise<Sample[]>;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Sample[] | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (rows) return;
    setBusy(true);
    try {
      setRows(await load());
    } catch {
      toast.error("Nu am putut încărca anunțurile din acest rând");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs underline underline-offset-2 hover:text-foreground min-h-[32px] text-muted-foreground"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
        {open ? "Ascunde anunțurile" : label}
      </button>
      {open && (
        <ul className="space-y-1 rounded border bg-muted/40 p-2">
          {busy && <li className="text-xs text-muted-foreground">Se încarcă…</li>}
          {!busy && rows?.length === 0 && (
            <li className="text-xs text-muted-foreground">Niciun anunț găsit pentru acest rând.</li>
          )}
          {rows?.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {r.source_url ? (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-primary break-words"
                >
                  {r.title || "Anunț fără titlu"}
                </a>
              ) : (
                <span className="break-words">{r.title || "Anunț fără titlu"}</span>
              )}
              <span className="text-muted-foreground">
                {r.source_platform || "necunoscut"} · {eur(r.price)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
