import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FileText, Save, Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface VoiceScript {
  id: string;
  name: string;
  system_prompt: string;
  language: string;
  is_active: boolean;
  notes: string | null;
  updated_at: string;
}

export default function VoiceAgentScriptsEditor() {
  const [scripts, setScripts] = useState<VoiceScript[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{ name: string; system_prompt: string; notes: string; language: string }>({
    name: "", system_prompt: "", notes: "", language: "ro",
  });

  const selected = scripts.find((s) => s.id === selectedId) || null;
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
        toast({ title: "Salvat", description: "Scriptul a fost actualizat." });
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
    // Deactivate all others in this language, then activate selected (unique index handles enforcement)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Scripturi Voice Agent (System Prompt)
        </CardTitle>
        <CardDescription>
          Editează instrucțiunile AI folosite în apelurile vocale. Scriptul marcat <strong>activ</strong> per limbă este folosit live de Ana în toate apelurile.
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
                {draft.system_prompt.length} caractere • lead context și sentiment se adaugă automat la final.
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

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <Button onClick={handleSave} disabled={saving || !isDirty}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {selectedId ? "Salvează modificările" : "Creează script"}
              </Button>

              {selected && !selected.is_active && (
                <Button onClick={handleActivate} disabled={saving || isDirty} variant="default" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Activează live
                </Button>
              )}

              {selected && selected.is_active && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Folosit live în apeluri
                </Badge>
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
                        Această acțiune nu poate fi anulată.
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
                <span className="text-[10px] text-amber-600 ml-2">Modificări nesalvate</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
