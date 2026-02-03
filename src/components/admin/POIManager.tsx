import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Star, ExternalLink, Phone, Upload, X, Loader2, Image as ImageIcon, Crown, Search, Filter, Sparkles, RotateCcw, AlertCircle, Download } from "lucide-react";
import { useRef, useMemo } from "react";
import BulkProgressIndicator from "./BulkProgressIndicator";

interface POI {
  id: string;
  name: string;
  name_en: string;
  category: string;
  description: string | null;
  description_en: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  is_active: boolean;
  is_premium: boolean;
  display_order: number;
  image_url: string | null;
  image_fetch_failed: boolean;
  image_fetch_attempted_at: string | null;
  image_source: string | null;
}

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant', labelEn: 'Restaurant', color: 'bg-orange-500' },
  { value: 'cafe', label: 'Cafenea', labelEn: 'Cafe', color: 'bg-amber-600' },
  { value: 'shopping', label: 'Shopping', labelEn: 'Shopping', color: 'bg-pink-500' },
  { value: 'attraction', label: 'Atracție', labelEn: 'Attraction', color: 'bg-purple-500' },
  { value: 'transport', label: 'Transport', labelEn: 'Transport', color: 'bg-blue-500' },
  { value: 'health', label: 'Sănătate', labelEn: 'Health', color: 'bg-red-500' },
  { value: 'entertainment', label: 'Divertisment', labelEn: 'Entertainment', color: 'bg-green-500' },
  { value: 'sports', label: 'Sport', labelEn: 'Sports', color: 'bg-teal-500' },
  { value: 'services', label: 'Servicii', labelEn: 'Services', color: 'bg-slate-500' },
];

const POIManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPOI, setEditingPOI] = useState<POI | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingGooglePhoto, setIsFetchingGooglePhoto] = useState(false);
  const [isFetchingPixabayPhoto, setIsFetchingPixabayPhoto] = useState(false);
  const [isFetchingPexelsPhoto, setIsFetchingPexelsPhoto] = useState(false);
  const [isFetchingUnsplashPhoto, setIsFetchingUnsplashPhoto] = useState(false);
  const [isBulkFetching, setIsBulkFetching] = useState(false);
  const [isBulkPixabayFetching, setIsBulkPixabayFetching] = useState(false);
  const [isBulkPexelsFetching, setIsBulkPexelsFetching] = useState(false);
  const [isBulkUnsplashFetching, setIsBulkUnsplashFetching] = useState(false);
  const [retryingPoiId, setRetryingPoiId] = useState<string | null>(null);
  const [pixabayRetryingPoiId, setPixabayRetryingPoiId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [bulkPixabayProgress, setBulkPixabayProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [bulkPexelsProgress, setBulkPexelsProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [bulkUnsplashProgress, setBulkUnsplashProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [premiumFilter, setPremiumFilter] = useState<string>('all');
  const [imageFilter, setImageFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    category: 'restaurant',
    description: '',
    description_en: '',
    latitude: '',
    longitude: '',
    address: '',
    phone: '',
    website: '',
    rating: '',
    is_active: true,
    is_premium: false,
    display_order: 0,
    image_url: '',
    image_source: '' as string,
  });

  const { data: pois, isLoading } = useQuery({
    queryKey: ['admin-pois'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_of_interest')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as POI[];
    },
  });

  // Count POIs without images (excluding ones where fetch failed)
  const poisWithoutImagesCount = useMemo(() => {
    if (!pois) return 0;
    return pois.filter(poi => !poi.image_url && !poi.image_fetch_failed).length;
  }, [pois]);

  // Count POIs where image fetch failed
  const poisWithFailedFetchCount = useMemo(() => {
    if (!pois) return 0;
    return pois.filter(poi => poi.image_fetch_failed).length;
  }, [pois]);

  // Fetch photo from Google Places
  const fetchGooglePlacePhoto = async () => {
    if (!formData.name && !formData.address) {
      toast.error('Te rog completează numele sau adresa POI-ului');
      return;
    }

    setIsFetchingGooglePhoto(true);
    try {
      const response = await supabase.functions.invoke('fetch-place-photo', {
        body: {
          query: formData.name,
          address: formData.address,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.photo_url) {
        setFormData(prev => ({ 
          ...prev, 
          image_url: data.photo_url,
          image_source: data.source || 'google_places'
        }));
        const sourceLabel = data.source === 'pixabay' ? 'Pixabay' : 'Google Places';
        toast.success(`Imagine găsită pentru "${data.place_name}" (${sourceLabel})!`);
      }
    } catch (error: any) {
      console.error('Error fetching Google photo:', error);
      toast.error('Nu am putut găsi o imagine: ' + (error.message || 'Eroare necunoscută'));
    } finally {
      setIsFetchingGooglePhoto(false);
    }
  };

  // Fetch photo directly from Pixabay (skip Google)
  const fetchPixabayPhoto = async () => {
    if (!formData.name && !formData.address) {
      toast.error('Te rog completează numele sau adresa POI-ului');
      return;
    }

    setIsFetchingPixabayPhoto(true);
    try {
      const response = await supabase.functions.invoke('fetch-place-photo', {
        body: {
          query: formData.name || formData.address,
          forcePixabay: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.photo_url) {
        setFormData(prev => ({ 
          ...prev, 
          image_url: data.photo_url,
          image_source: 'pixabay'
        }));
        toast.success(`Imagine Pixabay găsită pentru "${data.place_name}"!`);
      }
    } catch (error: any) {
      console.error('Error fetching Pixabay photo:', error);
      toast.error('Nu am putut găsi o imagine pe Pixabay: ' + (error.message || 'Eroare necunoscută'));
    } finally {
      setIsFetchingPixabayPhoto(false);
    }
  };

  // Fetch photo directly from Pexels
  const fetchPexelsPhoto = async () => {
    if (!formData.name && !formData.address) {
      toast.error('Te rog completează numele sau adresa POI-ului');
      return;
    }

    setIsFetchingPexelsPhoto(true);
    try {
      const response = await supabase.functions.invoke('fetch-place-photo', {
        body: {
          query: formData.name || formData.address,
          forcePexels: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.photo_url) {
        setFormData(prev => ({ 
          ...prev, 
          image_url: data.photo_url,
          image_source: 'pexels'
        }));
        toast.success(`Imagine Pexels găsită pentru "${data.place_name}"!`);
      } else {
        toast.error('Nu s-a găsit imagine pe Pexels');
      }
    } catch (error: any) {
      console.error('Error fetching Pexels photo:', error);
      toast.error('Nu am putut găsi o imagine pe Pexels: ' + (error.message || 'Eroare necunoscută'));
    } finally {
      setIsFetchingPexelsPhoto(false);
    }
  };

  // Fetch photo directly from Unsplash
  const fetchUnsplashPhoto = async () => {
    if (!formData.name && !formData.address) {
      toast.error('Te rog completează numele sau adresa POI-ului');
      return;
    }

    setIsFetchingUnsplashPhoto(true);
    try {
      const response = await supabase.functions.invoke('fetch-place-photo', {
        body: {
          query: formData.name || formData.address,
          forceUnsplash: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.photo_url) {
        setFormData(prev => ({ 
          ...prev, 
          image_url: data.photo_url,
          image_source: 'unsplash'
        }));
        toast.success(`Imagine Unsplash găsită pentru "${data.place_name}"!`);
      } else {
        toast.error('Nu s-a găsit imagine pe Unsplash');
      }
    } catch (error: any) {
      console.error('Error fetching Unsplash photo:', error);
      toast.error('Nu am putut găsi o imagine pe Unsplash: ' + (error.message || 'Eroare necunoscută'));
    } finally {
      setIsFetchingUnsplashPhoto(false);
    }
  };

  // Retry fetching image from Pixabay only for a single POI in table
  const retryFetchPixabayForPoi = async (poi: POI) => {
    setPixabayRetryingPoiId(poi.id);
    
    try {
      const response = await supabase.functions.invoke('fetch-place-photo', {
        body: {
          query: poi.name,
          forcePixabay: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.photo_url) {
        const { error: updateError } = await supabase
          .from('points_of_interest')
          .update({ 
            image_url: data.photo_url,
            image_source: data.source || 'pixabay',
            image_fetch_failed: false,
            image_fetch_attempted_at: new Date().toISOString()
          })
          .eq('id', poi.id);

        if (updateError) {
          throw updateError;
        }

        queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
        queryClient.invalidateQueries({ queryKey: ['pois'] });
        toast.success(`Imagine Pixabay găsită pentru "${poi.name}"!`);
      } else {
        toast.error(`Nu s-a găsit imagine Pixabay pentru "${poi.name}"`);
      }
    } catch (error: any) {
      console.error(`Failed to fetch Pixabay photo for ${poi.name}:`, error);
      toast.error('Eroare la căutare Pixabay: ' + (error.message || 'Eroare necunoscută'));
    } finally {
      setPixabayRetryingPoiId(null);
    }
  };

  // Bulk fetch photos for all POIs without images (skip failed ones)
  const bulkFetchMissingPhotos = async () => {
    if (!pois) return;
    
    // Filter out POIs that already have images or previously failed
    const poisWithoutImages = pois.filter(poi => !poi.image_url && !poi.image_fetch_failed);
    
    if (poisWithoutImages.length === 0) {
      toast.info('Toate POI-urile au deja imagini sau au fost marcate ca indisponibile!');
      return;
    }

    setIsBulkFetching(true);
    setBulkProgress({ current: 0, total: poisWithoutImages.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < poisWithoutImages.length; i++) {
      const poi = poisWithoutImages[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const response = await supabase.functions.invoke('fetch-place-photo', {
          body: {
            query: poi.name,
            address: poi.address,
            latitude: poi.latitude,
            longitude: poi.longitude,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;
        
        if (data.photo_url) {
          // Update POI with new image and reset failed flag
          const { error: updateError } = await supabase
            .from('points_of_interest')
            .update({ 
              image_url: data.photo_url,
              image_source: data.source || 'google_places',
              image_fetch_failed: false,
              image_fetch_attempted_at: new Date().toISOString()
            })
            .eq('id', poi.id);

          if (updateError) {
            throw updateError;
          }

          successCount++;
          setBulkProgress(prev => ({ ...prev, success: successCount }));
        } else {
          // Mark as failed so we don't try again
          await supabase
            .from('points_of_interest')
            .update({ 
              image_fetch_failed: true,
              image_fetch_attempted_at: new Date().toISOString()
            })
            .eq('id', poi.id);

          failedCount++;
          setBulkProgress(prev => ({ ...prev, failed: failedCount }));
        }
      } catch (error) {
        console.error(`Failed to fetch photo for ${poi.name}:`, error);
        
        // Mark as failed on error too
        await supabase
          .from('points_of_interest')
          .update({ 
            image_fetch_failed: true,
            image_fetch_attempted_at: new Date().toISOString()
          })
          .eq('id', poi.id);

        failedCount++;
        setBulkProgress(prev => ({ ...prev, failed: failedCount }));
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsBulkFetching(false);
    queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
    queryClient.invalidateQueries({ queryKey: ['pois'] });

    if (successCount > 0) {
      toast.success(`${successCount} imagini adăugate cu succes!${failedCount > 0 ? ` (${failedCount} marcate ca indisponibile)` : ''}`);
    } else {
      toast.error('Nu am putut găsi imagini pentru niciun POI. Au fost marcate ca indisponibile.');
    }
  };

  // Bulk fetch photos from Pixabay only for all POIs without images
  const bulkFetchPixabayPhotos = async () => {
    if (!pois) return;
    
    // Filter POIs that don't have images (include failed ones since Pixabay might find them)
    const poisWithoutImages = pois.filter(poi => !poi.image_url);
    
    if (poisWithoutImages.length === 0) {
      toast.info('Toate POI-urile au deja imagini!');
      return;
    }

    setIsBulkPixabayFetching(true);
    setBulkPixabayProgress({ current: 0, total: poisWithoutImages.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < poisWithoutImages.length; i++) {
      const poi = poisWithoutImages[i];
      setBulkPixabayProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const response = await supabase.functions.invoke('fetch-place-photo', {
          body: {
            query: poi.name,
            forcePixabay: true,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;
        
        if (data.photo_url) {
          // Update POI with new image
          const { error: updateError } = await supabase
            .from('points_of_interest')
            .update({ 
              image_url: data.photo_url,
              image_source: 'pixabay',
              image_fetch_failed: false,
              image_fetch_attempted_at: new Date().toISOString()
            })
            .eq('id', poi.id);

          if (updateError) {
            throw updateError;
          }

          successCount++;
          setBulkPixabayProgress(prev => ({ ...prev, success: successCount }));
        } else {
          failedCount++;
          setBulkPixabayProgress(prev => ({ ...prev, failed: failedCount }));
        }
      } catch (error) {
        console.error(`Failed to fetch Pixabay photo for ${poi.name}:`, error);
        failedCount++;
        setBulkPixabayProgress(prev => ({ ...prev, failed: failedCount }));
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsBulkPixabayFetching(false);
    queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
    queryClient.invalidateQueries({ queryKey: ['pois'] });

    if (successCount > 0) {
      toast.success(`${successCount} imagini Pixabay adăugate cu succes!${failedCount > 0 ? ` (${failedCount} negăsite)` : ''}`);
    } else {
      toast.error('Nu am putut găsi imagini Pixabay pentru niciun POI.');
    }
  };

  // Bulk fetch photos from Pexels only for all POIs without images
  const bulkFetchPexelsPhotos = async () => {
    if (!pois) return;
    
    const poisWithoutImages = pois.filter(poi => !poi.image_url);
    
    if (poisWithoutImages.length === 0) {
      toast.info('Toate POI-urile au deja imagini!');
      return;
    }

    setIsBulkPexelsFetching(true);
    setBulkPexelsProgress({ current: 0, total: poisWithoutImages.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < poisWithoutImages.length; i++) {
      const poi = poisWithoutImages[i];
      setBulkPexelsProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const response = await supabase.functions.invoke('fetch-place-photo', {
          body: {
            query: poi.name,
            forcePexels: true,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;
        
        if (data.photo_url) {
          const { error: updateError } = await supabase
            .from('points_of_interest')
            .update({ 
              image_url: data.photo_url,
              image_source: data.source || 'pexels',
              image_fetch_failed: false,
              image_fetch_attempted_at: new Date().toISOString()
            })
            .eq('id', poi.id);

          if (updateError) {
            throw updateError;
          }

          successCount++;
          setBulkPexelsProgress(prev => ({ ...prev, success: successCount }));
        } else {
          failedCount++;
          setBulkPexelsProgress(prev => ({ ...prev, failed: failedCount }));
        }
      } catch (error) {
        console.error(`Failed to fetch Pexels photo for ${poi.name}:`, error);
        failedCount++;
        setBulkPexelsProgress(prev => ({ ...prev, failed: failedCount }));
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsBulkPexelsFetching(false);
    queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
    queryClient.invalidateQueries({ queryKey: ['pois'] });

    if (successCount > 0) {
      toast.success(`${successCount} imagini Pexels adăugate cu succes!${failedCount > 0 ? ` (${failedCount} negăsite)` : ''}`);
    } else {
      toast.error('Nu am putut găsi imagini Pexels pentru niciun POI.');
    }
  };

  // Bulk fetch photos from Unsplash only for all POIs without images
  const bulkFetchUnsplashPhotos = async () => {
    if (!pois) return;
    
    const poisWithoutImages = pois.filter(poi => !poi.image_url);
    
    if (poisWithoutImages.length === 0) {
      toast.info('Toate POI-urile au deja imagini!');
      return;
    }

    setIsBulkUnsplashFetching(true);
    setBulkUnsplashProgress({ current: 0, total: poisWithoutImages.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < poisWithoutImages.length; i++) {
      const poi = poisWithoutImages[i];
      setBulkUnsplashProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const response = await supabase.functions.invoke('fetch-place-photo', {
          body: {
            query: poi.name,
            forceUnsplash: true,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;
        
        if (data.photo_url) {
          const { error: updateError } = await supabase
            .from('points_of_interest')
            .update({ 
              image_url: data.photo_url,
              image_source: data.source || 'unsplash',
              image_fetch_failed: false,
              image_fetch_attempted_at: new Date().toISOString()
            })
            .eq('id', poi.id);

          if (updateError) {
            throw updateError;
          }

          successCount++;
          setBulkUnsplashProgress(prev => ({ ...prev, success: successCount }));
        } else {
          failedCount++;
          setBulkUnsplashProgress(prev => ({ ...prev, failed: failedCount }));
        }
      } catch (error) {
        console.error(`Failed to fetch Unsplash photo for ${poi.name}:`, error);
        failedCount++;
        setBulkUnsplashProgress(prev => ({ ...prev, failed: failedCount }));
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsBulkUnsplashFetching(false);
    queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
    queryClient.invalidateQueries({ queryKey: ['pois'] });

    if (successCount > 0) {
      toast.success(`${successCount} imagini Unsplash adăugate cu succes!${failedCount > 0 ? ` (${failedCount} negăsite)` : ''}`);
    } else {
      toast.error('Nu am putut găsi imagini Unsplash pentru niciun POI.');
    }
  };

  // Reset failed status for all POIs
  const resetFailedPois = async () => {
    const { error } = await supabase
      .from('points_of_interest')
      .update({ image_fetch_failed: false })
      .eq('image_fetch_failed', true);

    if (error) {
      toast.error('Eroare la resetare: ' + error.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
    toast.success('Status resetat! Poți încerca din nou.');
  };

  // Export POIs without images to CSV
  const exportMissingImagesPoisCsv = () => {
    if (!pois) return;

    const poisWithoutImages = pois.filter(poi => !poi.image_url);
    
    if (poisWithoutImages.length === 0) {
      toast.info('Toate POI-urile au imagini!');
      return;
    }

    // CSV headers
    const headers = ['ID', 'Nume', 'Nume EN', 'Categorie', 'Adresă', 'Latitudine', 'Longitudine', 'Website', 'Telefon', 'Fetch Eșuat', 'Ultima Încercare'];
    
    // CSV rows
    const rows = poisWithoutImages.map(poi => [
      poi.id,
      `"${poi.name.replace(/"/g, '""')}"`,
      `"${poi.name_en.replace(/"/g, '""')}"`,
      poi.category,
      poi.address ? `"${poi.address.replace(/"/g, '""')}"` : '',
      poi.latitude,
      poi.longitude,
      poi.website || '',
      poi.phone || '',
      poi.image_fetch_failed ? 'Da' : 'Nu',
      poi.image_fetch_attempted_at || ''
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `poi-fara-imagini-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${poisWithoutImages.length} POI-uri exportate în CSV!`);
  };

  // Retry fetching image for a single POI
  const retryFetchImageForPoi = async (poi: POI) => {
    setRetryingPoiId(poi.id);
    
    try {
      const response = await supabase.functions.invoke('fetch-place-photo', {
        body: {
          query: poi.name,
          address: poi.address,
          latitude: poi.latitude,
          longitude: poi.longitude,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.photo_url) {
        // Update POI with new image and reset failed flag
        const { error: updateError } = await supabase
          .from('points_of_interest')
          .update({ 
            image_url: data.photo_url,
            image_source: data.source || 'google_places',
            image_fetch_failed: false,
            image_fetch_attempted_at: new Date().toISOString()
          })
          .eq('id', poi.id);

        if (updateError) {
          throw updateError;
        }

        queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
        queryClient.invalidateQueries({ queryKey: ['pois'] });
        toast.success(`Imagine găsită pentru "${poi.name}"!`);
      } else {
        // Still no image found
        await supabase
          .from('points_of_interest')
          .update({ 
            image_fetch_failed: true,
            image_fetch_attempted_at: new Date().toISOString()
          })
          .eq('id', poi.id);

        queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
        toast.error(`Nu s-a găsit imagine pentru "${poi.name}"`);
      }
    } catch (error: any) {
      console.error(`Failed to fetch photo for ${poi.name}:`, error);
      toast.error('Eroare la căutare: ' + (error.message || 'Eroare necunoscută'));
    } finally {
      setRetryingPoiId(null);
    }
  };

  // Filtered POIs
  const filteredPois = useMemo(() => {
    if (!pois) return [];
    
    return pois.filter((poi) => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poi.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (poi.address && poi.address.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || poi.category === categoryFilter;
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && poi.is_active) ||
        (statusFilter === 'inactive' && !poi.is_active);
      
      // Premium filter
      const matchesPremium = premiumFilter === 'all' ||
        (premiumFilter === 'premium' && poi.is_premium) ||
        (premiumFilter === 'standard' && !poi.is_premium);

      // Image filter
      const matchesImage = imageFilter === 'all' ||
        (imageFilter === 'missing' && !poi.image_url && !poi.image_fetch_failed) ||
        (imageFilter === 'failed' && poi.image_fetch_failed) ||
        (imageFilter === 'has_image' && !!poi.image_url);
      
      return matchesSearch && matchesCategory && matchesStatus && matchesPremium && matchesImage;
    });
  }, [pois, searchQuery, categoryFilter, statusFilter, premiumFilter, imageFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setPremiumFilter('all');
    setImageFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || categoryFilter !== 'all' || statusFilter !== 'all' || premiumFilter !== 'all' || imageFilter !== 'all';

  const createMutation = useMutation({
    mutationFn: async (data: Omit<POI, 'id'>) => {
      const { error } = await supabase.from('points_of_interest').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
      queryClient.invalidateQueries({ queryKey: ['pois'] });
      toast.success('Punct de interes adăugat cu succes!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Eroare la adăugare: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<POI> }) => {
      const { error } = await supabase.from('points_of_interest').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
      queryClient.invalidateQueries({ queryKey: ['pois'] });
      toast.success('Punct de interes actualizat!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Eroare la actualizare: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('points_of_interest').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
      queryClient.invalidateQueries({ queryKey: ['pois'] });
      toast.success('Punct de interes șters!');
    },
    onError: (error) => {
      toast.error('Eroare la ștergere: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      name_en: '',
      category: 'restaurant',
      description: '',
      description_en: '',
      latitude: '',
      longitude: '',
      address: '',
      phone: '',
      website: '',
      rating: '',
      is_active: true,
      is_premium: false,
      display_order: 0,
      image_url: '',
      image_source: '',
    });
    setEditingPOI(null);
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `poi-${Date.now()}.${fileExt}`;
      const filePath = `poi/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl, image_source: 'manual' }));
      toast.success('Imagine încărcată cu succes!');
    } catch (error: any) {
      toast.error('Eroare la încărcare: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (poi: POI) => {
    setEditingPOI(poi);
    setFormData({
      name: poi.name,
      name_en: poi.name_en,
      category: poi.category,
      description: poi.description || '',
      description_en: poi.description_en || '',
      latitude: String(poi.latitude),
      longitude: String(poi.longitude),
      address: poi.address || '',
      phone: poi.phone || '',
      website: poi.website || '',
      rating: poi.rating ? String(poi.rating) : '',
      is_active: poi.is_active,
      is_premium: poi.is_premium,
      display_order: poi.display_order,
      image_url: poi.image_url || '',
      image_source: poi.image_source || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      name_en: formData.name_en,
      category: formData.category,
      description: formData.description || null,
      description_en: formData.description_en || null,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      address: formData.address || null,
      phone: formData.phone || null,
      website: formData.website || null,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      is_active: formData.is_active,
      is_premium: formData.is_premium,
      display_order: formData.display_order,
      image_url: formData.image_url || null,
      image_source: formData.image_source || null,
    };

    if (editingPOI) {
      updateMutation.mutate({ id: editingPOI.id, data });
    } else {
      createMutation.mutate(data as Omit<POI, 'id'>);
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Se încarcă...</div>;
  }

  return (
    <div className="space-y-6 relative">
      {/* Floating bulk progress indicators */}
      <BulkProgressIndicator
        isActive={isBulkFetching}
        current={bulkProgress.current}
        total={bulkProgress.total}
        success={bulkProgress.success}
        failed={bulkProgress.failed}
        type="google"
      />
      
      <BulkProgressIndicator
        isActive={isBulkPixabayFetching}
        current={bulkPixabayProgress.current}
        total={bulkPixabayProgress.total}
        success={bulkPixabayProgress.success}
        failed={bulkPixabayProgress.failed}
        type="pixabay"
      />
      
      <BulkProgressIndicator
        isActive={isBulkPexelsFetching}
        current={bulkPexelsProgress.current}
        total={bulkPexelsProgress.total}
        success={bulkPexelsProgress.success}
        failed={bulkPexelsProgress.failed}
        type="pexels"
      />
      
      <BulkProgressIndicator
        isActive={isBulkUnsplashFetching}
        current={bulkUnsplashProgress.current}
        total={bulkUnsplashProgress.total}
        success={bulkUnsplashProgress.success}
        failed={bulkUnsplashProgress.failed}
        type="unsplash"
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Puncte de Interes</h2>
          <p className="text-muted-foreground">Gestionează locațiile afișate pe hartă</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk fetch button */}
          {poisWithoutImagesCount > 0 && (
            <Button
              variant="outline"
              onClick={bulkFetchMissingPhotos}
              disabled={isBulkFetching || isBulkPixabayFetching}
              className="border-primary/30 hover:bg-primary/10"
            >
              {isBulkFetching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {bulkProgress.current}/{bulkProgress.total}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Auto-imagini ({poisWithoutImagesCount} lipsă)
                </>
              )}
            </Button>
          )}

          {/* Bulk Pixabay fetch button */}
          {(poisWithoutImagesCount > 0 || poisWithFailedFetchCount > 0) && (
            <Button
              variant="outline"
              onClick={bulkFetchPixabayPhotos}
              disabled={isBulkFetching || isBulkPixabayFetching || isBulkPexelsFetching || isBulkUnsplashFetching}
              className="border-green-600/30 hover:bg-green-600/10 text-green-700 dark:text-green-400"
              title="Bulk fetch imagini de pe Pixabay"
            >
              {isBulkPixabayFetching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Pixabay {bulkPixabayProgress.current}/{bulkPixabayProgress.total}
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Pixabay
                </>
              )}
            </Button>
          )}

          {/* Bulk Pexels fetch button */}
          {(poisWithoutImagesCount > 0 || poisWithFailedFetchCount > 0) && (
            <Button
              variant="outline"
              onClick={bulkFetchPexelsPhotos}
              disabled={isBulkFetching || isBulkPixabayFetching || isBulkPexelsFetching || isBulkUnsplashFetching}
              className="border-teal-600/30 hover:bg-teal-600/10 text-teal-700 dark:text-teal-400"
              title="Bulk fetch imagini de pe Pexels"
            >
              {isBulkPexelsFetching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Pexels {bulkPexelsProgress.current}/{bulkPexelsProgress.total}
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Pexels
                </>
              )}
            </Button>
          )}

          {/* Bulk Unsplash fetch button */}
          {(poisWithoutImagesCount > 0 || poisWithFailedFetchCount > 0) && (
            <Button
              variant="outline"
              onClick={bulkFetchUnsplashPhotos}
              disabled={isBulkFetching || isBulkPixabayFetching || isBulkPexelsFetching || isBulkUnsplashFetching}
              className="border-purple-600/30 hover:bg-purple-600/10 text-purple-700 dark:text-purple-400"
              title="Bulk fetch imagini de pe Unsplash"
            >
              {isBulkUnsplashFetching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Unsplash {bulkUnsplashProgress.current}/{bulkUnsplashProgress.total}
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Unsplash
                </>
              )}
            </Button>
          )}

          {/* Reset failed POIs button */}
          {poisWithFailedFetchCount > 0 && !isBulkFetching && !isBulkPixabayFetching && !isBulkPexelsFetching && !isBulkUnsplashFetching && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFailedPois}
              className="text-muted-foreground hover:text-foreground"
              title="Resetează POI-urile marcate ca indisponibile pentru a încerca din nou"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Resetează ({poisWithFailedFetchCount})
            </Button>
          )}

          {/* Export POIs without images */}
          {(poisWithoutImagesCount > 0 || poisWithFailedFetchCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={exportMissingImagesPoisCsv}
              className="text-muted-foreground hover:text-foreground"
              title="Exportă POI-urile fără imagine în CSV"
            >
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          )}
        </div>
      </div>
        
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Adaugă POI
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPOI ? 'Editează Punct de Interes' : 'Adaugă Punct de Interes'}
            </DialogTitle>
          </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-3">
                <Label>Imagine (opțional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                {formData.image_url ? (
                  <div className="relative inline-block">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-32 h-24 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 w-6 h-6"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Google Places Auto-fetch Button */}
                    <Button
                      type="button"
                      variant="default"
                      onClick={fetchGooglePlacePhoto}
                      disabled={isFetchingGooglePhoto || isFetchingPixabayPhoto || (!formData.name && !formData.address)}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      {isFetchingGooglePhoto ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="w-5 h-5 mr-2" />
                      )}
                      {isFetchingGooglePhoto ? 'Se caută...' : '✨ Găsește imagine automată (Google Places)'}
                    </Button>
                    
                    {/* Pixabay Direct Search Button */}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={fetchPixabayPhoto}
                      disabled={isFetchingPixabayPhoto || isFetchingGooglePhoto || isFetchingPexelsPhoto || isFetchingUnsplashPhoto || (!formData.name && !formData.address)}
                      className="w-full h-10"
                    >
                      {isFetchingPixabayPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ImageIcon className="w-4 h-4 mr-2" />
                      )}
                      {isFetchingPixabayPhoto ? 'Se caută pe Pixabay...' : '🖼️ Caută doar pe Pixabay (gratuit)'}
                    </Button>
                    
                    {/* Pexels Direct Search Button */}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={fetchPexelsPhoto}
                      disabled={isFetchingPexelsPhoto || isFetchingGooglePhoto || isFetchingPixabayPhoto || isFetchingUnsplashPhoto || (!formData.name && !formData.address)}
                      className="w-full h-10 border-teal-600/30"
                    >
                      {isFetchingPexelsPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ImageIcon className="w-4 h-4 mr-2" />
                      )}
                      {isFetchingPexelsPhoto ? 'Se caută pe Pexels...' : '📷 Caută doar pe Pexels (gratuit)'}
                    </Button>
                    
                    {/* Unsplash Direct Search Button */}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={fetchUnsplashPhoto}
                      disabled={isFetchingUnsplashPhoto || isFetchingGooglePhoto || isFetchingPixabayPhoto || isFetchingPexelsPhoto || (!formData.name && !formData.address)}
                      className="w-full h-10 border-purple-600/30"
                    >
                      {isFetchingUnsplashPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ImageIcon className="w-4 h-4 mr-2" />
                      )}
                      {isFetchingUnsplashPhoto ? 'Se caută pe Unsplash...' : '🌄 Caută doar pe Unsplash (gratuit)'}
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">sau</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full h-14 border-dashed"
                    >
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-5 h-5 mr-2" />
                      )}
                      {isUploading ? 'Se încarcă...' : 'Încarcă imagine manual'}
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">sau URL extern</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    
                    {/* External URL Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL imagine (ex: Wikimedia Commons)"
                        value={formData.image_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                        className="flex-1 text-xs"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!formData.image_url}
                        onClick={() => {
                          if (formData.image_url) {
                            toast.success('URL imagine setat!');
                          }
                        }}
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Completează numele POI-ului mai sus, apoi apasă butonul pentru găsire automată.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nume (RO)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_en">Nume (EN)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descriere (RO)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description_en">Descriere (EN)</Label>
                  <Textarea
                    id="description_en"
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitudine</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="44.4268"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitudine</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="26.1025"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresă</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (0-5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_order">Ordine afișare</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Activ</Label>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="is_premium"
                    checked={formData.is_premium}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_premium: checked })}
                  />
                  <Label htmlFor="is_premium" className="flex items-center gap-1">
                    <Crown className="w-4 h-4 text-primary" />
                    Premium
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Anulează
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPOI ? 'Salvează' : 'Adaugă'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Lista Punctelor de Interes ({filteredPois.length}{pois && filteredPois.length !== pois.length ? ` din ${pois.length}` : ''})
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="w-4 h-4 mr-1" />
                  Resetează filtre
                </Button>
              )}
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după nume sau adresă..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate categoriile</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Premium Filter */}
              <Select value={premiumFilter} onValueChange={setPremiumFilter}>
                <SelectTrigger className="w-[130px]">
                  <Crown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>

              {/* Image Filter */}
              <Select value={imageFilter} onValueChange={setImageFilter}>
                <SelectTrigger className="w-[150px]">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Imagine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="has_image">Cu imagine</SelectItem>
                  <SelectItem value="missing">Fără imagine</SelectItem>
                  <SelectItem value="failed">Fetch eșuat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Adresă</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPois.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilters ? 'Nu s-au găsit rezultate pentru filtrele selectate.' : 'Nu există puncte de interes.'}
                    </TableCell>
                  </TableRow>
                ) : filteredPois.map((poi) => {
                  const categoryInfo = getCategoryInfo(poi.category);
                  return (
                    <TableRow key={poi.id} className={poi.image_fetch_failed ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {poi.image_fetch_failed ? (
                            <span title="Imagine indisponibilă pe Google Places">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                            </span>
                          ) : (
                            <MapPin className="w-4 h-4 text-primary" />
                          )}
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              {poi.name}
                              {!poi.image_url && !poi.image_fetch_failed && (
                                <span className="text-xs text-muted-foreground">(fără imagine)</span>
                              )}
                              {poi.image_url && poi.image_source && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] px-1 py-0 h-4 ${
                                    poi.image_source === 'pixabay' 
                                      ? 'border-green-500/50 text-green-600 dark:text-green-400' 
                                      : poi.image_source === 'google_places'
                                      ? 'border-blue-500/50 text-blue-600 dark:text-blue-400'
                                      : 'border-muted-foreground/50 text-muted-foreground'
                                  }`}
                                >
                                  {poi.image_source === 'pixabay' ? 'Pixabay' : 
                                   poi.image_source === 'google_places' ? 'Google' : 
                                   poi.image_source === 'manual' ? 'Manual' : poi.image_source}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{poi.name_en}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${categoryInfo.color} text-white`}>
                          {categoryInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {poi.address || '-'}
                      </TableCell>
                      <TableCell>
                        {poi.rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            {poi.rating}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={poi.is_active ? "default" : "secondary"}>
                          {poi.is_active ? 'Activ' : 'Inactiv'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {poi.is_premium ? (
                          <Badge className="bg-primary/20 text-primary border border-primary/30">
                            <Crown className="w-3 h-3 mr-1" />
                            Premium
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Retry fetch button for failed POIs - Google Places */}
                          {(poi.image_fetch_failed || (!poi.image_url && !poi.image_fetch_failed)) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => retryFetchImageForPoi(poi)}
                              disabled={retryingPoiId === poi.id || pixabayRetryingPoiId === poi.id}
                              title={poi.image_fetch_failed ? 'Încearcă din nou să găsești imagine (Google)' : 'Caută imagine pe Google Places'}
                            >
                              {retryingPoiId === poi.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-primary" />
                              )}
                            </Button>
                          )}
                          {/* Pixabay direct search button */}
                          {(poi.image_fetch_failed || !poi.image_url) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => retryFetchPixabayForPoi(poi)}
                              disabled={pixabayRetryingPoiId === poi.id || retryingPoiId === poi.id}
                              title="Caută imagine doar pe Pixabay (gratuit)"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              {pixabayRetryingPoiId === poi.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ImageIcon className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          {poi.website && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(poi.website!, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          {poi.phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`tel:${poi.phone}`, '_blank')}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(poi)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Ești sigur că vrei să ștergi acest punct de interes?')) {
                                deleteMutation.mutate(poi.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default POIManager;
