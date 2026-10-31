import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Facebook, Instagram, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { SOCIAL_PROFILES } from '@/lib/socialGrowth';

export function SocialFollow({ dismissible = false }: { dismissible?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return <section aria-label="Urmărește RealTrust și ApArt Hotel" className="relative border-y border-border py-5 space-y-3">
    {dismissible && <Button variant="ghost" size="icon" className="absolute right-0 top-1 min-h-12 min-w-12" aria-label="Închide invitația de urmărire" onClick={() => setDismissed(true)}><X className="h-4 w-4" /></Button>}
    <p className={dismissible ? 'pr-12 text-sm text-foreground' : 'text-sm text-foreground'}>Urmărește-ne pe Instagram & Facebook pentru analize lunare ale pieței imobiliare din Timișoara și cazări de top.</p>
    <div className="flex flex-wrap gap-2">{(['instagram','facebook'] as const).map(platform => <Button key={platform} asChild variant="outline" className="min-h-12"><a href={SOCIAL_PROFILES[platform]} target="_blank" rel="noopener noreferrer">{platform === 'instagram' ? <Instagram className="h-4 w-4 mr-2"/> : <Facebook className="h-4 w-4 mr-2"/>}Follow {platform === 'instagram' ? 'Instagram' : 'Facebook'}</a></Button>)}</div>
  </section>;
}

export function SocialPreview() {
  const { data: posts = [] } = useQuery({ queryKey: ['public-social-preview'], staleTime: 300000, queryFn: async () => {
    const { data, error } = await supabase.rpc('public_social_preview');
    if (error) throw error;
    return data ?? [];
  }});
  return <div className="space-y-3"><p className="text-sm font-semibold text-foreground">RealTrust & ApArt Hotel · Social</p>
    <div className="grid grid-cols-3 gap-2">{posts.map(post => <a key={post.id} href={post.posted_to.includes('instagram') ? SOCIAL_PROFILES.instagram : SOCIAL_PROFILES.facebook} target="_blank" rel="noopener noreferrer" title={post.title} className="min-h-12 overflow-hidden rounded-md border border-border"><img src={post.image_url} alt={post.title} loading="lazy" className="aspect-square w-full object-cover"/><p className="line-clamp-2 p-1 text-xs text-muted-foreground">{post.title}</p></a>)}</div>
    <SocialFollow />
  </div>;
}
