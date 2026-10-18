import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Handshake, Percent, Copy, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PAGE_URL = "https://realtrust.ro/colaborare-agenti";
const DEFAULT_MSG = `Bună ziua! Sunt de la RealTrust Timișoara. Vă propunem o colaborare pe proprietățile din portofoliul dumneavoastră: 50% din încasări la închirieri sau 1% din valoarea tranzacției la vânzări. Detalii: ${PAGE_URL}`;

export default function ColaborareAgenti() {
  const [msg, setMsg] = useState(DEFAULT_MSG);

  useEffect(() => {
    document.title = "Colaborare agenți imobiliari Timișoara | RealTrust";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      "Colaborare RealTrust pentru agenții imobiliari din Timișoara: 50% din încasări sau 1% din valoarea tranzacției.",
    );
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(msg);
    toast({ title: "Mesaj copiat" });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Pentru agenți imobiliari</p>
        <h1 className="mt-2 text-3xl md:text-5xl font-bold">Colaborare cu RealTrust în Timișoara</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Aveți proprietăți de vânzare sau închiriat? Lucrăm împreună și împărțim corect câștigul.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <Handshake className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-xl font-semibold">50% din încasări</h2>
            <p className="mt-2 text-muted-foreground">Pentru închirieri realizate împreună, împărțim în mod egal comisionul încasat.</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Percent className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-xl font-semibold">1% din valoarea tranzacției</h2>
            <p className="mt-2 text-muted-foreground">Pentru vânzări, primiți 1% din prețul final al tranzacției.</p>
          </div>
        </div>

        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">Mesaj scurt pentru WhatsApp</h2>
          <p className="mt-1 text-sm text-muted-foreground">Îl puteți modifica înainte de trimitere.</p>
          <Textarea className="mt-4 min-h-[140px]" value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Mesaj WhatsApp" />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="min-h-[48px]">
              <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Deschide în WhatsApp
              </a>
            </Button>
            <Button variant="outline" onClick={copy} className="min-h-[48px]">
              <Copy className="mr-2 h-4 w-4" /> Copiază mesajul
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
