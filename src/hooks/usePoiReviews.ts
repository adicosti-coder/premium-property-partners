import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export interface PoiReview {
  id: string;
  poi_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  guest_name: string | null;
  created_at: string;
  status?: 'pending' | 'approved' | 'rejected';
}

/** Aggregated guest ratings for a set of POIs (restaurants / cafes). */
export const usePoiReviews = (poiIds: string[]) => {
  const queryClient = useQueryClient();
  const key = [...poiIds].sort().join(',');

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['poi-reviews', key],
    queryFn: async () => {
      if (poiIds.length === 0) return [] as PoiReview[];
      const { data, error } = await supabase
        .from('poi_reviews')
        .select('id,poi_id,user_id,rating,comment,guest_name,created_at,status')
        .in('poi_id', poiIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PoiReview[];
    },
    enabled: poiIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  /** Only moderated (approved) reviews are shown publicly / used in averages. */
  const approved = reviews.filter((r) => !r.status || r.status === 'approved');

  const reviewsFor = useCallback(
    (poiId: string) => approved.filter((r) => r.poi_id === poiId),
    [approved],
  );

  const summaryFor = useCallback(
    (poiId: string) => {
      const list = approved.filter((r) => r.poi_id === poiId);
      if (list.length === 0) return { average: null as number | null, count: 0 };
      const average = list.reduce((sum, r) => sum + r.rating, 0) / list.length;
      return { average: Math.round(average * 10) / 10, count: list.length };
    },
    [approved],
  );

  const submitReview = useMutation({
    mutationFn: async (input: {
      poiId: string;
      rating: number;
      comment?: string;
      guestName?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('AUTH_REQUIRED');

      const { error } = await supabase.from('poi_reviews').upsert(
        {
          poi_id: input.poiId,
          user_id: user.id,
          rating: input.rating,
          comment: input.comment?.slice(0, 1000) || null,
          guest_name: input.guestName?.slice(0, 80) || null,
          status: 'pending',
          rejection_reason: null,
          moderated_by: null,
          moderated_at: null,
        },
        { onConflict: 'poi_id,user_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poi-reviews'] });
      toast.success('Mulțumim! Recenzia ta a fost trimisă și va apărea după validarea gazdelor.');
    },
    onError: (err: Error) => {
      if (err.message === 'AUTH_REQUIRED') {
        toast.error('Intră în cont pentru a lăsa o recenzie.');
      } else {
        toast.error('Nu am putut salva recenzia. Încearcă din nou.');
      }
    },
  });

  return {
    reviews,
    isLoading,
    reviewsFor,
    summaryFor,
    submitReview: submitReview.mutate,
    isSubmitting: submitReview.isPending,
  };
};
