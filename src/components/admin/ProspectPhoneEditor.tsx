import { useId, useState } from "react";
import { ExternalLink, Loader2, Pencil, Phone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeRoPhone } from "@/lib/ownerOutreachTemplates";

interface ProspectPhoneEditorProps {
  phone: string | null;
  sourceUrl?: string | null;
  /** Salvează numai anunțul curent. Returnează false când salvarea a eșuat. */
  onSave: (normalizedPhone: string) => Promise<boolean>;
}

/** Telefonul de pe un card de triere: poate fi adăugat sau corectat fără a părăsi lista. */
export default function ProspectPhoneEditor({ phone, sourceUrl, onSave }: ProspectPhoneEditorProps) {
  const errorId = useId();
  const [editing, setEditing] = useState(!phone);
  const [draft, setDraft] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const startEdit = () => {
    setDraft(phone ?? "");
    setError("");
    setEditing(true);
  };

  const cancel = () => {
    setDraft(phone ?? "");
    setError("");
    setEditing(false);
  };

  const save = async () => {
    const normalized = normalizeRoPhone(draft);
    if (!normalized) {
      setError("Scrie un număr românesc valid, de exemplu 0722 123 456 sau 0256 123 456.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await onSave(normalized);
      if (saved) {
        setDraft(normalized);
        setEditing(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Numărul nu a putut fi salvat.");
    } finally {
      setSaving(false);
    }
  };

  if (phone && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="flex items-center gap-1.5 text-xs">
          <Phone className="h-3.5 w-3.5 text-primary" /> {phone}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={startEdit}
          className="min-h-12 gap-1.5 px-2 text-xs" aria-label={`Schimbă numărul ${phone}`}>
          <Pencil className="h-3.5 w-3.5" /> Schimbă
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed p-2">
      <p className="flex items-center gap-1.5 text-xs font-medium">
        {phone ? <Pencil className="h-3.5 w-3.5 text-primary" /> : <ShieldAlert className="h-3.5 w-3.5 text-warning" />}
        {phone ? "Corectează numărul" : "Necesită dezvăluire manuală"}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {phone
          ? "Introdu numărul exact din anunț. Pentru WhatsApp este necesar un mobil 07…."
          : "Deschide anunțul, apasă „Arată numărul” pe portal și scrie-l aici. Până atunci nu poate intra în coada de contactare."}
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {sourceUrl && (
          <Button asChild variant="outline" size="sm" className="min-h-12 gap-1.5">
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Deschide anunțul
            </a>
          </Button>
        )}
        <Input value={draft} onChange={(e) => { setDraft(e.target.value); setError(""); }}
          type="tel" inputMode="tel" autoComplete="off" placeholder="07XX XXX XXX"
          aria-label={phone ? "Număr de telefon corectat" : "Telefon dezvăluit manual"}
          aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
          disabled={saving} className="min-h-12 sm:max-w-[190px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void save(); }
            if (e.key === "Escape" && phone && !saving) cancel();
          }} />
        <Button type="button" size="sm" variant="secondary" className="min-h-12"
          onClick={() => void save()} disabled={saving || !draft.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
        </Button>
        {phone && (
          <Button type="button" size="sm" variant="ghost" className="min-h-12" onClick={cancel} disabled={saving}>
            Renunță
          </Button>
        )}
      </div>
      {error && <p id={errorId} role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
