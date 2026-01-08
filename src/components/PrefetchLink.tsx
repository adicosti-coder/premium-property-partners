import { Link, LinkProps } from 'react-router-dom';
import { useCallback, useRef } from 'react';
import { usePrefetch } from '@/hooks/usePrefetch';

interface PrefetchLinkProps extends LinkProps {
  propertyId?: string;
  blogSlug?: string;
}

export const PrefetchLink = ({ 
  propertyId, 
  blogSlug, 
  onMouseEnter,
  children, 
  ...props 
}: PrefetchLinkProps) => {
  const { prefetchProperty, prefetchBlogArticle } = usePrefetch();
  const prefetched = useRef(false);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!prefetched.current) {
      if (propertyId) {
        prefetchProperty(propertyId);
      }
      if (blogSlug) {
        prefetchBlogArticle(blogSlug);
      }
      prefetched.current = true;
    }
    onMouseEnter?.(e);
  }, [propertyId, blogSlug, prefetchProperty, prefetchBlogArticle, onMouseEnter]);

  return (
    <Link onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </Link>
  );
};
