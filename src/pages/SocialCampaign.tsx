import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { campaignTarget } from '@/lib/socialGrowth';
import { Button } from '@/components/ui/button';

export default function SocialCampaign() {
  const { slug } = useParams();
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!slug || !/^[a-z0-9-]{4,40}$/.test(slug)) { setError(true); return; }
      const { data, error } = await supabase.rpc('resolve_social_campaign', { p_slug: slug });
      if (cancelled) return;
      const row = data?.[0];
      const target = row ? campaignTarget(row.destination, row.platform, row.campaign) : null;
      if (error || !target) { setError(true); return; }
      window.location.replace(target);
    }
    void resolve().catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [slug]);
  return <main className="min-h-screen flex flex-col justify-center items-center gap-5 px-6"><Helmet><title>RealTrust · Link de campanie</title><meta name="robots" content="noindex, nofollow" /></Helmet><p role="status">{error ? 'Linkul nu este disponibil sau a fost dezactivat.' : 'Se deschide pagina…'}</p>{error && <Button asChild variant="outline"><Link to="/">Înapoi la RealTrust</Link></Button>}</main>;
}
