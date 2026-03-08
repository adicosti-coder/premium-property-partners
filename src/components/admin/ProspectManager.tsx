import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, RefreshCw, ExternalLink, MapPin, Ruler, DoorOpen, Euro, Star, Phone, Eye, CheckCircle, X, MessageSquare, TrendingUp, Filter } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface ProspectListing {
  id: string;
  source_platform: string;
  source_url: string;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string;
  price_per_sqm: number | null;
  location: string | null;
  zone: string | null;
  size: number | null;
  rooms: number | null;
  floor: string | null;
  year_built: number | null;
  features: string[];
  images: string[];
  contact_phone: string | null;
  contact_name: string | null;
  score: number;
  score_breakdown: Record<string, number>;
  status: string;
  admin_notes: string | null;
  scraped_at: string;
  last_seen_at: string;
  is_active: boolean;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nou', color: 'bg-blue-500' },
  { value: 'reviewed', label: 'Revizuit', color: 'bg-yellow-500' },
  { value: 'contacted', label: 'Contactat', color: 'bg-green-500' },
  { value: 'rejected', label: 'Respins', color: 'bg-red-500' },
  { value: 'converted', label: 'Convertit', color: 'bg-purple-500' },
];

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 70) return 'default';
  if (score >= 50) return 'secondary';
  return 'destructive';
}

const ProspectManager = () => {
  const [listings, setListings] = useState<ProspectListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListing, setSelectedListing] = useState<ProspectListing | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, converted: 0, avgScore: 0 });

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('prospect_listings')
        .select('*')
        .order('score', { ascending: false })
        .order('scraped_at', { ascending: false });

      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      if (filterZone !== 'all') query = query.eq('zone', filterZone);

      const { data, error } = await query.limit(200);
      if (error) throw error;
      
      const typedData = (data || []) as unknown as ProspectListing[];
      setListings(typedData);

      // Compute stats
      const total = typedData.length;
      const newCount = typedData.filter(l => l.status === 'new').length;
      const contactedCount = typedData.filter(l => l.status === 'contacted').length;
      const convertedCount = typedData.filter(l => l.status === 'converted').length;
      const avgScore = total > 0 ? Math.round(typedData.reduce((s, l) => s + l.score, 0) / total) : 0;
      setStats({ total, new: newCount, contacted: contactedCount, converted: convertedCount, avgScore });
    } catch (err: any) {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterZone]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-prospects', {
        body: { max_results: 10 },
      });
      if (error) throw error;
      
      toast({
        title: "Scanare completă!",
        description: `${data?.new_listings || 0} anunțuri noi găsite.${data?.errors?.length ? ` ${data.errors.length} erori.` : ''}`,
      });
      fetchListings();
    } catch (err: any) {
      toast({ title: "Eroare scanare", description: err.message, variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('prospect_listings')
      .update({ status })
      .eq('id', id);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      if (selectedListing?.id === id) setSelectedListing(prev => prev ? { ...prev, status } : null);
      toast({ title: "Status actualizat" });
    }
  };

  const saveNotes = async () => {
    if (!selectedListing) return;
    const { error } = await supabase
      .from('prospect_listings')
      .update({ admin_notes: editNotes })
      .eq('id', selectedListing.id);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      setListings(prev => prev.map(l => l.id === selectedListing.id ? { ...l, admin_notes: editNotes } : l));
      setSelectedListing(prev => prev ? { ...prev, admin_notes: editNotes } : null);
      toast({ title: "Note salvate" });
    }
  };

  const filteredListings = listings.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (l.title?.toLowerCase().includes(q) || l.location?.toLowerCase().includes(q) || l.zone?.toLowerCase().includes(q));
  });

  const uniqueZones = [...new Set(listings.map(l => l.zone).filter(Boolean))] as string[];

  const renderStatCard = (label: string, value: string | number, icon: React.ReactNode, color: string) => (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderListingRow = (listing: ProspectListing) => {
    const statusOpt = STATUS_OPTIONS.find(s => s.value === listing.status);
    return (
      <div
        key={listing.id}
        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => { setSelectedListing(listing); setEditNotes(listing.admin_notes || ''); }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{listing.title || 'Fără titlu'}</h3>
              <Badge variant={getScoreBadgeVariant(listing.score)} className="shrink-0">
                <Star className="w-3 h-3 mr-1" />
                {listing.score}/100
              </Badge>
              <Badge variant="outline" className="shrink-0">{listing.source_platform}</Badge>
              {statusOpt && (
                <Badge className={`${statusOpt.color} text-white shrink-0`}>{statusOpt.label}</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              {listing.zone && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.zone}</span>
              )}
              {listing.price && (
                <span className="flex items-center gap-1"><Euro className="w-3 h-3" />{listing.price.toLocaleString()}€</span>
              )}
              {listing.size && (
                <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{listing.size} mp</span>
              )}
              {listing.rooms && (
                <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3" />{listing.rooms} cam</span>
              )}
              {listing.price_per_sqm && (
                <span className="flex items-center gap-1">€{listing.price_per_sqm}/mp</span>
              )}
              {listing.contact_phone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{listing.contact_phone}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" asChild>
              <a href={listing.source_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">🔍 Bot Prospectare Proprietăți</h2>
          <p className="text-muted-foreground">Scanare automată OLX + Imobiliare.ro pentru anunțuri cu potențial STR</p>
        </div>
        <Button onClick={handleScrape} disabled={isScraping}>
          {isScraping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          {isScraping ? 'Se scanează...' : 'Scanează acum'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {renderStatCard('Total anunțuri', stats.total, <TrendingUp className="w-4 h-4 text-white" />, 'bg-primary')}
        {renderStatCard('Noi', stats.new, <Eye className="w-4 h-4 text-white" />, 'bg-blue-500')}
        {renderStatCard('Contactate', stats.contacted, <MessageSquare className="w-4 h-4 text-white" />, 'bg-green-500')}
        {renderStatCard('Convertite', stats.converted, <CheckCircle className="w-4 h-4 text-white" />, 'bg-purple-500')}
        {renderStatCard('Scor mediu', stats.avgScore, <Star className="w-4 h-4 text-white" />, 'bg-yellow-500')}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Caută după titlu, locație, zonă..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]" aria-label="Filtrează după status">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterZone} onValueChange={setFilterZone}>
          <SelectTrigger className="w-[150px]" aria-label="Filtrează după zonă">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Zonă" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate zonele</SelectItem>
            {uniqueZones.sort().map(z => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchListings}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredListings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Niciun anunț găsit</h3>
            <p className="text-muted-foreground mb-4">Apasă „Scanează acum" pentru a căuta anunțuri noi</p>
            <Button onClick={handleScrape} disabled={isScraping}>Scanează acum</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredListings.map(renderListingRow)}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedListing} onOpenChange={open => { if (!open) setSelectedListing(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedListing.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Score breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Scor detaliat</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-3xl font-bold ${getScoreColor(selectedListing.score)}`}>
                        {selectedListing.score}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(selectedListing.score_breakdown || {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize text-muted-foreground">{key}</span>
                          <span className="font-medium">{val}pt</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedListing.price && <div><span className="text-muted-foreground">Preț:</span> <strong>{selectedListing.price.toLocaleString()}€</strong></div>}
                  {selectedListing.price_per_sqm && <div><span className="text-muted-foreground">Preț/mp:</span> <strong>€{selectedListing.price_per_sqm}</strong></div>}
                  {selectedListing.size && <div><span className="text-muted-foreground">Suprafață:</span> <strong>{selectedListing.size} mp</strong></div>}
                  {selectedListing.rooms && <div><span className="text-muted-foreground">Camere:</span> <strong>{selectedListing.rooms}</strong></div>}
                  {selectedListing.zone && <div><span className="text-muted-foreground">Zonă:</span> <strong>{selectedListing.zone}</strong></div>}
                  {selectedListing.floor && <div><span className="text-muted-foreground">Etaj:</span> <strong>{selectedListing.floor}</strong></div>}
                  {selectedListing.year_built && <div><span className="text-muted-foreground">An construcție:</span> <strong>{selectedListing.year_built}</strong></div>}
                  {selectedListing.contact_phone && <div><span className="text-muted-foreground">Telefon:</span> <strong>{selectedListing.contact_phone}</strong></div>}
                  {selectedListing.contact_name && <div><span className="text-muted-foreground">Contact:</span> <strong>{selectedListing.contact_name}</strong></div>}
                  <div><span className="text-muted-foreground">Platformă:</span> <strong>{selectedListing.source_platform}</strong></div>
                  <div><span className="text-muted-foreground">Scanat:</span> <strong>{format(new Date(selectedListing.scraped_at), 'dd MMM yyyy HH:mm', { locale: ro })}</strong></div>
                </div>

                {/* Features */}
                {selectedListing.features?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Dotări:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedListing.features.map((f, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                {selectedListing.images?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Imagini ({selectedListing.images.length}):</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedListing.images.slice(0, 6).map((img, i) => (
                        <img key={i} src={img} alt={`Imagine ${i + 1}`} className="rounded-lg w-full h-24 object-cover" loading="lazy" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedListing.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Descriere:</p>
                    <p className="text-sm line-clamp-6">{selectedListing.description}</p>
                  </div>
                )}

                {/* Status actions */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Schimbă status:</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map(s => (
                      <Button
                        key={s.value}
                        size="sm"
                        variant={selectedListing.status === s.value ? 'default' : 'outline'}
                        onClick={() => updateStatus(selectedListing.id, s.value)}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Admin notes */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Note interne:</p>
                  <Textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Adaugă note despre acest anunț..."
                    rows={3}
                  />
                  <Button size="sm" className="mt-2" onClick={saveNotes}>Salvează note</Button>
                </div>

                {/* Link to original */}
                <Button variant="outline" className="w-full" asChild>
                  <a href={selectedListing.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Deschide anunțul original
                  </a>
                </Button>

                {/* WhatsApp contact */}
                {selectedListing.contact_phone && (
                  <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
                    <a
                      href={`https://wa.me/${selectedListing.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent('Bună ziua! Am văzut anunțul dumneavoastră pe ' + selectedListing.source_platform + ' și suntem interesați de proprietatea din ' + (selectedListing.zone || 'Timișoara') + '. Suntem RealTrust, companie de management hotelier. Putem discuta?')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Contactează pe WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProspectManager;
