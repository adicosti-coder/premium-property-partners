import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, Search, RefreshCw, ExternalLink, MapPin, Ruler, DoorOpen,
  Euro, Star, Phone, Eye, CheckCircle, MessageSquare, TrendingUp,
  Filter, Copy, Calendar, UserCheck, XCircle, Handshake, LayoutList, Columns3,
  Tag, Zap, Clock, ThumbsUp, CalendarCheck, HelpCircle, X,
} from "lucide-react";
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
  tags: string[];
  prospect_type: string;
  scraped_at: string;
  last_seen_at: string;
  is_active: boolean;
}

const PROSPECT_TYPES = [
  { value: 'proprietar', label: '🏠 Proprietari', icon: '🏠' },
  { value: 'agentie', label: '🏢 Agenții', icon: '🏢' },
  { value: 'dezvoltator', label: '🏗️ Dezvoltatori', icon: '🏗️' },
] as const;

// ── Conversation Labels ──────────────────────────────
const CONVERSATION_LABELS = [
  { value: 'interesat', label: '🟢 Interesat', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300' },
  { value: 'de-urmarit', label: '🔵 De urmărit', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300' },
  { value: 'cald', label: '🔥 Cald', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300' },
  { value: 'rece', label: '❄️ Rece', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300 border-slate-300' },
  { value: 'nu-raspunde', label: '📵 Nu răspunde', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300' },
  { value: 'revine', label: '🔄 Revine el', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300' },
  { value: 'potential-mare', label: '⭐ Potențial mare', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300' },
  { value: 'urgent', label: '🚨 Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-400' },
];

// ── Quick Reply Templates by Category ────────────────────────────
const QUICK_REPLY_CATEGORIES = [
  {
    id: 'proprietari',
    label: '🏠 Proprietari',
    replies: [
      {
        id: 'prop-first-contact',
        label: '👋 Primul contact',
        icon: MessageSquare,
        getMessage: (l: ProspectListing) => {
          const zone = l.zone || 'Timișoara';
          return `Bună ziua! 👋\n\nAm văzut apartamentul dvs.${l.rooms ? ` cu ${l.rooms} camere` : ''} din ${zone} pe ${l.source_platform}.\n\nȘtiați că proprietarii din zona dvs. câștigă cu 40-60% mai mult decât dintr-o chirie normală? Noi ne ocupăm de tot — de la curățenie la oaspeți.\n\nDacă vă interesează o estimare gratuită, scrieți-mi „DA" și vă trimit calculul în 5 minute. Fără nicio obligație! 😊`;
        },
      },
      {
        id: 'prop-follow-up-1',
        label: '🔄 Follow-up #1',
        icon: Clock,
        getMessage: (l: ProspectListing) => {
          const zone = l.zone || 'Timișoara';
          return `Bună ziua! 😊\n\nV-am scris zilele trecute referitor la apartamentul din ${zone}. Înțeleg că sunteți ocupat(ă), dar voiam să vă spun că tocmai am finalizat o analiză pentru zona dvs.\n\nProprietarii de acolo câștigă în medie 1.200€/lună net din regim hotelier. Vă pot trimite estimarea personalizată — durează 2 minute.\n\nScrieți-mi „DA" dacă vă interesează! 🏠`;
        },
      },
      {
        id: 'prop-follow-up-2',
        label: '⏰ Follow-up #2 (ultim)',
        icon: Clock,
        getMessage: (l: ProspectListing) => {
          return `Bună ziua!\n\nÎncerc ultima oară — nu vreau să deranjez. 😊\n\nDacă v-ați gândit vreodată să câștigați mai mult din apartamentul dvs. fără bătăi de cap, noi facem asta pentru proprietari din ${l.zone || 'Timișoara'} de peste 2 ani.\n\nDacă nu e momentul potrivit, nicio problemă! Vă urez o zi frumoasă! 🙏`;
        },
      },
      {
        id: 'prop-meeting',
        label: '📅 Propunere întâlnire',
        icon: CalendarCheck,
        getMessage: () => {
          return `Super, mă bucur că sunteți interesat(ă)! 🎉\n\nCel mai bine ar fi să ne vedem 15-20 minute la apartament — vă explic exact cum funcționează și fac câteva poze pentru estimarea finală.\n\nCând v-ar conveni? Sunt flexibil:\n• Luni-Vineri: 10:00-18:00\n• Sâmbătă: 10:00-14:00\n\nSpuneți-mi o zi și o oră și confirm imediat! 📅`;
        },
      },
      {
        id: 'prop-after-meeting',
        label: '✅ După întâlnire',
        icon: ThumbsUp,
        getMessage: () => {
          return `Bună ziua! 😊\n\nMultumesc pentru întâlnirea de azi! A fost o plăcere să văd apartamentul — arată foarte bine și are potențial excelent.\n\nConform estimării noastre, venitul net lunar ar fi între 800€ și 1.400€, în funcție de sezon.\n\nVă trimit contractul și toate detaliile pe email. Dacă aveți întrebări, sunt la dispoziție! 🙏`;
        },
      },
      {
        id: 'prop-objection',
        label: '🤔 Răspuns obiecții',
        icon: HelpCircle,
        getMessage: () => {
          return `Înțeleg perfect îngrijorarea! 😊\n\nCâteva lucruri care v-ar putea liniști:\n\n✅ Contractul e pe minim 1 an, cu ieșire în 30 zile\n✅ Garantăm chiria minimă lunară\n✅ Noi plătim toate utilitățile și reparațiile\n✅ Apartamentul e asigurat integral\n✅ Primiți raport lunar detaliat cu venituri + cheltuieli\n\nCe ziceți, programăm o discuție de 15 min să clarificăm totul? 🤝`;
        },
      },
    ],
  },
  {
    id: 'agentii',
    label: '🏢 Agenții',
    replies: [
      {
        id: 'agent-intro',
        label: '👋 Prezentare parteneriat',
        icon: MessageSquare,
        getMessage: (l: ProspectListing) => {
          return `Bună ziua! 👋\n\nSunt de la RealTrust ApartHotel și am văzut anunțul dvs. din ${l.zone || 'Timișoara'} pe ${l.source_platform}.\n\nLucrăm cu agenții imobiliare pentru a oferi proprietarilor o alternativă la chiria clasică: regim hotelier administrat complet de noi.\n\n📈 Proprietarii câștigă 40-60% mai mult\n🤝 Agenția primește comision de referral\n🔄 Parteneriat pe termen lung\n\nV-ar interesa o discuție de 10 minute despre cum putem colabora? 😊`;
        },
      },
      {
        id: 'agent-follow-up',
        label: '🔄 Follow-up agenție',
        icon: Clock,
        getMessage: (l: ProspectListing) => {
          return `Bună ziua! 😊\n\nV-am contactat recent cu o propunere de parteneriat pentru administrare în regim hotelier.\n\nÎn ultimele 3 luni, am convertit peste 15 proprietăți din ${l.zone || 'Timișoara'} cu agenții partenere. Comisionul de referral e 5% din venitul lunar, pe toată durata contractului.\n\nAveți 5 minute pentru o discuție telefonică? Pot suna oricând între 9-18. 📞`;
        },
      },
      {
        id: 'agent-proposal',
        label: '📋 Propunere formală',
        icon: CalendarCheck,
        getMessage: () => {
          return `Bună ziua! 🎉\n\nMă bucur de interes! Iată ce oferim în parteneriat:\n\n📌 Model de colaborare:\n• Comision referral: 5% din venitul net lunar\n• Plată lunară, pe toată durata contractului\n• Fără costuri pentru agenție\n\n📌 Ce facem noi:\n• Administrare completă (oaspeți, curățenie, mentenanță)\n• Raportare transparentă proprietar + agenție\n• Garanție chirie minimă\n\nVă pot trimite contractul cadru pe email? Care e adresa? 📧`;
        },
      },
    ],
  },
  {
    id: 'dezvoltatori',
    label: '🏗️ Dezvoltatori',
    replies: [
      {
        id: 'dev-intro',
        label: '👋 Prim contact dezvoltator',
        icon: MessageSquare,
        getMessage: (l: ProspectListing) => {
          return `Bună ziua! 👋\n\nSunt de la RealTrust ApartHotel — administrăm apartamente în regim hotelier în Timișoara.\n\nAm văzut proiectul dvs. din ${l.zone || 'Timișoara'} și cred că apartamentele ar avea un randament excelent în regim hotelier.\n\n🏠 Putem prelua blocuri întregi sau apartamente individuale\n📈 ROI 8-12% anual pentru investitori\n🤝 Parteneriat exclusiv pe complex\n\nAți fi deschis(ă) la o întâlnire de 30 min pentru a discuta posibilitățile? 🏗️`;
        },
      },
      {
        id: 'dev-follow-up',
        label: '🔄 Follow-up dezvoltator',
        icon: Clock,
        getMessage: (l: ProspectListing) => {
          return `Bună ziua! 😊\n\nRevenim cu propunerea pentru complexul din ${l.zone || 'Timișoara'}.\n\nAm pregătit o analiză de randament pentru apartamentele tip studio și 2 camere. Rezultatele arată:\n\n📊 Studio: 900-1.300€/lună net\n📊 2 camere: 1.200-1.800€/lună net\n📊 ROI: 9-12% anual\n\nPutem organiza o prezentare la sediul dvs.? Durează max 30 minute. 📅`;
        },
      },
      {
        id: 'dev-bulk',
        label: '📦 Ofertă bloc / complex',
        icon: CalendarCheck,
        getMessage: (l: ProspectListing) => {
          return `Bună ziua! 🎉\n\nPentru complexuri noi, oferim pachet special:\n\n🏢 Pachet Dezvoltator:\n• Preluăm minim 10 unități\n• Comision de administrare redus cu 15%\n• Design & staging inclus\n• Mobilare la preț de furnizor (acces la rețeaua noastră)\n• Marketing dedicat pe Booking, Airbnb + direct\n\n📈 Avantaje pentru cumpărători:\n• Randament garantat din ziua 1\n• Zero bătăi de cap — administrare completă\n• Raportare lunară transparentă\n\nCând ne-am putea vedea pentru o prezentare detaliată? 🤝`;
        },
      },
    ],
  },
];

// Flatten for backward compat
const QUICK_REPLIES = QUICK_REPLY_CATEGORIES.flatMap(cat => cat.replies);


const PIPELINE_STAGES = [
  { value: 'new', label: '🆕 Nou', emoji: '🆕', color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' },
  { value: 'reviewed', label: '👁️ Revizuit', emoji: '👁️', color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30' },
  { value: 'contacted', label: '📱 Contactat', emoji: '📱', color: 'border-orange-400 bg-orange-50 dark:bg-orange-950/30' },
  { value: 'interested', label: '🤝 Interesat', emoji: '🤝', color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' },
  { value: 'meeting', label: '📅 Programat', emoji: '📅', color: 'border-violet-400 bg-violet-50 dark:bg-violet-950/30' },
  { value: 'converted', label: '✅ Client', emoji: '✅', color: 'border-green-500 bg-green-50 dark:bg-green-950/30' },
  { value: 'rejected', label: '❌ Respins', emoji: '❌', color: 'border-red-400 bg-red-50 dark:bg-red-950/30' },
];

/** Generate a warm, simple, curiosity-driven WhatsApp message */
function generateOutreachMessage(listing: ProspectListing): string {
  const zone = listing.zone || 'Timișoara';
  const platform = listing.source_platform;
  const rooms = listing.rooms;
  
  // Different message variants for A/B testing — pick based on listing id hash
  const variant = listing.id.charCodeAt(0) % 3;

  if (variant === 0) {
    return `Bună ziua! 👋\n\nAm văzut apartamentul dvs.${rooms ? ` cu ${rooms} camere` : ''} din ${zone} pe ${platform}.\n\nȘtiați că proprietarii din zona dvs. câștigă cu 40-60% mai mult decât dintr-o chirie normală? Noi ne ocupăm de tot — de la curățenie la oaspeți.\n\nDacă vă interesează o estimare gratuită, scrieți-mi „DA" și vă trimit calculul în 5 minute. Fără nicio obligație! 😊`;
  } else if (variant === 1) {
    return `Bună ziua! 👋\n\nV-am găsit apartamentul din ${zone} pe ${platform} și m-am gândit că v-ar interesa asta:\n\nProprietarii cu care lucrăm câștigă între 800€ și 2.000€/lună doar din închiriere pe termen scurt, fără să se ocupe de nimic.\n\nVreți să vă arăt cât ar putea produce apartamentul dvs.? Răspundeți cu „VREAU" și vă trimit o estimare personalizată. E gratis! 🏠`;
  } else {
    return `Bună ziua! 👋\n\nAm o întrebare rapidă: ați luat în calcul vreodată să vă închiriați apartamentul din ${zone} pe nopți, ca un hotel?\n\nMulti proprietari din ${zone} câștigă dublu față de o chirie clasică, iar noi ne ocupăm de absolut tot (oaspeți, curățenie, administrare).\n\nScrieți-mi „CURIOS" și vă fac o estimare gratuită în 5 minute! 😊`;
  }
}

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
  const [allListings, setAllListings] = useState<ProspectListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListing, setSelectedListing] = useState<ProspectListing | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline');
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, interested: 0, converted: 0, avgScore: 0 });
  const [activeQuickReply, setActiveQuickReply] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospect_listings')
        .select('*')
        .order('score', { ascending: false })
        .order('scraped_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      const typedData = (data || []) as unknown as ProspectListing[];
      setAllListings(typedData);

      // Compute stats from all data
      const total = typedData.length;
      const newCount = typedData.filter(l => l.status === 'new').length;
      const contactedCount = typedData.filter(l => l.status === 'contacted').length;
      const interestedCount = typedData.filter(l => l.status === 'interested' || l.status === 'meeting').length;
      const convertedCount = typedData.filter(l => l.status === 'converted').length;
      const avgScore = total > 0 ? Math.round(typedData.reduce((s, l) => s + l.score, 0) / total) : 0;
      setStats({ total, new: newCount, contacted: contactedCount, interested: interestedCount, converted: convertedCount, avgScore });
    } catch (err: any) {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Apply filters
  useEffect(() => {
    let filtered = allListings;
    if (filterType !== 'all') filtered = filtered.filter(l => l.prospect_type === filterType);
    if (filterStatus !== 'all') filtered = filtered.filter(l => l.status === filterStatus);
    if (filterZone !== 'all') filtered = filtered.filter(l => l.zone === filterZone);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.title?.toLowerCase().includes(q) || l.location?.toLowerCase().includes(q) || l.zone?.toLowerCase().includes(q)
      );
    }
    setListings(filtered);
  }, [allListings, filterStatus, filterZone, searchQuery, filterType]);

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
      setAllListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
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
      setAllListings(prev => prev.map(l => l.id === selectedListing.id ? { ...l, admin_notes: editNotes } : l));
      setSelectedListing(prev => prev ? { ...prev, admin_notes: editNotes } : null);
      toast({ title: "Note salvate" });
    }
  };

  const copyMessage = (listing: ProspectListing, message?: string) => {
    const msg = message || generateOutreachMessage(listing);
    navigator.clipboard.writeText(msg);
    toast({ title: "Mesaj copiat!", description: "Lipește-l în WhatsApp" });
  };

  const toggleTag = async (id: string, tag: string) => {
    const listing = allListings.find(l => l.id === id);
    if (!listing) return;
    const currentTags = listing.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    const { error } = await supabase
      .from('prospect_listings')
      .update({ tags: newTags } as any)
      .eq('id', id);
    
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      setAllListings(prev => prev.map(l => l.id === id ? { ...l, tags: newTags } : l));
      if (selectedListing?.id === id) setSelectedListing(prev => prev ? { ...prev, tags: newTags } : null);
    }
  };


  const uniqueZones = [...new Set(allListings.map(l => l.zone).filter(Boolean))] as string[];

  // ── Render helpers ──────────────────────────────────

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

  const renderCompactCard = (listing: ProspectListing) => (
    <div
      key={listing.id}
      className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer bg-card"
      onClick={() => { setSelectedListing(listing); setEditNotes(listing.admin_notes || ''); }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2">{listing.title || 'Fără titlu'}</h4>
          {listing.prospect_type !== 'proprietar' && (
            <span className="text-[10px] text-muted-foreground">
              {PROSPECT_TYPES.find(p => p.value === listing.prospect_type)?.icon} {PROSPECT_TYPES.find(p => p.value === listing.prospect_type)?.label.replace(/^[^\s]+ /, '')}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={getScoreBadgeVariant(listing.score)} className="shrink-0 text-xs">
            {listing.score}
          </Badge>
          <a
            href={listing.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors bg-muted/50 px-1.5 py-0.5 rounded"
            title="Deschide anunțul"
          >
            <ExternalLink className="w-3 h-3" /> Link
          </a>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
        {listing.zone && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{listing.zone}</span>}
        {listing.price && <span>{listing.price.toLocaleString()}€</span>}
        {listing.rooms && <span>{listing.rooms}cam</span>}
        {listing.size && <span>{listing.size}mp</span>}
      </div>
      {listing.contact_phone && (
        <div className="flex items-center gap-1 mt-2">
          <Phone className="w-3 h-3 text-green-600" />
          <span className="text-xs text-green-600 font-medium">{listing.contact_phone}</span>
        </div>
      )}
      {(listing.tags?.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {listing.tags.map(tag => {
            const label = CONVERSATION_LABELS.find(l => l.value === tag);
            return label ? (
              <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${label.color}`}>
                {label.label}
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );

  const renderListRow = (listing: ProspectListing) => {
    const stage = PIPELINE_STAGES.find(s => s.value === listing.status);
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
                <Star className="w-3 h-3 mr-1" />{listing.score}/100
              </Badge>
              <Badge variant="outline" className="shrink-0">{listing.source_platform}</Badge>
              {stage && <Badge variant="secondary" className="shrink-0">{stage.emoji} {stage.label.replace(stage.emoji + ' ', '')}</Badge>}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              {listing.zone && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.zone}</span>}
              {listing.price && <span className="flex items-center gap-1"><Euro className="w-3 h-3" />{listing.price.toLocaleString()}€</span>}
              {listing.size && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{listing.size}mp</span>}
              {listing.rooms && <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3" />{listing.rooms}cam</span>}
              {listing.price_per_sqm && <span>€{listing.price_per_sqm}/mp</span>}
              {listing.contact_phone && <span className="flex items-center gap-1 text-green-600"><Phone className="w-3 h-3" />{listing.contact_phone}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {listing.contact_phone && (
              <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); copyMessage(listing); }} title="Copiază mesaj WhatsApp">
                <Copy className="w-4 h-4" />
              </Button>
            )}
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

  // ── Pipeline Kanban View ────────────────────────────

  const renderPipelineView = () => {
    const activeStages = PIPELINE_STAGES.filter(stage => {
      // Always show core stages, hide empty non-essential ones
      if (['new', 'contacted', 'interested', 'converted'].includes(stage.value)) return true;
      return allListings.some(l => l.status === stage.value);
    });

    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {activeStages.map(stage => {
          const stageListings = (filterType === 'all' ? allListings : allListings.filter(l => l.prospect_type === filterType))
            .filter(l => l.status === stage.value)
            .sort((a, b) => b.score - a.score);

          return (
            <div key={stage.value} className={`min-w-[260px] max-w-[300px] flex-shrink-0 border-t-4 rounded-lg ${stage.color}`}>
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
                  <Badge variant="secondary" className="text-xs">{stageListings.length}</Badge>
                </div>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="p-2 space-y-2">
                  {stageListings.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Gol</p>
                  ) : (
                    stageListings.map(renderCompactCard)
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Main Render ─────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">🔍 Bot Prospectare Proprietăți</h2>
          <p className="text-muted-foreground">Scanare automată + pipeline de contactare proprietari</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              size="sm"
              variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
              onClick={() => setViewMode('pipeline')}
              className="rounded-none"
            >
              <Columns3 className="w-4 h-4 mr-1" /> Pipeline
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <LayoutList className="w-4 h-4 mr-1" /> Listă
            </Button>
          </div>
          <Button onClick={handleScrape} disabled={isScraping}>
            {isScraping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {isScraping ? 'Se scanează...' : 'Scanează acum'}
          </Button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filterType === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterType('all')}
        >
          📋 Toate ({allListings.length})
        </Button>
        {PROSPECT_TYPES.map(pt => {
          const count = allListings.filter(l => l.prospect_type === pt.value).length;
          return (
            <Button
              key={pt.value}
              size="sm"
              variant={filterType === pt.value ? 'default' : 'outline'}
              onClick={() => setFilterType(pt.value)}
            >
              {pt.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {renderStatCard('Total', stats.total, <TrendingUp className="w-4 h-4 text-white" />, 'bg-primary')}
        {renderStatCard('Noi', stats.new, <Eye className="w-4 h-4 text-white" />, 'bg-blue-500')}
        {renderStatCard('Contactați', stats.contacted, <MessageSquare className="w-4 h-4 text-white" />, 'bg-orange-500')}
        {renderStatCard('Interesați', stats.interested, <Handshake className="w-4 h-4 text-white" />, 'bg-emerald-500')}
        {renderStatCard('Clienți', stats.converted, <CheckCircle className="w-4 h-4 text-white" />, 'bg-green-600')}
        {renderStatCard('Scor mediu', stats.avgScore, <Star className="w-4 h-4 text-white" />, 'bg-yellow-500')}
      </div>

      {/* Filters (for list view) */}
      {viewMode === 'list' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Caută după titlu, locație, zonă..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]" aria-label="Filtrează după status">
              <Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              {PIPELINE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterZone} onValueChange={setFilterZone}>
            <SelectTrigger className="w-[150px]" aria-label="Filtrează după zonă">
              <MapPin className="w-4 h-4 mr-2" /><SelectValue placeholder="Zonă" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate zonele</SelectItem>
              {uniqueZones.sort().map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchListings}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : allListings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Niciun anunț încă</h3>
            <p className="text-muted-foreground mb-4">Apasă „Scanează acum" pentru a porni botul</p>
            <Button onClick={handleScrape} disabled={isScraping}>Scanează acum</Button>
          </CardContent>
        </Card>
      ) : viewMode === 'pipeline' ? (
        renderPipelineView()
      ) : (
        <div className="space-y-3">
          {listings.map(renderListRow)}
          {listings.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Niciun rezultat cu filtrele selectate</p>
          )}
        </div>
      )}

      {/* ── Detail Dialog ────────────────────────────── */}
      <Dialog open={!!selectedListing} onOpenChange={open => { if (!open) setSelectedListing(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl pr-8">{selectedListing.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Prospect type selector */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Categorie prospect</p>
                  <div className="flex gap-2">
                    {PROSPECT_TYPES.map(pt => (
                      <Button
                        key={pt.value}
                        size="sm"
                        variant={selectedListing.prospect_type === pt.value ? 'default' : 'outline'}
                        onClick={async () => {
                          const { error } = await supabase
                            .from('prospect_listings')
                            .update({ prospect_type: pt.value } as any)
                            .eq('id', selectedListing.id);
                          if (error) {
                            toast({ title: "Eroare", description: error.message, variant: "destructive" });
                          } else {
                            setAllListings(prev => prev.map(l => l.id === selectedListing.id ? { ...l, prospect_type: pt.value } : l));
                            setSelectedListing(prev => prev ? { ...prev, prospect_type: pt.value } : null);
                            toast({ title: `Categorie: ${pt.label}` });
                          }
                        }}
                        className="text-xs"
                      >
                        {pt.icon} {pt.label.replace(pt.icon + ' ', '')}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Score breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Scor potențial</CardTitle>
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

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedListing.price && <div><span className="text-muted-foreground">Preț:</span> <strong>{selectedListing.price.toLocaleString()}€</strong></div>}
                  {selectedListing.price_per_sqm && <div><span className="text-muted-foreground">Preț/mp:</span> <strong>€{selectedListing.price_per_sqm}</strong></div>}
                  {selectedListing.size && <div><span className="text-muted-foreground">Suprafață:</span> <strong>{selectedListing.size} mp</strong></div>}
                  {selectedListing.rooms && <div><span className="text-muted-foreground">Camere:</span> <strong>{selectedListing.rooms}</strong></div>}
                  {selectedListing.zone && <div><span className="text-muted-foreground">Zonă:</span> <strong>{selectedListing.zone}</strong></div>}
                  {selectedListing.floor && <div><span className="text-muted-foreground">Etaj:</span> <strong>{selectedListing.floor}</strong></div>}
                  {selectedListing.year_built && <div><span className="text-muted-foreground">An:</span> <strong>{selectedListing.year_built}</strong></div>}
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

                {/* ── Quick Replies ──────────────────────── */}
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      Mesaje rapide (Quick Replies)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Category tabs */}
                    <div className="space-y-3">
                      {QUICK_REPLY_CATEGORIES.map(cat => (
                        <div key={cat.id}>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">{cat.label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.replies.map(qr => {
                              const Icon = qr.icon;
                              return (
                                <Button
                                  key={qr.id}
                                  size="sm"
                                  variant={activeQuickReply === qr.id ? 'default' : 'outline'}
                                  onClick={() => setActiveQuickReply(activeQuickReply === qr.id ? null : qr.id)}
                                  className="text-xs h-7"
                                >
                                  <Icon className="w-3 h-3 mr-1" /> {qr.label}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Selected message preview */}
                    {(() => {
                      const qr = QUICK_REPLIES.find(q => q.id === activeQuickReply);
                      const msg = qr ? qr.getMessage(selectedListing) : generateOutreachMessage(selectedListing);
                      return (
                        <>
                          <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-line max-h-48 overflow-y-auto">
                            {msg}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => copyMessage(selectedListing, msg)}>
                              <Copy className="w-4 h-4 mr-2" /> Copiază mesajul
                            </Button>
                            {selectedListing.contact_phone && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" asChild>
                                <a
                                  href={`https://wa.me/${selectedListing.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Phone className="w-4 h-4 mr-2" /> Trimite pe WhatsApp
                                </a>
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                    {!selectedListing.contact_phone && (
                      <p className="text-xs text-muted-foreground">⚠️ Fără telefon extras — copiază mesajul și trimite-l manual din anunțul original.</p>
                    )}
                  </CardContent>
                </Card>

                {/* ── Conversation Labels ──────────────────── */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      Etichete conversație
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {CONVERSATION_LABELS.map(label => {
                        const isActive = (selectedListing.tags || []).includes(label.value);
                        return (
                          <button
                            key={label.value}
                            onClick={() => toggleTag(selectedListing.id, label.value)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                              isActive
                                ? `${label.color} font-semibold ring-2 ring-offset-1 ring-primary/30`
                                : 'border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {label.label}
                            {isActive && <X className="w-3 h-3 ml-1 inline" />}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Pipeline status */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Pipeline status:</p>
                  <div className="flex flex-wrap gap-2">
                    {PIPELINE_STAGES.map(s => (
                      <Button
                        key={s.value}
                        size="sm"
                        variant={selectedListing.status === s.value ? 'default' : 'outline'}
                        onClick={() => updateStatus(selectedListing.id, s.value)}
                      >
                        {s.emoji} {s.label.replace(s.emoji + ' ', '')}
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
                    placeholder="Ex: proprietarul pare interesat, sună luni..."
                    rows={3}
                  />
                  <Button size="sm" className="mt-2" onClick={saveNotes}>Salvează note</Button>
                </div>

                {/* Link to original */}
                <Button variant="outline" className="w-full" asChild>
                  <a href={selectedListing.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> Deschide anunțul original
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProspectManager;
