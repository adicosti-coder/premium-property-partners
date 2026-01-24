import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UtensilsCrossed, 
  Coffee, 
  Landmark, 
  ShoppingBag, 
  TreePine,
  Camera,
  Music,
  Heart,
  Bus,
  Clapperboard,
  MapPin,
  Star,
  Clock,
  ExternalLink,
  Sparkles,
  Loader2,
  Search,
  X,
  Filter,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  HeartOff,
  Download,
  Share2,
  Check,
  Copy,
  Crown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePoiFavorites } from '@/hooks/usePoiFavorites';
import { exportPoiFavoritesPdf, createShareableLink, parseSharedPois, notifyPoiImport } from '@/utils/exportPoiFavoritesPdf';
import { toast } from 'sonner';
import SharedLinksStats from './SharedLinksStats';
import PremiumBenefitsBadge from './PremiumBenefitsBadge';
import OptimizedImage from './OptimizedImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link as RouterLink } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';

interface POI {
  id: string;
  name: string;
  name_en: string;
  category: string;
  description: string | null;
  description_en: string | null;
  address: string | null;
  rating: number | null;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
}

const CityGuideSection: React.FC = () => {
  const { language } = useLanguage();
  const animation = useScrollAnimation({ threshold: 0.1 });
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'rating'>('default');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showSharedPois, setShowSharedPois] = useState(false);
  const [sharedPoiIds, setSharedPoiIds] = useState<string[] | null>(null);
  const [currentShareCode, setCurrentShareCode] = useState<string | null>(null);
  const [sharedLinkInfo, setSharedLinkInfo] = useState<{ name: string | null; description: string | null } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const { favorites, isFavorite, toggleFavorite, importFavorites, isImporting, favoritesCount, isAuthenticated, userId } = usePoiFavorites();

  // Check for shared POIs in URL and fetch link details
  useEffect(() => {
    const checkSharedPois = async () => {
      const { poiIds, shareCode } = await parseSharedPois(searchParams);
      if (poiIds && poiIds.length > 0) {
        setSharedPoiIds(poiIds);
        setCurrentShareCode(shareCode);
        setShowSharedPois(true);
        
        // Fetch shared link details if we have a share code
        if (shareCode) {
          const { data } = await supabase
            .from('shared_poi_links')
            .select('name, description')
            .eq('share_code', shareCode)
            .single();
          
          if (data) {
            setSharedLinkInfo({ name: data.name, description: data.description });
          }
        }
      }
    };
    checkSharedPois();
  }, [searchParams]);

  // Fetch ALL POIs from Supabase (removed limit for filtering)
  const { data: pois = [], isLoading } = useQuery({
    queryKey: ['city-guide-pois'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_of_interest')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as POI[];
    },
  });

  // Fetch local tips from Supabase
  interface LocalTip {
    id: string;
    tip_ro: string;
    tip_en: string;
    display_order: number;
    is_active: boolean;
  }

  const { data: localTipsData = [] } = useQuery({
    queryKey: ['local-tips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('local_tips')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as LocalTip[];
    },
  });

  const content = {
    ro: {
      badge: 'Ghid Local',
      title: 'Descoperă',
      titleHighlight: 'Timișoara',
      subtitle: 'Recomandările noastre pentru o experiență autentică în "Mica Vienă"',
      categories: {
        all: 'Toate',
        restaurant: 'Restaurante',
        cafe: 'Cafenele',
        attraction: 'Atracții',
        shopping: 'Cumpărături',
        nature: 'Natură',
        nightlife: 'Viață de Noapte',
        transport: 'Transport',
        health: 'Sănătate',
        entertainment: 'Divertisment',
      },
      seeOnMap: 'Vezi pe Hartă',
      localTip: 'Sfat Local',
      noResults: 'Nu există recomandări pentru această căutare',
      noResultsHint: 'Încearcă să cauți altceva sau selectează altă categorie',
      loading: 'Se încarcă recomandările...',
      searchPlaceholder: 'Caută locații...',
      clearFilters: 'Șterge filtrele',
      resultsCount: 'locații găsite',
      sortBy: 'Sortează după',
      sortDefault: 'Ordine implicită',
      sortName: 'Nume',
      sortRating: 'Rating',
      favorites: 'Favorite',
      showFavorites: 'Arată doar favorite',
      noFavorites: 'Nu ai locații favorite încă',
      noFavoritesHint: 'Apasă pe inimă pentru a salva locațiile preferate',
      exportPdf: 'Exportă PDF',
      shareLink: 'Copiază link',
      linkCopied: 'Link copiat!',
      sharedTitle: 'Locații partajate',
      sharedSubtitle: 'Explorează locațiile recomandate de un prieten',
      viewAll: 'Vezi toate locațiile',
      importToFavorites: 'Importă în favorite',
      importing: 'Se importă...',
      alreadyImported: 'Deja în favorite',
      loginToImport: 'Autentifică-te pentru a importa',
      loginBannerTitle: 'Creează un cont pentru a salva locațiile',
      loginBannerSubtitle: 'Autentifică-te pentru a importa aceste locații în favoritele tale și a le accesa oricând.',
      loginButton: 'Autentificare',
      signupButton: 'Creează cont',
      pdfTitle: 'Ghid Local - Locații Favorite',
      pdfCategory: 'Categorie',
      pdfAddress: 'Adresă',
      pdfRating: 'Rating',
      pdfGeneratedOn: 'Generat la',
      pdfNoDescription: 'Fără descriere',
    },
    en: {
      badge: 'Local Guide',
      title: 'Discover',
      titleHighlight: 'Timișoara',
      subtitle: 'Our recommendations for an authentic experience in "Little Vienna"',
      categories: {
        all: 'All',
        restaurant: 'Restaurants',
        cafe: 'Cafés',
        attraction: 'Attractions',
        shopping: 'Shopping',
        nature: 'Nature',
        nightlife: 'Nightlife',
        transport: 'Transport',
        health: 'Health',
        entertainment: 'Entertainment',
      },
      seeOnMap: 'See on Map',
      localTip: 'Local Tip',
      noResults: 'No locations found for this search',
      noResultsHint: 'Try searching for something else or select another category',
      loading: 'Loading recommendations...',
      searchPlaceholder: 'Search locations...',
      clearFilters: 'Clear filters',
      resultsCount: 'locations found',
      sortBy: 'Sort by',
      sortDefault: 'Default order',
      sortName: 'Name',
      sortRating: 'Rating',
      favorites: 'Favorites',
      showFavorites: 'Show favorites only',
      noFavorites: 'No favorite locations yet',
      noFavoritesHint: 'Tap the heart icon to save your favorite places',
      exportPdf: 'Export PDF',
      shareLink: 'Copy link',
      linkCopied: 'Link copied!',
      sharedTitle: 'Shared Locations',
      sharedSubtitle: 'Explore locations recommended by a friend',
      viewAll: 'View all locations',
      importToFavorites: 'Import to favorites',
      importing: 'Importing...',
      alreadyImported: 'Already in favorites',
      loginToImport: 'Login to import',
      loginBannerTitle: 'Create an account to save locations',
      loginBannerSubtitle: 'Sign in to import these locations to your favorites and access them anytime.',
      loginButton: 'Sign in',
      signupButton: 'Create account',
      pdfTitle: 'City Guide - Favorite Locations',
      pdfCategory: 'Category',
      pdfAddress: 'Address',
      pdfRating: 'Rating',
      pdfGeneratedOn: 'Generated on',
      pdfNoDescription: 'No description',
    }
  };

  const t = content[language as keyof typeof content] || content.ro;

  const categoryIcons: Record<string, React.ElementType> = {
    restaurant: UtensilsCrossed,
    cafe: Coffee,
    attraction: Landmark,
    shopping: ShoppingBag,
    nature: TreePine,
    nightlife: Music,
    transport: Bus,
    health: Heart,
    entertainment: Clapperboard,
  };

  const categoryColors: Record<string, string> = {
    restaurant: 'from-rose-500/20 to-rose-500/5 border-rose-500/30',
    cafe: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    attraction: 'from-violet-500/20 to-violet-500/5 border-violet-500/30',
    shopping: 'from-pink-500/20 to-pink-500/5 border-pink-500/30',
    nature: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    nightlife: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30',
    transport: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    health: 'from-red-500/20 to-red-500/5 border-red-500/30',
    entertainment: 'from-teal-500/20 to-teal-500/5 border-teal-500/30',
  };

  const categoryIconColors: Record<string, string> = {
    restaurant: 'text-rose-500',
    cafe: 'text-amber-500',
    attraction: 'text-violet-500',
    shopping: 'text-pink-500',
    nature: 'text-emerald-500',
    nightlife: 'text-indigo-500',
    transport: 'text-blue-500',
    health: 'text-red-500',
    entertainment: 'text-teal-500',
  };

  // Use fetched tips or fallback to hardcoded
  const localTips = localTipsData.length > 0
    ? localTipsData.map(tip => language === 'ro' ? tip.tip_ro : tip.tip_en)
    : (language === 'ro' ? [
        'Vizitează Piața Victoriei seara pentru cele mai frumoase lumini',
        'Încearcă plăcinta bănățeană la Covrigăria Sârbească',
        'Plimbă-te pe malul Begăi la apus pentru priveliști superbe',
        'Rezervă la restaurante în weekend - sunt foarte căutate',
      ] : [
        'Visit Victory Square at night for the most beautiful lights',
        'Try the Banat pie at Covrigăria Sârbească',
        'Walk along the Bega River at sunset for stunning views',
        'Book restaurants on weekends - they\'re very popular',
      ]);

  const getCategoryLabel = (category: string) => {
    const categories = t.categories as Record<string, string>;
    return categories[category] || category;
  };

  // Get unique categories from POIs
  const availableCategories = useMemo(() => {
    const cats = [...new Set(pois.map(poi => poi.category))];
    return cats.sort();
  }, [pois]);

  // Filter and sort POIs based on search, category, favorites, shared, and sort option
  const filteredPois = useMemo(() => {
    let filtered = pois;
    
    // Filter by shared POIs if viewing shared link
    if (showSharedPois && sharedPoiIds) {
      filtered = filtered.filter(poi => sharedPoiIds.includes(poi.id));
    }
    // Filter by favorites
    else if (showFavoritesOnly) {
      filtered = filtered.filter(poi => isFavorite(poi.id));
    }
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(poi => poi.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(poi => {
        const name = language === 'ro' ? poi.name : poi.name_en;
        const description = language === 'ro' ? poi.description : poi.description_en;
        return (
          name.toLowerCase().includes(query) ||
          (description && description.toLowerCase().includes(query)) ||
          (poi.address && poi.address.toLowerCase().includes(query))
        );
      });
    }
    
    // Sort results
    if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => {
        const nameA = language === 'ro' ? a.name : a.name_en;
        const nameB = language === 'ro' ? b.name : b.name_en;
        return nameA.localeCompare(nameB, language === 'ro' ? 'ro' : 'en');
      });
    } else if (sortBy === 'rating') {
      filtered = [...filtered].sort((a, b) => {
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;
        return ratingB - ratingA; // Descending (highest rating first)
      });
    }
    // Default: keep display_order from database
    
    return filtered;
  }, [pois, selectedCategory, searchQuery, language, sortBy, showFavoritesOnly, showSharedPois, sharedPoiIds, isFavorite]);

  // Get favorite POIs for export
  const favoritePois = useMemo(() => {
    return pois.filter(poi => isFavorite(poi.id));
  }, [pois, isFavorite]);

  const hasActiveFilters = searchQuery.trim() || selectedCategory || sortBy !== 'default' || showFavoritesOnly || showSharedPois;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSortBy('default');
    setShowFavoritesOnly(false);
    setShowSharedPois(false);
    setSharedPoiIds(null);
    // Remove shared_pois from URL
    searchParams.delete('shared_pois');
    setSearchParams(searchParams);
  };

  const handleExportPdf = () => {
    if (favoritePois.length === 0) {
      toast.error(language === 'ro' ? 'Nu ai locații favorite pentru export' : 'No favorite locations to export');
      return;
    }

    exportPoiFavoritesPdf({
      title: t.pdfTitle,
      pois: favoritePois,
      language: language as 'ro' | 'en',
      labels: {
        category: t.pdfCategory,
        address: t.pdfAddress,
        rating: t.pdfRating,
        generatedOn: t.pdfGeneratedOn,
        noDescription: t.pdfNoDescription,
      },
      categoryLabels: t.categories as Record<string, string>,
    });

    toast.success(language === 'ro' ? 'PDF exportat cu succes!' : 'PDF exported successfully!');
  };

  const handleShareLink = async () => {
    if (favoritePois.length === 0) {
      toast.error(language === 'ro' ? 'Nu ai locații favorite pentru partajare' : 'No favorite locations to share');
      return;
    }

    // Use the new createShareableLink that saves to database for authenticated users
    const { link } = await createShareableLink(favorites, userId || undefined);
    
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success(t.linkCopied);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      toast.success(t.linkCopied);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Handle import with notification
  const handleImportFavorites = async () => {
    if (!sharedPoiIds) return;
    
    importFavorites(sharedPoiIds);
    
    // Send notification to the original sharer if this is a tracked share
    // Include userId if authenticated for tracking who imported
    if (currentShareCode) {
      const notYetFavorited = sharedPoiIds.filter(id => !isFavorite(id));
      await notifyPoiImport(currentShareCode, undefined, notYetFavorited.length, userId || undefined);
    }
  };

  return (
    <section 
      ref={animation.ref as React.RefObject<HTMLElement>}
      className="py-20 bg-muted/30"
    >
      <div className="container mx-auto px-6">
        {/* Shared POIs Banner */}
        {showSharedPois && sharedPoiIds && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-2xl bg-primary/10 border border-primary/20"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  {sharedLinkInfo?.name ? (
                    <h3 className="text-lg font-semibold text-foreground">{sharedLinkInfo.name}</h3>
                  ) : (
                    <h3 className="text-lg font-semibold text-foreground">{t.sharedTitle}</h3>
                  )}
                  {sharedLinkInfo?.description && (
                    <p className="text-sm text-muted-foreground max-w-md">{sharedLinkInfo.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {sharedLinkInfo?.name ? t.sharedSubtitle : ''} {sharedPoiIds.length} {language === 'ro' ? 'locații recomandate' : 'recommended locations'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Import to favorites button - requires authentication */}
                {(() => {
                  const notYetFavorited = sharedPoiIds.filter(id => !isFavorite(id));
                  const allImported = notYetFavorited.length === 0;
                  
                  // If not authenticated, show login button
                  if (!isAuthenticated) {
                    const currentUrl = window.location.pathname + window.location.search;
                    return (
                      <RouterLink 
                        to={`/auth?redirect=${encodeURIComponent(currentUrl)}`}
                        className="flex-1 sm:flex-none"
                      >
                        <Button variant="default" size="sm" className="w-full">
                          <LogIn className="w-4 h-4 mr-2" />
                          {t.loginToImport}
                        </Button>
                      </RouterLink>
                    );
                  }
                  
                  return (
                    <Button
                      variant={allImported ? "outline" : "default"}
                      size="sm"
                      onClick={handleImportFavorites}
                      disabled={isImporting || allImported}
                      className="flex-1 sm:flex-none"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t.importing}
                        </>
                      ) : allImported ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          {t.alreadyImported}
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4 mr-2" />
                          {t.importToFavorites}
                        </>
                      )}
                    </Button>
                  );
                })()}
                <Button variant="outline" size="sm" onClick={clearFilters} className="flex-1 sm:flex-none">
                  {t.viewAll}
                </Button>
              </div>
            </div>
            
            {/* Login encouragement banner for unauthenticated users */}
            {!isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 rounded-xl bg-muted/50 border border-border"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t.loginBannerTitle}</p>
                      <p className="text-sm text-muted-foreground">{t.loginBannerSubtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <RouterLink 
                      to={`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                      className="flex-1 sm:flex-none"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <LogIn className="w-4 h-4 mr-2" />
                        {t.loginButton}
                      </Button>
                    </RouterLink>
                    <RouterLink 
                      to={`/auth?mode=signup&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                      className="flex-1 sm:flex-none"
                    >
                      <Button size="sm" className="w-full">
                        <UserPlus className="w-4 h-4 mr-2" />
                        {t.signupButton}
                      </Button>
                    </RouterLink>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={animation.isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t.badge}</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
            {t.title}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              {t.titleHighlight}
            </span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            {t.subtitle}
          </p>

          {/* Premium Benefits Banner for unauthenticated users */}
          <AnimatePresence>
            {!isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="max-w-2xl mx-auto"
              >
                <div className="relative p-4 rounded-xl bg-gradient-to-r from-gold/10 via-gold/5 to-gold/10 border border-gold/25 overflow-hidden">
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer-sweep_3s_infinite] bg-gradient-to-r from-transparent via-gold/10 to-transparent skew-x-12 pointer-events-none" />
                  
                  <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ 
                          rotate: [0, 8, -8, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          repeatDelay: 4 
                        }}
                        className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0"
                      >
                        <Crown className="w-5 h-5 text-gold" />
                      </motion.div>
                      
                      <div className="text-left">
                        <span className="text-sm font-semibold text-foreground">
                          {language === 'ro' 
                            ? 'Deblochează toate locațiile exclusive' 
                            : 'Unlock all exclusive locations'}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ro' 
                            ? 'Salvează favorite, partajează și exportă PDF' 
                            : 'Save favorites, share and export PDF'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <PremiumBenefitsBadge variant="compact" className="hidden md:flex" />
                      
                      <RouterLink to="/auth?mode=signup">
                        <Button 
                          size="sm" 
                          className="gap-1.5 bg-gold hover:bg-gold/90 text-gold-foreground font-medium shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {language === 'ro' ? 'Gratuit' : 'Free'}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Search and Filters */}
        {!isLoading && pois.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={animation.isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 space-y-4"
          >
            {/* Search Input */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 h-12 rounded-full bg-card border-border"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="rounded-full"
              >
                <Filter className="w-4 h-4 mr-1" />
                {getCategoryLabel('all')}
              </Button>
              {availableCategories.map((category) => {
                const Icon = categoryIcons[category] || MapPin;
                const isSelected = selectedCategory === category;
                return (
                  <Button
                    key={category}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(isSelected ? null : category)}
                    className="rounded-full"
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {getCategoryLabel(category)}
                  </Button>
                );
              })}
            </div>

            {/* Sort Options */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <ArrowUpDown className="w-4 h-4" />
                {t.sortBy}:
              </span>
              <div className="flex gap-1">
                <Button
                  variant={sortBy === 'default' ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy('default')}
                  className="text-xs"
                >
                  {t.sortDefault}
                </Button>
                <Button
                  variant={sortBy === 'name' ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy('name')}
                  className="text-xs"
                >
                  <SortAsc className="w-3 h-3 mr-1" />
                  {t.sortName}
                </Button>
                <Button
                  variant={sortBy === 'rating' ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy('rating')}
                  className="text-xs"
                >
                  <Star className="w-3 h-3 mr-1" />
                  {t.sortRating}
                </Button>
              </div>

              {/* Favorites Toggle */}
              <div className="h-6 w-px bg-border mx-2" />
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="rounded-full"
              >
                <Heart className={`w-4 h-4 mr-1 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                {t.favorites}
                {favoritesCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {favoritesCount}
                  </Badge>
                )}
              </Button>

              {/* Export/Share Dropdown */}
              {favoritesCount > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Share2 className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">{language === 'ro' ? 'Partajează' : 'Share'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportPdf}>
                      <Download className="w-4 h-4 mr-2" />
                      {t.exportPdf}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareLink}>
                      {linkCopied ? (
                        <Check className="w-4 h-4 mr-2 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      {linkCopied ? t.linkCopied : t.shareLink}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Stats Dashboard Button */}
              {isAuthenticated && <SharedLinksStats />}
            </div>

            {/* Results count and clear filters */}
            {hasActiveFilters && (
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>
                  <strong className="text-foreground">{filteredPois.length}</strong> {t.resultsCount}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-primary hover:text-primary"
                >
                  <X className="w-3 h-3 mr-1" />
                  {t.clearFilters}
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-start justify-between mb-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <Skeleton className="w-16 h-6 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results - when filters produce no matches */}
        {!isLoading && pois.length > 0 && filteredPois.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 mb-12 bg-card rounded-2xl border border-border"
          >
            {showFavoritesOnly && favoritesCount === 0 ? (
              <>
                <HeartOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">{t.noFavorites}</p>
                <p className="text-muted-foreground mb-4">{t.noFavoritesHint}</p>
                <Button variant="outline" onClick={() => setShowFavoritesOnly(false)}>
                  <Heart className="w-4 h-4 mr-2" />
                  {t.categories.all}
                </Button>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">{t.noResults}</p>
                <p className="text-muted-foreground mb-4">{t.noResultsHint}</p>
                <Button variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  {t.clearFilters}
                </Button>
              </>
            )}
          </motion.div>
        )}

        {/* No POIs at all */}
        {!isLoading && pois.length === 0 && (
          <div className="text-center py-12 mb-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t.noResults}</p>
          </div>
        )}

        {/* Recommendations Grid */}
        {!isLoading && filteredPois.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <AnimatePresence mode="popLayout">
              {filteredPois.map((poi, index) => {
                const Icon = categoryIcons[poi.category] || MapPin;
                const colorClasses = categoryColors[poi.category] || 'from-primary/20 to-primary/5 border-primary/30';
                const iconColor = categoryIconColors[poi.category] || 'text-primary';
                
                return (
                  <motion.div
                    key={poi.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`group relative rounded-2xl bg-gradient-to-br ${colorClasses} border backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden`}
                  >
                    {/* Image with lazy loading and optimization */}
                    {poi.image_url && (
                      <div className="relative h-40 overflow-hidden">
                        <OptimizedImage 
                          src={poi.image_url} 
                          alt={language === 'ro' ? poi.name : poi.name_en}
                          className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                          aspectRatio="16/10"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          priority={index < 3}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                        
                        {/* Favorite button on image */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(poi.id);
                          }}
                          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-background/90 flex items-center justify-center hover:bg-background transition-colors z-10"
                          aria-label={isFavorite(poi.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart 
                            className={`w-5 h-5 transition-colors ${
                              isFavorite(poi.id) 
                                ? 'text-rose-500 fill-rose-500' 
                                : 'text-muted-foreground hover:text-rose-500'
                            }`} 
                          />
                        </button>
                        
                        {poi.rating && (
                          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-background/90 text-sm">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="font-medium">{poi.rating}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="p-6">
                      {/* Category Icon - show only if no image */}
                      {!poi.image_url && (
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-background/80 flex items-center justify-center shadow-sm">
                            <Icon className={`w-6 h-6 ${iconColor}`} />
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Favorite button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFavorite(poi.id);
                              }}
                              className="w-9 h-9 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
                              aria-label={isFavorite(poi.id) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Heart 
                                className={`w-5 h-5 transition-colors ${
                                  isFavorite(poi.id) 
                                    ? 'text-rose-500 fill-rose-500' 
                                    : 'text-muted-foreground hover:text-rose-500'
                                }`} 
                              />
                            </button>
                            {poi.rating && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 text-sm">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span className="font-medium">{poi.rating}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                        {language === 'ro' ? poi.name : poi.name_en}
                      </h3>
                      
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {language === 'ro' 
                          ? (poi.description || 'Fără descriere') 
                          : (poi.description_en || 'No description')}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        {poi.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span className="truncate max-w-[120px]">{poi.address}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                          <Sparkles className="w-3 h-3" />
                          {getCategoryLabel(poi.category)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Local Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={animation.isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-card rounded-2xl border border-border p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">{t.localTip}</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {localTips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={animation.isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{index + 1}</span>
                </div>
                <p className="text-muted-foreground">{tip}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={animation.isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center mt-10"
        >
          <Link to="/pentru-oaspeti#map">
            <Button size="lg" variant="outline" className="group">
              <MapPin className="w-4 h-4 mr-2" />
              {t.seeOnMap}
              <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CityGuideSection;
