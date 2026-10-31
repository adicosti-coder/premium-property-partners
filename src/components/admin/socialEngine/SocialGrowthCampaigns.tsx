import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Link as LinkIcon, Loader2, Plus, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { CAMPAIGN_DESTINATIONS, campaignTarget } from '@/lib/socialGrowth';
import { toast } from 'sonner';

export default function SocialGrowthCampaigns() {
 const client = useQueryClient();
 const [title,setTitle]=useState('Descarcă Ghidul Proprietarului din Timișoara');
 const [destination,setDestination]=useState('owners_guide');
 const [platform,setPlatform]=useState('instagram');
 const [campaign,setCampaign]=useState('ghid_proprietar');
 const [busy,setBusy]=useState(false);
 const {data: links = [],isLoading,error}=useQuery({queryKey:['social-campaign-links'],queryFn:async()=>{
  const {data,error}=await supabase.from('social_campaign_links').select('*').order('created_at',{ascending:false}).limit(50);if(error)throw error;return data??[];
 }});
 const create=async()=>{
  if(title.trim().length<2||title.trim().length>120||!campaignTarget(destination,platform,campaign)){toast.error('Completează titlul și un nume de campanie cu litere mici, cifre, - sau _.');return;}
  setBusy(true);
  try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Autentifică-te din nou.');
   const {error}=await supabase.from('social_campaign_links').insert({title:title.trim(),destination,platform,campaign,created_by:user.id});if(error)throw error;
   await client.invalidateQueries({queryKey:['social-campaign-links']});toast.success('Linkul de campanie a fost creat.');
  }catch(e){toast.error(e instanceof Error?e.message:'Nu am putut crea linkul.');}finally{setBusy(false);}
 };
 const toggle=async(id:string,active:boolean)=>{const {error}=await supabase.from('social_campaign_links').update({active:!active}).eq('id',id);if(error){toast.error(error.message);return;}await client.invalidateQueries({queryKey:['social-campaign-links']});};
 return <section className="space-y-6 py-5"><h2 className="text-xl font-semibold">Social Growth & Campaign Links</h2>
  <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="sg-title">Îndemn Follow / Engagement</Label><Input id="sg-title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></div><div className="space-y-2"><Label htmlFor="sg-campaign">Campanie</Label><Input id="sg-campaign" value={campaign} onChange={e=>setCampaign(e.target.value)} maxLength={80}/></div>
   <div className="space-y-2"><Label>Destinație</Label><Select value={destination} onValueChange={setDestination}><SelectTrigger aria-label="Destinație campanie"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(CAMPAIGN_DESTINATIONS).map(([key,value])=><SelectItem key={key} value={key}>{value.label}</SelectItem>)}</SelectContent></Select></div>
   <div className="space-y-2"><Label>Platformă</Label><Select value={platform} onValueChange={setPlatform}><SelectTrigger aria-label="Platformă campanie"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="facebook">Facebook</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent></Select></div>
  </div><Button onClick={create} disabled={busy} className="min-h-12">{busy?<Loader2 className="h-4 w-4 mr-2 animate-spin"/>:<Plus className="h-4 w-4 mr-2"/>}Generează link scurt</Button>
  {isLoading&&<p role="status">Se încarcă linkurile…</p>}{error&&<p role="alert" className="text-destructive">Nu putem încărca linkurile. Verifică accesul Admin.</p>}
  <div className="divide-y divide-border">{links.map(link=><div key={link.id} className="flex flex-wrap items-center gap-3 py-4"><LinkIcon className="h-4 w-4 text-primary"/><div className="min-w-0 flex-1"><p className="font-medium break-words">{link.title}</p><p className="text-xs text-muted-foreground break-all">https://realtrust.ro/s/{link.slug} · {link.platform}{!link.active?' · Inactiv':''}</p></div><Button variant="outline" size="icon" className="min-h-12 min-w-12" title="Copiază mesajul și linkul" aria-label="Copiază mesajul și linkul" onClick={async()=>{try{await navigator.clipboard.writeText(`${link.title}\nhttps://realtrust.ro/s/${link.slug}`);toast.success('Mesaj și link copiate.');}catch{toast.error('Copierea nu este disponibilă.');}}}><Copy className="h-4 w-4"/></Button><Button variant="ghost" size="icon" className="min-h-12 min-w-12" aria-label={link.active?'Dezactivează linkul':'Activează linkul'} title={link.active?'Dezactivează linkul':'Activează linkul'} onClick={()=>toggle(link.id,link.active)}><Power className="h-4 w-4"/></Button></div>)}</div>
 </section>;
}
