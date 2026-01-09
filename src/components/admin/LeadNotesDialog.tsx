import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Loader2, MessageSquarePlus, Send, StickyNote, Clock } from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";

interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
}

interface LeadNotesDialogProps {
  leadId: string;
  leadName: string;
}

const LeadNotesDialog = ({ leadId, leadName }: LeadNotesDialogProps) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notesCount, setNotesCount] = useState(0);

  const dateLocale = language === "ro" ? ro : enUS;

  const translations = {
    ro: {
      title: "Notițe & Follow-up",
      description: "Gestionează notițele pentru",
      placeholder: "Adaugă o notiță nouă...",
      add: "Adaugă",
      noNotes: "Nu există notițe",
      noNotesDescription: "Adaugă prima notiță pentru acest lead.",
      error: "Eroare",
      loadError: "Nu am putut încărca notițele",
      saveError: "Nu am putut salva notița",
      saveSuccess: "Notiță adăugată",
    },
    en: {
      title: "Notes & Follow-up",
      description: "Manage notes for",
      placeholder: "Add a new note...",
      add: "Add",
      noNotes: "No notes yet",
      noNotesDescription: "Add the first note for this lead.",
      error: "Error",
      loadError: "Could not load notes",
      saveError: "Could not save note",
      saveSuccess: "Note added",
    },
  };

  const text = translations[language as keyof typeof translations] || translations.en;

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen, leadId]);

  // Fetch notes count on mount
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("lead_notes")
        .select("*", { count: "exact", head: true })
        .eq("lead_id", leadId);
      setNotesCount(count || 0);
    };
    fetchCount();
  }, [leadId]);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
      setNotesCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast({
        title: text.error,
        description: text.loadError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("lead_notes")
        .insert({
          lead_id: leadId,
          content: newNote.trim(),
          created_by: userData?.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setNotesCount((prev) => prev + 1);
      setNewNote("");
      toast({ title: text.saveSuccess });
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: text.error,
        description: text.saveError,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleAddNote();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative"
          title={text.title}
        >
          <MessageSquarePlus className="w-4 h-4" />
          {notesCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
              {notesCount > 9 ? "9+" : notesCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" />
            {text.title}
          </DialogTitle>
          <DialogDescription>
            {text.description} <span className="font-medium text-foreground">{leadName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new note */}
          <div className="flex gap-2">
            <Textarea
              placeholder={text.placeholder}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] resize-none"
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || isSaving}
              size="icon"
              className="h-auto"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Notes list */}
          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <StickyNote className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="font-medium text-foreground">{text.noNotes}</p>
                <p className="text-sm text-muted-foreground">{text.noNotesDescription}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(note.created_at), "d MMM yyyy, HH:mm", {
                        locale: dateLocale,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadNotesDialog;
