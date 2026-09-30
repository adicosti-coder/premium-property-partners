import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

const TEMPLATES = [
  { name: "prospect_intro_premium_v6", label: "Prim contact v6 (vânzare / închiriere / regim hotelier)" },
  { name: "andrei_followup_ro", label: "Reamintire Andrei" },
];

/** Trimite un mesaj de test cu un șablon aprobat, ca să verificăm răspunsurile rapide. */
export default function WhatsAppTestSendPanel() {
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState("Cetate");
  const [tpl, setTpl] = useState(TEMPLATES[0].name);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("wa-test-send", {
      body: { to: phone.trim(), template_name: tpl, template_language: "ro", template_params: [zone.trim() || "Timișoara"] },
    });
    setBusy(false);
    if (error) { setResult(error.message); toast({ title: "Nu am putut trimite", description: error.message, variant: "destructive" }); return; }
    if (data?.error) { setResult(`${data.error}${data.detail ? ` — ${data.detail}` : ""}`); toast({ title: "Meta a refuzat mesajul", variant: "destructive" }); return; }
    setResult("Trimis. Vezi răspunsul în Istoric WhatsApp.");
    toast({ title: "Mesaj de test trimis" });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Test mesaj WhatsApp (șablon aprobat)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Mesajul pleacă de pe numărul oficial de companie. Apasă unul dintre cele trei butoane primite pe telefon
          (Colaborare vânzare / Închiriere clasică / Regim hotelier) și răspunsul lui Andrei apare în Istoric WhatsApp.
        </p>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Număr destinatar: 07xxxxxxxx" aria-label="Număr destinatar" inputMode="tel" />
        <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zona menționată în mesaj (ex. Cetate)" aria-label="Zona din mesaj" />
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <Button key={t.name} size="sm" variant={tpl === t.name ? "default" : "outline"} onClick={() => setTpl(t.name)}>{t.label}</Button>
          ))}
        </div>
        <Button onClick={send} disabled={busy || !phone.trim()} className="min-h-12">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Trimite mesajul de test
        </Button>
        {result && <p className="text-sm text-muted-foreground">{result}</p>}
      </CardContent>
    </Card>
  );
}
