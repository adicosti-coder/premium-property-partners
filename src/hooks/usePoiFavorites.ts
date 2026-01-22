import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LOCAL_STORAGE_KEY = 'poi-favorites';

export const usePoiFavorites = () => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [localFavorites, setLocalFavorites] = useState<string[]>([]);

  // Check auth state
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load local favorites from localStorage
  useEffect(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          setLocalFavorites(JSON.parse(stored));
        }
      } catch {
        setLocalFavorites([]);
      }
    }
  }, [user]);

  // Fetch favorites from database for authenticated users
  const { data: dbFavorites = [], isLoading } = useQuery({
    queryKey: ['poi-favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('poi_favorites')
        .select('poi_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(f => f.poi_id);
    },
    enabled: !!user,
  });

  // Get current favorites (from DB or localStorage)
  const favorites = user ? dbFavorites : localFavorites;

  // Add favorite mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async (poiId: string) => {
      if (!user) {
        // Store in localStorage
        const updated = [...localFavorites, poiId];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        setLocalFavorites(updated);
        return;
      }

      const { error } = await supabase
        .from('poi_favorites')
        .insert({ user_id: user.id, poi_id: poiId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poi-favorites'] });
    },
    onError: () => {
      toast.error('Nu s-a putut adăuga la favorite');
    },
  });

  // Bulk add favorites mutation (for importing shared favorites)
  const bulkAddFavoritesMutation = useMutation({
    mutationFn: async (poiIds: string[]) => {
      // Filter out already favorited items
      const newIds = poiIds.filter(id => !favorites.includes(id));
      
      if (newIds.length === 0) return 0;

      if (!user) {
        // Store in localStorage
        const updated = [...new Set([...localFavorites, ...newIds])];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        setLocalFavorites(updated);
        return newIds.length;
      }

      // Insert all new favorites at once
      const inserts = newIds.map(poi_id => ({ user_id: user.id, poi_id }));
      const { error } = await supabase
        .from('poi_favorites')
        .insert(inserts);
      
      if (error) throw error;
      return newIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['poi-favorites'] });
      if (count && count > 0) {
        toast.success(`${count} locații adăugate la favorite!`);
      }
    },
    onError: () => {
      toast.error('Nu s-au putut importa favoritele');
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (poiId: string) => {
      if (!user) {
        // Remove from localStorage
        const updated = localFavorites.filter(id => id !== poiId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        setLocalFavorites(updated);
        return;
      }

      const { error } = await supabase
        .from('poi_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('poi_id', poiId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poi-favorites'] });
    },
    onError: () => {
      toast.error('Nu s-a putut elimina din favorite');
    },
  });

  const isFavorite = useCallback((poiId: string) => {
    return favorites.includes(poiId);
  }, [favorites]);

  const toggleFavorite = useCallback((poiId: string) => {
    if (isFavorite(poiId)) {
      removeFavoriteMutation.mutate(poiId);
    } else {
      addFavoriteMutation.mutate(poiId);
    }
  }, [isFavorite, addFavoriteMutation, removeFavoriteMutation]);

  const importFavorites = useCallback((poiIds: string[]) => {
    bulkAddFavoritesMutation.mutate(poiIds);
  }, [bulkAddFavoritesMutation]);

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    importFavorites,
    isImporting: bulkAddFavoritesMutation.isPending,
    isAuthenticated: !!user,
    userId: user?.id || null,
    favoritesCount: favorites.length,
  };
};
