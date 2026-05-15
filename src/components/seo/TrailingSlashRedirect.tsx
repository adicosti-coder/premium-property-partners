import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Trailing-slash normalizer.
 *
 * Lovable's hosting layer is a SPA fallback (no Nginx/Cloudflare rule we
 * can configure for a true 301), so we redirect client-side using
 * `navigate(..., { replace: true })`. This:
 *   - Rewrites the URL bar to the slash-free variant
 *   - Replaces the history entry (no back-button trap)
 *   - Preserves search params and hash
 *
 * SEO consolidation toward the slash-free URL is then enforced by the
 * canonical tag emitted in <CanonicalHreflang />.
 *
 * Root path "/" is always preserved.
 */
const TrailingSlashRedirect = () => {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (pathname.length > 1 && pathname.endsWith("/")) {
      const cleaned = pathname.replace(/\/+$/, "") || "/";
      navigate(`${cleaned}${search}${hash}`, { replace: true });
    }
  }, [pathname, search, hash, navigate]);

  return null;
};

export default TrailingSlashRedirect;
