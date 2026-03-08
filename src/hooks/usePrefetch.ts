import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

/** Preload an image into browser cache */
const preloadImage = (src: string) => {
  if (!src || typeof window === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
};

export const usePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchProperty = useCallback((propertyId: string) => {
    // Prefetch property data
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
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch bookings for availability
    queryClient.prefetchQuery({
      queryKey: ['bookings', propertyId],
      queryFn: async () => {
        const { data } = await supabase
          .from('booking_availability')
          .select('id, property_id, check_in, check_out, status')
          .eq('property_id', parseInt(propertyId))
          .gte('check_out', new Date().toISOString().split('T')[0]);
        return data;
      },
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch pricing
    queryClient.prefetchQuery({
      queryKey: ['property-pricing', propertyId],
      queryFn: async () => {
        const { data } = await supabase
          .from('property_pricing')
          .select('*')
          .eq('property_id', propertyId)
          .eq('is_active', true);
        return data;
      },
      staleTime: 5 * 60 * 1000,
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
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  /** Prefetch hero image of a property on hover */
  const prefetchPropertyImage = useCallback((imageSrc: string) => {
    preloadImage(imageSrc);
  }, []);

  return { prefetchProperty, prefetchBlogArticle, prefetchPropertyImage };
};
