import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  FileText, Save, Plus, Trash2, CheckCircle2, Loader2,
  Eye, PhoneCall, History, RotateCcw, FlaskConical, AlertTriangle, RefreshCw,
  Sparkles, Wand2, FileDown, HelpCircle, User2,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  ab_variant_script_id: string | null;
  ab_traffic_split: number;
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

interface TestLog {
  id: string;
  script_id: string | null;
  script_name: string | null;
  script_version: number | null;
  ab_variant: string | null;
  session_id: string | null;
  to_number: string | null;
  status: string;
  fallback_reason: string | null;
  outcome: string | null;
  call_duration_seconds: number | null;
  transcript_turns: number | null;
  is_test_call: boolean;
  created_at: string;
}

const SAMPLE_LEAD_CONTEXT = `Vorbești cu dl/dna Ionescu. Context lead: Apartament 3 camere, Iosefin — preț listat 95000 EUR — categorie: vanzare. Sugestie pitch: scoate-i în evidență că avem cumpărători cu finanțare pre-aprobată.`;
const SAMPLE_SENTIMENT_BLOCK = `\nTON: empatic, cald, direct. Recunoaște situația ("înțeleg că aveți nevoie rapid"). Propune vizionare în 24-48h. Urgență 7/10.`;

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function validateScript(name: string, prompt: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!name.trim()) errors.push("Numele este obligatoriu.");
  if (name.length > 80) errors.push("Numele poate avea maxim 80 caractere.");
  const p = prompt.trim();
  if (!p) errors.push("System prompt-ul nu poate fi gol.");
  if (p.length < 80) errors.push(`System prompt-ul e prea scurt (${p.length} caractere, minim 80).`);
  if (p.length > 8000) errors.push(`System prompt-ul e prea lung (${p.length} caractere, maxim 8000).`);
  // Unbalanced braces or backticks
  const openBraces = (p.match(/\{/g) || []).length;
  const closeBraces = (p.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) warnings.push(`Acolade neechilibrate: ${openBraces} { vs ${closeBraces} }.`);
  const backticks = (p.match(/`/g) || []).length;
  if (backticks % 2 !== 0) warnings.push(`Număr impar de backtick-uri (${backticks}).`);
  // Romanian heuristic for ro scripts
  const hasDiacritics = /[ăâîșțĂÂÎȘȚ]/.test(p);
  if (!hasDiacritics) warnings.push("Promptul nu conține diacritice — verifică dacă e într-adevăr în română.");
  if (!/română|romana/i.test(p) && !hasDiacritics) {
    warnings.push("Nu se menționează limba română explicit. AI-ul ar putea derapa în engleză.");
  }
  return { errors, warnings };
}

const STATUS_VARIANT: Record<string, { label: string; cls: string }> = {
  success: { label: "✅ Success", cls: "bg-green-100 text-green-800" },
  pending: { label: "⏳ Pending", cls: "bg-blue-100 text-blue-800" },
  fallback: { label: "⚠️ Fallback", cls: "bg-amber-100 text-amber-800" },
  failed: { label: "❌ Failed", cls: "bg-red-100 text-red-800" },
};

export default function VoiceAgentScriptsEditor() {
  const [scripts, setScripts] = useState<VoiceScript[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{ name: string; system_prompt: string; notes: string; language: string }>({
    name: "", system_prompt: "", notes: "", language: "ro",
  });

  const [showPreview, setShowPreview] = useState(false);

  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [logs, setLogs] = useState<TestLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsScopeAll, setLogsScopeAll] = useState(false);

  const [testNumber, setTestNumber] = useState<string>(
    () => localStorage.getItem("voice_script_test_number") || "+40",
  );
  const [testing, setTesting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const selected = scripts.find((s) => s.id === selectedId) || null;
  const activeScript = useMemo(
    () => scripts.find((s) => s.is_active && s.language === (selected?.language || "ro")) || null,
    [scripts, selected?.language],
  );

  const validation = useMemo(() => validateScript(draft.name, draft.system_prompt), [draft.name, draft.system_prompt]);
  const canSave = validation.errors.length === 0;

  const isDirty = selected
    ? draft.name !== selected.name ||
      draft.system_prompt !== selected.system_prompt ||
      (draft.notes || "") !== (selected.notes || "") ||
      draft.language !== selected.language
    : draft.name.length > 0 || draft.system_prompt.length > 0;

  // ──────────── Loaders ────────────
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

  const loadVersions = async () => {
    if (!selected) { setVersions([]); return; }
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

  const loadLogs = async () => {
    setLogsLoading(true);
    let query = supabase
      .from("voice_agent_script_test_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!logsScopeAll && selected) query = query.eq("script_id", selected.id);
    const { data, error } = await query;
    if (error) {
      toast({ title: "Eroare loguri", description: error.message, variant: "destructive" });
    } else {
      setLogs((data || []) as TestLog[]);
    }
    setLogsLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadVersions(); loadLogs(); /* eslint-disable-next-line */ }, [selectedId, logsScopeAll]);

  // Realtime: refresh logs when new sessions/log rows arrive
  useEffect(() => {
    const ch = supabase
      .channel("voice-script-test-logs")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "voice_agent_script_test_logs" },
        () => loadLogs(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [selectedId, logsScopeAll]);

  // ──────────── Mutations ────────────
  const handleNew = () => {
    setSelectedId(null);
    setDraft({ name: "", system_prompt: "", notes: "", language: "ro" });
  };

  const handleSave = async () => {
    if (!canSave) {
      toast({ title: "Validare eșuată", description: validation.errors.join(" "), variant: "destructive" });
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
      if (error) toast({ title: "Eroare salvare", description: error.message, variant: "destructive" });
      else { toast({ title: "Salvat ✓", description: "O versiune nouă a fost creată automat." }); await load(); await loadVersions(); }
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
      if (error) toast({ title: "Eroare creare", description: error.message, variant: "destructive" });
      else { toast({ title: "Creat" }); await load(); if (data) setSelectedId((data as any).id); }
    }
    setSaving(false);
  };

  const handleActivate = async () => {
    if (!selected) return;
    setSaving(true);
    const { error: deactErr } = await supabase
      .from("voice_agent_scripts").update({ is_active: false })
      .eq("language", selected.language).neq("id", selected.id);
    if (deactErr) { toast({ title: "Eroare", description: deactErr.message, variant: "destructive" }); setSaving(false); return; }
    const { error } = await supabase.from("voice_agent_scripts").update({ is_active: true }).eq("id", selected.id);
    if (error) toast({ title: "Eroare activare", description: error.message, variant: "destructive" });
    else { toast({ title: "Activat ✅", description: `"${selected.name}" este live (${selected.language}).` }); await load(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (selected.is_active) { toast({ title: "Nu poți șterge scriptul activ", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("voice_agent_scripts").delete().eq("id", selected.id);
    if (error) toast({ title: "Eroare ștergere", description: error.message, variant: "destructive" });
    else { toast({ title: "Șters" }); setSelectedId(null); setDraft({ name: "", system_prompt: "", notes: "", language: "ro" }); await load(); }
    setSaving(false);
  };

  const handleRollback = async (v: ScriptVersion) => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("voice_agent_scripts")
      .update({ name: v.name, system_prompt: v.system_prompt, notes: v.notes, language: v.language })
      .eq("id", selected.id);
    if (error) toast({ title: "Eroare rollback", description: error.message, variant: "destructive" });
    else { toast({ title: "Rollback ✓", description: `Restaurat la v${v.version_number}.` }); await load(); await loadVersions(); }
    setSaving(false);
  };

  // ──────────── A/B settings ────────────
  const updateAb = async (patch: Partial<Pick<VoiceScript, "ab_variant_script_id" | "ab_traffic_split">>) => {
    if (!activeScript) return;
    const { error } = await supabase.from("voice_agent_scripts").update(patch).eq("id", activeScript.id);
    if (error) toast({ title: "Eroare A/B", description: error.message, variant: "destructive" });
    else { toast({ title: "A/B actualizat" }); await load(); }
  };

  // ──────────── Preview compus ────────────
  const composedPreview = useMemo(() => {
    const base = (draft.system_prompt || "").trim();
    return `${base}\n\n${SAMPLE_LEAD_CONTEXT}${SAMPLE_SENTIMENT_BLOCK}`;
  }, [draft.system_prompt]);

  const composedActivePreview = useMemo(() => {
    const base = (activeScript?.system_prompt || "").trim();
    if (!base) return "⚠️ Niciun script activ. Se va folosi fallback-ul hardcodat din edge function.";
    return `${base}\n\n${SAMPLE_LEAD_CONTEXT}${SAMPLE_SENTIMENT_BLOCK}`;
  }, [activeScript]);

  // ──────────── Test Call ────────────
  const handleTestCall = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(testNumber)) {
      toast({ title: "Număr invalid", description: "Format E.164 (ex: +407...)", variant: "destructive" });
      return;
    }
    if (!activeScript) {
      toast({ title: "Niciun script activ", description: "Activează un script înainte.", variant: "destructive" });
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
          description: `Folosește scriptul "${activeScript.name}". Apel apare în Loguri Teste imediat ce începe.`,
        });
        // Refresh logs after a short delay
        setTimeout(loadLogs, 2500);
      }
    } finally {
      setTesting(false);
    }
  };

  // ──────────── Macros ────────────
  const LEAD_CONTEXT_MACRO = `\n\n## CONTEXT LEAD (se completează automat la rulare)\nVorbești cu: {{lead_name}}\nProprietate: {{property_title}} — {{property_location}}\nPreț: {{property_price}} EUR — Categorie: {{listing_category}}\nNotițe scoring AI: {{lead_notes}}\nObiectiv apel: {{objective}}\n`;
  const FAQ_MACRO = `\n\n## FAQ SCURT (răspunsuri-șablon)\n- "Cine sunteți?" → "Sunt asistentul digital RealTrust, sun în numele agentului care v-a contactat anterior."\n- "De unde aveți numărul?" → "Din anunțul publicat sau dintr-o solicitare anterioară pe RealTrust.ro. Dacă doriți, vă scot din lista noastră."\n- "Nu am timp acum." → "Înțeleg. Vă pot suna la o oră convenabilă astăzi sau mâine. Care vă convine?"\n- "Trimiteți pe WhatsApp." → "Sigur, vă trimit imediat detaliile pe WhatsApp la acest număr."\n- "Care e comisionul?" → "Comisionul se discută cu agentul după vizionare, în funcție de tip tranzacție. Pot să vă programez o discuție?"\n`;

  const insertMacro = (macro: string) => {
    setDraft((d) => ({ ...d, system_prompt: (d.system_prompt || "").trimEnd() + macro }));
    toast({ title: "Macro inserat", description: "Salvează scriptul ca să persiste." });
  };

  // ──────────── AI: Generează variantă premium A/B ────────────
  const handleGenerateVariant = async () => {
    if (!selected) {
      toast({ title: "Selectează un script", description: "Folosesc scriptul selectat ca bază.", variant: "destructive" });
      return;
    }
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-script-generate", {
        body: { script_id: selected.id, mode: "premium_variant" },
      });
      if (error || (data as any)?.error) {
        toast({
          title: "Generare eșuată",
          description: (data as any)?.error || error?.message || "Eroare necunoscută",
          variant: "destructive",
        });
      } else {
        const newScript = (data as any)?.script;
        toast({ title: "Variantă AI creată ✨", description: `"${newScript?.name}" — selecteaz-o ca varianta B în tab-ul A/B.` });
        await load();
        if (newScript?.id) setSelectedId(newScript.id);
      }
    } finally {
      setGeneratingAI(false);
    }
  };

  // ──────────── Export PDF (raport teste) ────────────
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const now = new Date();
      doc.setFontSize(16);
      doc.text("Voice Agent — Raport Loguri Teste", 40, 40);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generat: ${now.toLocaleString("ro-RO")}`, 40, 58);
      doc.text(`Scope: ${logsScopeAll ? "Toate scripturile" : `Doar "${selected?.name || "—"}"`}`, 40, 72);
      doc.text(`Total intrări: ${logs.length}`, 40, 86);

      const head = [["Data", "Script", "v", "A/B", "Număr", "Status", "Outcome", "Durată", "Replici", "Fallback motiv"]];
      const body = logs.map((l) => [
        new Date(l.created_at).toLocaleString("ro-RO"),
        l.script_name || "—",
        l.script_version ?? "—",
        l.ab_variant || "—",
        l.to_number || "—",
        l.status,
        l.outcome || "—",
        l.call_duration_seconds ? `${l.call_duration_seconds}s` : "—",
        l.transcript_turns ?? "—",
        l.fallback_reason || "—",
      ]);

      autoTable(doc, {
        startY: 105,
        head,
        body,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 95 }, 1: { cellWidth: 90 }, 2: { cellWidth: 25 },
          3: { cellWidth: 35 }, 4: { cellWidth: 80 }, 5: { cellWidth: 55 },
          6: { cellWidth: 80 }, 7: { cellWidth: 45 }, 8: { cellWidth: 40 },
          9: { cellWidth: 220 },
        },
      });

      doc.save(`voice-agent-test-logs-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`);
      toast({ title: "PDF exportat ✓", description: `${logs.length} intrări.` });
    } catch (e) {
      toast({ title: "Eroare export", description: e instanceof Error ? e.message : "Necunoscută", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Voice Agent — Scripturi & Testare
        </CardTitle>
        <CardDescription>
          Gestionează prompt-urile AI, rulează A/B test, urmărește logurile.
          {!activeScript && <span className="text-amber-600"> ⚠️ Niciun script activ — se folosește fallback-ul hardcodat.</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="editor">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="editor"><FileText className="h-4 w-4 mr-1" /> Editor</TabsTrigger>
            <TabsTrigger value="ab"><FlaskConical className="h-4 w-4 mr-1" /> A/B Testing</TabsTrigger>
            <TabsTrigger value="versions"><History className="h-4 w-4 mr-1" /> Istoric</TabsTrigger>
            <TabsTrigger value="logs"><PhoneCall className="h-4 w-4 mr-1" /> Loguri Teste</TabsTrigger>
          </TabsList>

          {/* ───────── EDITOR ───────── */}
          <TabsContent value="editor" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
              {/* Sidebar */}
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
                    <div className="p-4 text-center text-xs text-muted-foreground">Niciun script.</div>
                  )}
                  {scripts.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectId(s.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedId === s.id ? "bg-muted" : ""}`}
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

              {/* Editor pane */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-2">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Nume script</label>
                    <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="ex: default, agresiv" />
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
                  <label className="text-xs font-medium mb-1 block">System prompt</label>
                  <Textarea
                    value={draft.system_prompt}
                    onChange={(e) => setDraft({ ...draft, system_prompt: e.target.value })}
                    placeholder="Instrucțiunile complete pentru AI..."
                    rows={16}
                    className="font-mono text-xs"
                  />
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {draft.system_prompt.length} caractere • lead context + sentiment se concatenează automat la rulare.
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Notițe</label>
                  <Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Ce variantă e asta..." />
                </div>

                {/* Validation panel */}
                {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                  <div className={`rounded-md border p-3 text-xs space-y-1 ${validation.errors.length ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                    <div className="font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Validare
                    </div>
                    {validation.errors.map((e, i) => <div key={`e${i}`} className="text-red-700">❌ {e}</div>)}
                    {validation.warnings.map((w, i) => <div key={`w${i}`} className="text-amber-700">⚠️ {w}</div>)}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <Button onClick={handleSave} disabled={saving || !isDirty || !canSave}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    {selectedId ? "Salvează" : "Creează"}
                  </Button>
                  {selected && !selected.is_active && (
                    <Button onClick={handleActivate} disabled={saving || isDirty} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Activează
                    </Button>
                  )}
                  {selected?.is_active && (
                    <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Folosit live</Badge>
                  )}
                  <Button onClick={() => setShowPreview(true)} variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" /> Vizualizează prompt activ
                  </Button>
                  {selected && !selected.is_active && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive ml-auto">
                          <Trash2 className="h-4 w-4 mr-1" /> Șterge
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ștergi "{selected.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>Se șterg și versiunile din istoric.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Șterge</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {isDirty && <span className="text-[10px] text-amber-600">Modificări nesalvate</span>}
                </div>

                {/* Test bar */}
                <div className="flex flex-wrap items-end gap-2 pt-3 border-t border-border bg-muted/30 -mx-6 px-6 py-3">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-xs font-medium mb-1 block">Test Call — număr destinație</label>
                    <Input value={testNumber} onChange={(e) => setTestNumber(e.target.value)} placeholder="+407..." className="bg-background" />
                  </div>
                  <Button onClick={handleTestCall} disabled={testing || !activeScript}>
                    {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <PhoneCall className="h-4 w-4 mr-1" />}
                    Test Call cu scriptul activ
                  </Button>
                  {activeScript ? (
                    <span className="text-[10px] text-muted-foreground">
                      Va folosi: <strong>{activeScript.name}</strong>
                      {activeScript.ab_traffic_split > 0 && activeScript.ab_variant_script_id ? ` (A/B: ${100 - activeScript.ab_traffic_split}/${activeScript.ab_traffic_split})` : ""}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600">Activează un script ca să poți testa</span>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ───────── A/B TESTING ───────── */}
          <TabsContent value="ab" className="pt-4 space-y-4">
            {!activeScript ? (
              <div className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-md">
                Activează un script (în tab-ul Editor) pentru a configura A/B testing.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Varianta A (script activ)</div>
                      <div className="text-xs text-muted-foreground">{activeScript.name}</div>
                    </div>
                    <Badge variant="default">A — {100 - (activeScript.ab_traffic_split || 0)}%</Badge>
                  </div>
                </div>

                <div className="rounded-md border border-border p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Varianta B (challenger)</label>
                    <Select
                      value={activeScript.ab_variant_script_id || "none"}
                      onValueChange={(v) => updateAb({ ab_variant_script_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selectează scriptul B" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Niciuna (A/B oprit) —</SelectItem>
                        {scripts
                          .filter((s) => s.id !== activeScript.id && s.language === activeScript.language)
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium">Traffic split spre B</label>
                      <Badge variant="outline">{activeScript.ab_traffic_split || 0}%</Badge>
                    </div>
                    <Slider
                      value={[activeScript.ab_traffic_split || 0]}
                      onValueChange={(v) => updateAb({ ab_traffic_split: v[0] })}
                      min={0}
                      max={100}
                      step={5}
                      disabled={!activeScript.ab_variant_script_id}
                    />
                    <div className="text-[10px] text-muted-foreground mt-1">
                      0% = doar A. 50% = împărțit egal. 100% = doar B (echivalent cu activarea B).
                    </div>
                  </div>

                  <div className="text-xs bg-muted/50 rounded p-2">
                    💡 Distribuția e <strong>deterministă per sesiune</strong> (hash pe sessionId), deci același apel folosește aceeași variantă pe toate turele.
                    Compară rezultatele în tab-ul <strong>Loguri Teste</strong> filtrând după coloana "Variant".
                  </div>
                </div>

                {/* Quick A/B stats */}
                <ABStats logs={logs} />
              </div>
            )}
          </TabsContent>

          {/* ───────── VERSIUNI ───────── */}
          <TabsContent value="versions" className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm">
                Istoric pentru: <strong>{selected?.name || "—"}</strong>
              </div>
              <Button variant="ghost" size="sm" onClick={loadVersions}>
                <RefreshCw className="h-4 w-4 mr-1" /> Reîmprospătează
              </Button>
            </div>
            <ScrollArea className="max-h-[60vh]">
              {versionsLoading && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 inline animate-spin mr-2" /> Încarc...
                </div>
              )}
              {!versionsLoading && versions.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">Niciuna încă.</div>
              )}
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="border border-border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm">v{v.version_number}</span>
                        <span className="text-xs text-muted-foreground ml-2">{new Date(v.created_at).toLocaleString("ro-RO")}</span>
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
                              Conținutul curent va fi înlocuit. Modificările actuale rămân în istoric.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anulează</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRollback(v)}>Restore</AlertDialogAction>
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
          </TabsContent>

          {/* ───────── LOGURI TESTE ───────── */}
          <TabsContent value="logs" className="pt-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Switch checked={logsScopeAll} onCheckedChange={setLogsScopeAll} id="logs-all" />
                <label htmlFor="logs-all" className="text-xs">Arată toate scripturile (nu doar cel selectat)</label>
              </div>
              <Button variant="ghost" size="sm" onClick={loadLogs}>
                <RefreshCw className="h-4 w-4 mr-1" /> Reîmprospătează
              </Button>
            </div>

            <div className="border border-border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Script</TableHead>
                    <TableHead className="text-xs">v</TableHead>
                    <TableHead className="text-xs">A/B</TableHead>
                    <TableHead className="text-xs">Număr</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Outcome</TableHead>
                    <TableHead className="text-xs">Durată</TableHead>
                    <TableHead className="text-xs">Detalii</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading && (
                    <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">
                      <Loader2 className="h-4 w-4 inline animate-spin mr-2" /> Încarc...
                    </TableCell></TableRow>
                  )}
                  {!logsLoading && logs.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">Niciun log încă. Rulează un Test Call.</TableCell></TableRow>
                  )}
                  {logs.map((l) => {
                    const sv = STATUS_VARIANT[l.status] || { label: l.status, cls: "bg-muted" };
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("ro-RO")}</TableCell>
                        <TableCell className="text-xs font-medium">{l.script_name || "—"}</TableCell>
                        <TableCell className="text-xs">{l.script_version ?? "—"}</TableCell>
                        <TableCell className="text-xs">{l.ab_variant ? <Badge variant="outline" className="text-[10px]">{l.ab_variant}</Badge> : "—"}</TableCell>
                        <TableCell className="text-xs">{l.to_number || "—"}</TableCell>
                        <TableCell><Badge className={`text-[10px] ${sv.cls}`}>{sv.label}</Badge></TableCell>
                        <TableCell className="text-xs">{l.outcome || "—"}</TableCell>
                        <TableCell className="text-xs">{l.call_duration_seconds ? `${l.call_duration_seconds}s` : "—"}</TableCell>
                        <TableCell className="text-xs max-w-[260px]">
                          {l.fallback_reason && (
                            <div className="text-amber-700 truncate" title={l.fallback_reason}>⚠️ {l.fallback_reason}</div>
                          )}
                          {l.transcript_turns != null && (
                            <div className="text-muted-foreground">{l.transcript_turns} replici</div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Logurile se actualizează automat în timp real. Status: <strong>pending</strong> = în desfășurare, <strong>success</strong> = apel finalizat OK, <strong>fallback</strong> = scriptul activ nu s-a putut încărca, <strong>failed</strong> = apel încheiat cu eroare.
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" /> Prompt activ compus
              </DialogTitle>
              <DialogDescription>
                Așa ajunge system prompt-ul la AI: <strong>scriptul activ</strong> + lead context (exemplu) + sentiment block (exemplu).
                În producție, lead context și sentiment se înlocuiesc cu date reale.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] border border-border rounded-md p-4 bg-muted/30">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">{composedActivePreview}</pre>
            </ScrollArea>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Script activ: <strong>{activeScript?.name || "—"}</strong></span>
              <span>{composedActivePreview.length} caractere</span>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function ABStats({ logs }: { logs: TestLog[] }) {
  const stats = useMemo(() => {
    const acc: Record<string, { total: number; success: number; failed: number; fallback: number }> = {};
    for (const l of logs) {
      const key = l.ab_variant || "—";
      if (!acc[key]) acc[key] = { total: 0, success: 0, failed: 0, fallback: 0 };
      acc[key].total++;
      if (l.status === "success") acc[key].success++;
      else if (l.status === "failed") acc[key].failed++;
      else if (l.status === "fallback") acc[key].fallback++;
    }
    return acc;
  }, [logs]);

  const keys = Object.keys(stats);
  if (keys.length === 0) return null;
  return (
    <div className="rounded-md border border-border p-4">
      <div className="text-sm font-semibold mb-2">Comparare rezultate (din loguri)</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Variant</TableHead>
            <TableHead className="text-xs">Total</TableHead>
            <TableHead className="text-xs">Success</TableHead>
            <TableHead className="text-xs">Failed</TableHead>
            <TableHead className="text-xs">Fallback</TableHead>
            <TableHead className="text-xs">% Success</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((k) => {
            const s = stats[k];
            const pct = s.total ? Math.round((s.success / s.total) * 100) : 0;
            return (
              <TableRow key={k}>
                <TableCell className="text-xs"><Badge variant="outline">{k}</Badge></TableCell>
                <TableCell className="text-xs">{s.total}</TableCell>
                <TableCell className="text-xs text-green-700">{s.success}</TableCell>
                <TableCell className="text-xs text-red-700">{s.failed}</TableCell>
                <TableCell className="text-xs text-amber-700">{s.fallback}</TableCell>
                <TableCell className="text-xs font-semibold">{pct}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
