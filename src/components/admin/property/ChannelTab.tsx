import { Copy, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type Channel = "airbnb" | "booking" | "google";

const CFG: Record<Channel, { label: string; max: number; url: string; photos: string[] }> = {
  airbnb: {
    label: "Airbnb",
    max: 50,
    url: "https://www.airbnb.com/hosting/listings",
    photos: [
      "1. Living luminos, cu lumină naturală (fotografie orizontală, largă)",
      "2. Dormitorul principal, pat făcut, textile deschise",
      "3. Bucătăria / zona de dining echipată",
      "4. Baia curată, bine iluminată",
      "5. Detaliu de atmosferă (balcon, priveliște, cafea)",
      "6. Exterior / ansamblu și parcare, spre final",
    ],
  },
  booking: {
    label: "Booking.com",
    max: 70,
    url: "https://admin.booking.com",
    photos: [
      "1. Dormitorul / patul — Booking afișează des camera în rezultate",
      "2. Ansamblul sau fațada clădirii (context de locație)",
      "3. Living-ul complet",
      "4. Baia",
      "5. Bucătăria și dotările (mașină de spălat, cafetieră)",
      "6. Parcare / acces / self check-in, apoi împrejurimi",
    ],
  },
  google: {
    label: "Google Maps",
    max: 60,
    url: "https://business.google.com/locations",
    photos: [
      "1. Fațada / intrarea clădirii — Google o arată prima în rezultate",
      "2. Livingul, fotografie orizontală luminoasă",
      "3. Dormitorul principal",
      "4. Bucătăria echipată",
      "5. Baia",
      "6. Zona / reperele apropiate (centru, parc, parcare)",
    ],
  },
};

const copy = async (text: string, what: string) => {
  try { await navigator.clipboard.writeText(text); toast({ title: `${what} copiat` }); }
  catch { toast({ title: "Nu am putut copia", variant: "destructive" }); }
};

/** Tab per canal: titluri + descriere cu Copiază Text, sincronizare 1-click (copiere pachet + deschidere extranet) și ordinea recomandată a pozelor. */
export default function ChannelTab({ channel, text }: { channel: Channel; text?: { titles: string[]; description: string } }) {
  const c = CFG[channel];
  if (!text?.titles?.length) return <p className="text-xs text-muted-foreground py-2">Regenerează cu Andrei AI pentru textele {c.label}.</p>;

  const sync = async (target: string, url: string) => {
    await copy(`${text.titles[0]}\n\n${text.description}`, `Pachetul ${c.label}`);
    window.open(url, "_blank", "noopener,noreferrer");
    toast({ title: `Deschis ${target}`, description: "Lipește titlul și descrierea în câmpurile anunțului." });
  };

  return (
    <div className="space-y-3 text-sm">
      {text.titles.map((t) => (
        <div key={t} className="flex items-center justify-between gap-2 rounded border border-border p-2">
          <span>{t} <span className="text-xs text-muted-foreground">({t.length}/{c.max})</span></span>
          <Button size="sm" variant="ghost" onClick={() => copy(t, "Titlul")} aria-label="Copiază titlul"><Copy className="w-3 h-3" /></Button>
        </div>
      ))}
      <div className="rounded border border-border p-2 space-y-2">
        <p className="whitespace-pre-line text-muted-foreground">{text.description}</p>
        <Button size="sm" variant="ghost" onClick={() => copy(text.description, "Descrierea")}><Copy className="w-3 h-3 mr-1" /> Copiază text</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => sync(c.label, c.url)}><ExternalLink className="w-3 h-3 mr-1" /> Actualizează pe {c.label}</Button>
        <Button size="sm" variant="outline" onClick={() => sync("Pynbooking", "https://www.pynbooking.com")}><RefreshCw className="w-3 h-3 mr-1" /> Sincronizează cu Pynbooking</Button>
      </div>
      <div className="rounded bg-muted p-2">
        <p className="text-xs font-semibold text-foreground mb-1">Ordine recomandată poze pe {c.label} (A/B)</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">{c.photos.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
    </div>
  );
}
