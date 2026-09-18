import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, PlusCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ZONES = [
  "Aradului", "Girocului", "Complex Studențesc", "Iosefin", "Cetate / Centru",
  "Fabric", "Dumbrăvița", "Circumvalațiunii", "Calea Lipovei", "Șagului",
];

const PLATFORMS = [
  "OLX", "Storia.ro", "imobiliare.ro", "Publi24", "BursaImobiliara.ro",
  "Facebook Groups", "Facebook Marketplace", "Recomandare", "Altă sursă",
];

interface Props {
  onImported?: () => void;
}

export default function ProspectManualImport({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [url, setUrl] = useState("");
  const [zone, setZone] = useState(ZONES[0]);
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [rooms, setRooms] = useState("");

  const reset = () => {
    setTitle(""); setPrice(""); setPhone(""); setUrl(""); setRooms("");
  };

  const save = async () => {
    const cleanUrl = url.trim();
    const cleanPhone = phone.trim();
    if (!cleanUrl && !cleanPhone) {
      toast({ title: "Date incomplete", description: "Adaugă linkul anunțului sau telefonul.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const priceNumber = Number(price.replace(/[^\d.]/g, ""));
      const { error } = await supabase.from("prospect_listings").insert({
        title: title.trim() || `Anunț ${zone} (import manual)`,
        source_platform: platform,
        source_url: cleanUrl || `manual:${Date.now()}`,
        price: Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : null,
        contact_phone: cleanPhone || null,
        zone,
        rooms: rooms ? Number(rooms) : null,
        prospect_type: "proprietar",
        status: "new",
      });
      if (error) throw error;
      toast({ title: "Anunț adăugat", description: `${platform} · ${zone}` });
      reset();
      setOpen(false);
      onImported?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        title: "Eroare la adăugare",
        description: /duplicate|unique/i.test(msg) ? "Anunțul există deja în listă." : msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0">
          <PlusCircle className="h-4 w-4 mr-2" />
          Import manual
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adaugă manual un anunț</DialogTitle>
          <DialogDescription>
            Anunțul apare imediat în „Anunțuri noi găsite” și intră în istoricul de prețuri.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Titlu (opțional)" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titlu anunț" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Preț (€)" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" aria-label="Preț" />
            <Input placeholder="Camere" value={rooms} onChange={(e) => setRooms(e.target.value)} inputMode="numeric" aria-label="Număr camere" />
          </div>
          <Input placeholder="Telefon proprietar" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" aria-label="Telefon" />
          <Input placeholder="Link către anunț" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Link anunț" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger aria-label="Zonă"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger aria-label="Platformă"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={save} disabled={saving} className="w-full min-h-[44px]">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
            Adaugă în Anunțuri noi găsite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
