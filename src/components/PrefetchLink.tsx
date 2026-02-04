import { Link, LinkProps } from 'react-router-dom';
import { forwardRef, useCallback, useRef } from 'react';
import { usePrefetch } from '@/hooks/usePrefetch';

interface PrefetchLinkProps extends LinkProps {
  propertyId?: string;
  blogSlug?: string;
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(({ 
  propertyId, 
  blogSlug, 
  onMouseEnter,
  children, 
  ...props 
}, ref) => {
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
    <Link ref={ref} onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </Link>
  );
});

PrefetchLink.displayName = 'PrefetchLink';
