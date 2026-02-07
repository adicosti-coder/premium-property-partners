import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export const usePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchProperty = useCallback((propertyId: string) => {
    // Prefetch property images
    queryClient.prefetchQuery({
      queryKey: ['property-images', propertyId],
      queryFn: async () => {
        const { data } = await supabase
          .from('property_images')
          .select('*')
          .eq('property_id', propertyId)
          .order('display_order');
        return data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Prefetch bookings for availability
    queryClient.prefetchQuery({
      queryKey: ['bookings', propertyId],
      queryFn: async () => {
        const { data } = await supabase
          .from('bookings')
          .select('id, property_id, check_in, check_out, status')
          .eq('property_id', parseInt(propertyId))
          .gte('check_out', new Date().toISOString().split('T')[0]);
        return data;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  }, [queryClient]);

  const prefetchBlogArticle = useCallback((slug: string) => {
    queryClient.prefetchQuery({
      queryKey: ['blog-article', slug],
      queryFn: async () => {
        const { data } = await supabase
          .from('blog_articles')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();
        return data;
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  }, [queryClient]);

  return { prefetchProperty, prefetchBlogArticle };
};
