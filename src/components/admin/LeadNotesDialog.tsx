import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, MessageSquarePlus, Send, StickyNote, Clock, CalendarClock, Bell, X, Check } from "lucide-react";
import { format, isBefore, startOfDay, setHours, setMinutes } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
}

interface LeadNotesDialogProps {
  leadId: string;
  leadName: string;
  followUpDate: string | null;
  onFollowUpChange: (date: string | null) => void;
}

// Generate hour options (0-23)
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
// Generate minute options (0, 15, 30, 45)
const minutes = ["00", "15", "30", "45"];

const LeadNotesDialog = ({ leadId, leadName, followUpDate, onFollowUpChange }: LeadNotesDialogProps) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notesCount, setNotesCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    followUpDate ? new Date(followUpDate) : undefined
  );
  const [selectedHour, setSelectedHour] = useState<string>(
    followUpDate ? format(new Date(followUpDate), "HH") : "09"
  );
  const [selectedMinute, setSelectedMinute] = useState<string>(
    followUpDate ? format(new Date(followUpDate), "mm") : "00"
  );
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
      notesTab: "Notițe",
      reminderTab: "Reminder",
      setReminder: "Setează data și ora",
      reminderSet: "Reminder setat",
      reminderCleared: "Reminder anulat",
      clearReminder: "Anulează reminder",
      saveReminder: "Salvează",
      noReminder: "Niciun reminder setat",
      reminderDescription: "Selectează data și ora pentru follow-up. Vei primi o notificare automată.",
      reminderActive: "Follow-up programat:",
      reminderError: "Nu am putut salva reminder-ul",
      selectTime: "Ora:",
      at: "la",
      cancel: "Anulează",
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
      notesTab: "Notes",
      reminderTab: "Reminder",
      setReminder: "Set date and time",
      reminderSet: "Reminder set",
      reminderCleared: "Reminder cleared",
      clearReminder: "Clear reminder",
      saveReminder: "Save",
      noReminder: "No reminder set",
      reminderDescription: "Select date and time for follow-up. You will receive an automatic notification.",
      reminderActive: "Follow-up scheduled:",
      reminderError: "Could not save reminder",
      selectTime: "Time:",
      at: "at",
      cancel: "Cancel",
    },
  };

  const text = translations[language as keyof typeof translations] || translations.en;

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen, leadId]);

  useEffect(() => {
    if (followUpDate) {
      const date = new Date(followUpDate);
      setSelectedDate(date);
      setSelectedHour(format(date, "HH"));
      // Round to nearest 15 minutes for display
      const mins = date.getMinutes();
      const roundedMins = Math.round(mins / 15) * 15;
      setSelectedMinute(roundedMins === 60 ? "00" : roundedMins.toString().padStart(2, "0"));
    } else {
      setSelectedDate(undefined);
      setSelectedHour("09");
      setSelectedMinute("00");
    }
  }, [followUpDate]);

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

  const getDateTimeWithTime = () => {
    if (!selectedDate) return null;
    let dateWithTime = setHours(selectedDate, parseInt(selectedHour));
    dateWithTime = setMinutes(dateWithTime, parseInt(selectedMinute));
    return dateWithTime;
  };

  const handleSaveReminder = async () => {
    const dateTime = getDateTimeWithTime();
    if (!dateTime) return;

    setIsSavingReminder(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ follow_up_date: dateTime.toISOString() })
        .eq("id", leadId);

      if (error) throw error;

      onFollowUpChange(dateTime.toISOString());
      toast({ title: text.reminderSet });
      setIsCalendarOpen(false);
    } catch (error) {
      console.error("Error saving reminder:", error);
      toast({
        title: text.error,
        description: text.reminderError,
        variant: "destructive",
      });
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleClearReminder = async () => {
    setIsSavingReminder(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ follow_up_date: null })
        .eq("id", leadId);

      if (error) throw error;

      setSelectedDate(undefined);
      setSelectedHour("09");
      setSelectedMinute("00");
      onFollowUpChange(null);
      toast({ title: text.reminderCleared });
    } catch (error) {
      console.error("Error clearing reminder:", error);
      toast({
        title: text.error,
        description: text.reminderError,
        variant: "destructive",
      });
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleAddNote();
    }
  };

  const hasReminder = !!followUpDate;
  const isPastDue = followUpDate ? isBefore(new Date(followUpDate), new Date()) : false;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground hover:text-foreground relative",
            hasReminder && "text-primary"
          )}
          title={text.title}
        >
          <MessageSquarePlus className="w-4 h-4" />
          {(notesCount > 0 || hasReminder) && (
            <span className={cn(
              "absolute -top-1 -right-1 w-4 h-4 text-[10px] rounded-full flex items-center justify-center font-medium",
              hasReminder && isPastDue 
                ? "bg-destructive text-destructive-foreground animate-pulse" 
                : "bg-primary text-primary-foreground"
            )}>
              {hasReminder ? <Bell className="w-2.5 h-2.5" /> : notesCount > 9 ? "9+" : notesCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" />
            {text.title}
          </DialogTitle>
          <DialogDescription>
            {text.description} <span className="font-medium text-foreground">{leadName}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              {text.notesTab}
              {notesCount > 0 && (
                <span className="ml-1 text-xs bg-muted px-1.5 rounded-full">{notesCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reminder" className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              {text.reminderTab}
              {hasReminder && (
                <span className={cn(
                  "ml-1 w-2 h-2 rounded-full",
                  isPastDue ? "bg-destructive animate-pulse" : "bg-primary"
                )} />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-4 mt-4">
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
            <ScrollArea className="h-[280px] pr-4">
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
          </TabsContent>

          <TabsContent value="reminder" className="mt-4">
            <div className="space-y-4">
              {/* Current reminder status */}
              {hasReminder && (
                <div className={cn(
                  "p-4 rounded-lg border flex items-center justify-between",
                  isPastDue 
                    ? "bg-destructive/10 border-destructive/30" 
                    : "bg-primary/10 border-primary/30"
                )}>
                  <div className="flex items-center gap-3">
                    <Bell className={cn(
                      "w-5 h-5",
                      isPastDue ? "text-destructive" : "text-primary"
                    )} />
                    <div>
                      <p className="text-sm font-medium">{text.reminderActive}</p>
                      <p className={cn(
                        "text-lg font-semibold",
                        isPastDue ? "text-destructive" : "text-primary"
                      )}>
                        {format(new Date(followUpDate!), "EEEE, d MMMM yyyy", {
                          locale: dateLocale,
                        })}
                        <span className="ml-2 text-base">
                          {text.at} {format(new Date(followUpDate!), "HH:mm")}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearReminder}
                    disabled={isSavingReminder}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {isSavingReminder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* Date and time picker */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{text.reminderDescription}</p>
                
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        <>
                          {format(selectedDate, "PPP", { locale: dateLocale })} {text.at} {selectedHour}:{selectedMinute}
                        </>
                      ) : (
                        text.setReminder
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => isBefore(date, startOfDay(new Date()))}
                      initialFocus
                      locale={dateLocale}
                    />
                    
                    {/* Time picker */}
                    <div className="p-3 border-t space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {text.selectTime}
                        </Label>
                        <div className="flex items-center gap-1">
                          <Select value={selectedHour} onValueChange={setSelectedHour}>
                            <SelectTrigger className="w-[70px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {hours.map((hour) => (
                                <SelectItem key={hour} value={hour}>
                                  {hour}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-lg font-medium">:</span>
                          <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                            <SelectTrigger className="w-[70px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {minutes.map((minute) => (
                                <SelectItem key={minute} value={minute}>
                                  {minute}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Quick time presets */}
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: "09:00", hour: "09", min: "00" },
                          { label: "10:00", hour: "10", min: "00" },
                          { label: "12:00", hour: "12", min: "00" },
                          { label: "14:00", hour: "14", min: "00" },
                          { label: "16:00", hour: "16", min: "00" },
                          { label: "18:00", hour: "18", min: "00" },
                        ].map((preset) => (
                          <Button
                            key={preset.label}
                            variant="outline"
                            size="sm"
                            className={cn(
                              "text-xs px-2 h-7",
                              selectedHour === preset.hour && selectedMinute === preset.min && 
                              "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                            onClick={() => {
                              setSelectedHour(preset.hour);
                              setSelectedMinute(preset.min);
                            }}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-3 border-t flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCalendarOpen(false)}
                      >
                        {text.cancel}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveReminder}
                        disabled={!selectedDate || isSavingReminder}
                      >
                        {isSavingReminder ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        {text.saveReminder}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {!hasReminder && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarClock className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="font-medium text-foreground">{text.noReminder}</p>
                  <p className="text-sm text-muted-foreground max-w-[280px]">
                    {text.reminderDescription}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LeadNotesDialog;