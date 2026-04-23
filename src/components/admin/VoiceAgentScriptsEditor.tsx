import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  FileText, Save, Plus, Trash2, CheckCircle2, Loader2,
  Eye, PhoneCall, History, RotateCcw,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VoiceScript {
  id: string;
  name: string;
  system_prompt: string;
  language: string;
  is_active: boolean;
  notes: string | null;
  updated_at: string;
}

interface ScriptVersion {
  id: string;
  script_id: string;
  version_number: number;
  name: string;
  system_prompt: string;
  notes: string | null;
  language: string;
  created_at: string;
}

const SAMPLE_LEAD_CONTEXT = `Vorbești cu dl/dna Ionescu. Context lead: Apartament 3 camere, Iosefin — preț listat 95000 EUR — categorie: vanzare. Sugestie pitch: scoate-i în evidență că avem cumpărători cu finanțare pre-aprobată.`;
const SAMPLE_SENTIMENT_BLOCK = `\nTON: empatic, cald, direct. Recunoaște situația ("înțeleg că aveți nevoie rapid"). Propune vizionare în 24-48h. Urgență 7/10.`;

export default function VoiceAgentScriptsEditor() {
  const [scripts, setScripts] = useState<VoiceScript[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{ name: string; system_prompt: string; notes: string; language: string }>({
    name: "", system_prompt: "", notes: "", language: "ro",
  });

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // Versions
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Test call
  const [testNumber, setTestNumber] = useState<string>(
    () => localStorage.getItem("voice_script_test_number") || "+40",
  );
  const [testing, setTesting] = useState(false);

  const selected = scripts.find((s) => s.id === selectedId) || null;
  const activeScript = scripts.find((s) => s.is_active && s.language === (selected?.language || "ro")) || null;

  const isDirty = selected
    ? draft.name !== selected.name ||
      draft.system_prompt !== selected.system_prompt ||
      (draft.notes || "") !== (selected.notes || "") ||
      draft.language !== selected.language
    : draft.name.length > 0 || draft.system_prompt.length > 0;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("voice_agent_scripts")
      .select("*")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Eroare la încărcare", description: error.message, variant: "destructive" });
    } else {
      const list = (data || []) as VoiceScript[];
      setScripts(list);
      if (!selectedId && list.length > 0) selectId(list[0].id, list);
    }
    setLoading(false);
  };

  const selectId = (id: string, list: VoiceScript[] = scripts) => {
    const s = list.find((x) => x.id === id);
    if (!s) return;
    setSelectedId(id);
    setDraft({
      name: s.name,
      system_prompt: s.system_prompt,
      notes: s.notes || "",
      language: s.language,
    });
  };

  useEffect(() => { load(); }, []);

  const handleNew = () => {
    setSelectedId(null);
    setDraft({ name: "", system_prompt: "", notes: "", language: "ro" });
  };

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.system_prompt.trim()) {
      toast({ title: "Câmpuri obligatorii", description: "Numele și system prompt-ul sunt obligatorii.", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (selectedId) {
      const { error } = await supabase
        .from("voice_agent_scripts")
        .update({
          name: draft.name.trim(),
          system_prompt: draft.system_prompt,
          notes: draft.notes || null,
          language: draft.language,
        })
        .eq("id", selectedId);
      if (error) {
        toast({ title: "Eroare salvare", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Salvat ✓", description: "O versiune nouă a fost creată automat în istoric." });
        await load();
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("voice_agent_scripts")
        .insert({
          name: draft.name.trim(),
          system_prompt: draft.system_prompt,
          notes: draft.notes || null,
          language: draft.language,
          is_active: false,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) {
        toast({ title: "Eroare creare", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Creat", description: "Script nou adăugat (inactiv)." });
        await load();
        if (data) setSelectedId(data.id);
      }
    }
    setSaving(false);
  };

  const handleActivate = async () => {
    if (!selected) return;
    setSaving(true);
    const { error: deactErr } = await supabase
      .from("voice_agent_scripts")
      .update({ is_active: false })
      .eq("language", selected.language)
      .neq("id", selected.id);
    if (deactErr) {
      toast({ title: "Eroare", description: deactErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("voice_agent_scripts")
      .update({ is_active: true })
      .eq("id", selected.id);
    if (error) {
      toast({ title: "Eroare activare", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Activat ✅", description: `"${selected.name}" este acum scriptul live (${selected.language}).` });
      await load();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (selected.is_active) {
      toast({ title: "Nu poți șterge scriptul activ", description: "Activează alt script mai întâi.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("voice_agent_scripts").delete().eq("id", selected.id);
    if (error) {
      toast({ title: "Eroare ștergere", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Șters", description: "Scriptul a fost eliminat." });
      setSelectedId(null);
      setDraft({ name: "", system_prompt: "", notes: "", language: "ro" });
      await load();
    }
    setSaving(false);
  };

  // ──────────── Versions / Rollback ────────────
  const loadVersions = async () => {
    if (!selected) return;
    setVersionsLoading(true);
    const { data, error } = await supabase
      .from("voice_agent_script_versions")
      .select("*")
      .eq("script_id", selected.id)
      .order("version_number", { ascending: false });
    if (error) {
      toast({ title: "Eroare istoric", description: error.message, variant: "destructive" });
    } else {
      setVersions((data || []) as ScriptVersion[]);
    }
    setVersionsLoading(false);
  };

  const openHistory = async () => {
    setShowHistory(true);
    await loadVersions();
  };

  const handleRollback = async (v: ScriptVersion) => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("voice_agent_scripts")
      .update({
        name: v.name,
        system_prompt: v.system_prompt,
        notes: v.notes,
        language: v.language,
      })
      .eq("id", selected.id);
    if (error) {
      toast({ title: "Eroare rollback", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rollback ✓", description: `Restaurat la versiunea v${v.version_number}. O versiune nouă a fost creată automat.` });
      await load();
      await loadVersions();
    }
    setSaving(false);
  };

  // ──────────── Preview compus ────────────
  const composedPreview = (() => {
    const base = (draft.system_prompt || "").trim();
    return `${base}\n\n${SAMPLE_LEAD_CONTEXT}${SAMPLE_SENTIMENT_BLOCK}`;
  })();

  // ──────────── Test Call ────────────
  const handleTestCall = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(testNumber)) {
      toast({ title: "Număr invalid", description: "Format E.164 (ex: +407...)", variant: "destructive" });
      return;
    }
    if (!activeScript) {
      toast({ title: "Niciun script activ", description: "Activează un script înainte de a face un test call.", variant: "destructive" });
      return;
    }
    localStorage.setItem("voice_script_test_number", testNumber);
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-initiate", {
        body: { toNumber: testNumber, objective: "qualify" },
      });
      if (error || (data as any)?.error) {
        toast({
          title: "Test eșuat",
          description: (data as any)?.error || error?.message || "Eroare necunoscută",
          variant: "destructive",
        });
      } else {
        toast({
          title: "📞 Test call inițiat",
          description: `Folosește scriptul "${activeScript.name}". Verifică panoul Voice Agent pentru transcript și raport.`,
        });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Scripturi Voice Agent (System Prompt)
        </CardTitle>
        <CardDescription>
          Editează instrucțiunile AI folosite în apelurile vocale. Scriptul marcat <strong>activ</strong> per limbă este folosit live.
          Lead context-ul și sentimentul proprietarului se adaugă automat la final.
          {!activeScript && <span className="text-amber-600"> ⚠️ Niciun script activ — se folosește fallback-ul hardcodat.</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
          {/* Sidebar list */}
          <div className="space-y-2">
            <Button onClick={handleNew} variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Script nou
            </Button>
            <div className="border border-border rounded-md divide-y max-h-[420px] overflow-y-auto">
              {loading && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 inline animate-spin mr-2" /> Încarc...
                </div>
              )}
              {!loading && scripts.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">Niciun script. Creează primul.</div>
              )}
              {scripts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectId(s.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                    selectedId === s.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{s.name}</span>
                    {s.is_active && (
                      <Badge variant="default" className="shrink-0 text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Activ
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {s.language.toUpperCase()} • {new Date(s.updated_at).toLocaleDateString("ro-RO")}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Nume script</label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="ex: default, agresiv, light-touch"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Limbă</label>
                <Select value={draft.language} onValueChange={(v) => setDraft({ ...draft, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ro">🇷🇴 Română</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">System prompt (instrucțiuni AI)</label>
              <Textarea
                value={draft.system_prompt}
                onChange={(e) => setDraft({ ...draft, system_prompt: e.target.value })}
                placeholder="Instrucțiunile complete pentru AI: rol, ton, reguli, obiective, închidere..."
                rows={18}
                className="font-mono text-xs"
              />
              <div className="text-[10px] text-muted-foreground mt-1">
                {draft.system_prompt.length} caractere • lead context și sentiment se concatenează automat la rulare.
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Notițe (opțional)</label>
              <Input
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Ce încearcă această variantă, când a fost testată etc."
              />
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <Button onClick={handleSave} disabled={saving || !isDirty}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {selectedId ? "Salvează" : "Creează"}
              </Button>

              {selected && !selected.is_active && (
                <Button onClick={handleActivate} disabled={saving || isDirty} variant="default" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Activează
                </Button>
              )}

              {selected && selected.is_active && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Folosit live
                </Badge>
              )}

              <Button onClick={() => setShowPreview(true)} variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" /> Vizualizează prompt activ
              </Button>

              {selected && (
                <Button onClick={openHistory} variant="outline" size="sm">
                  <History className="h-4 w-4 mr-1" /> Istoric versiuni
                </Button>
              )}

              {selected && !selected.is_active && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive ml-auto">
                      <Trash2 className="h-4 w-4 mr-1" /> Șterge
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ștergi scriptul "{selected.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se vor șterge și toate versiunile din istoric. Acțiunea nu poate fi anulată.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anulează</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Șterge</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {isDirty && (
                <span className="text-[10px] text-amber-600">Modificări nesalvate</span>
              )}
            </div>

            {/* Test call bar */}
            <div className="flex flex-wrap items-end gap-2 pt-3 border-t border-border bg-muted/30 -mx-6 px-6 py-3 rounded-b-lg">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs font-medium mb-1 block">Test Call — număr destinație</label>
                <Input
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="+407..."
                  className="bg-background"
                />
              </div>
              <Button
                onClick={handleTestCall}
                disabled={testing || !activeScript}
                className="bg-primary"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <PhoneCall className="h-4 w-4 mr-1" />}
                Test Call cu scriptul activ
              </Button>
              {!activeScript && (
                <span className="text-[10px] text-amber-600">Activează un script ca să poți testa</span>
              )}
              {activeScript && (
                <span className="text-[10px] text-muted-foreground">
                  Va folosi: <strong>{activeScript.name}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" /> Prompt final compus
              </DialogTitle>
              <DialogDescription>
                Așa va arăta system prompt-ul trimis la AI: scriptul tău + lead context (exemplu) + sentiment block (exemplu).
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] border border-border rounded-md p-4 bg-muted/30">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">{composedPreview}</pre>
            </ScrollArea>
            <div className="text-[10px] text-muted-foreground">
              💡 În producție, lead context și sentimentul sunt înlocuite cu date reale din baza de date pentru fiecare apel.
            </div>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Istoric versiuni — {selected?.name}
              </DialogTitle>
              <DialogDescription>
                Fiecare salvare creează automat o versiune nouă. Apasă <strong>Restore</strong> pentru rollback.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {versionsLoading && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 inline animate-spin mr-2" /> Încarc versiuni...
                </div>
              )}
              {!versionsLoading && versions.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">Nicio versiune înregistrată încă.</div>
              )}
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="border border-border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm">v{v.version_number}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(v.created_at).toLocaleString("ro-RO")}
                        </span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <RotateCcw className="h-3 w-3 mr-1" /> Restore
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Rollback la v{v.version_number}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Conținutul curent va fi înlocuit cu această versiune. Modificările actuale vor rămâne în istoric (nu le pierzi).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anulează</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRollback(v)}>
                              Restore v{v.version_number}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="text-xs"><strong>Nume:</strong> {v.name} • <strong>Limbă:</strong> {v.language.toUpperCase()}</div>
                    {v.notes && <div className="text-xs text-muted-foreground"><strong>Notițe:</strong> {v.notes}</div>}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-primary hover:underline">Vezi system prompt</summary>
                      <pre className="mt-2 p-2 bg-muted/30 rounded text-[11px] font-mono whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                        {v.system_prompt}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
