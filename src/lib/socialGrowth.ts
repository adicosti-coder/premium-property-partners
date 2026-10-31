export const SOCIAL_PROFILES = {
  instagram: 'https://www.instagram.com/realtrust_timisoara',
  facebook: 'https://www.facebook.com/realtrust.ro',
} as const;
export const CAMPAIGN_DESTINATIONS = {
  owners_guide: { label: 'Ghidul Proprietarului din Timișoara', path: '/pentru-proprietari#ghid-proprietar' },
  calculator: { label: 'Calculator venit din închiriere', path: '/calculator-randament' },
  instagram: { label: 'Follow Instagram', path: SOCIAL_PROFILES.instagram },
  facebook: { label: 'Follow Facebook', path: SOCIAL_PROFILES.facebook },
  stay: { label: 'Cazări ApArt Hotel', path: '/cazare' },
} as const;
export type CampaignDestination = keyof typeof CAMPAIGN_DESTINATIONS;
export function campaignTarget(destination: string, platform: string, campaign: string): string | null {
  if (!(destination in CAMPAIGN_DESTINATIONS) || !['instagram', 'facebook', 'whatsapp'].includes(platform) || !/^[a-z0-9_-]{1,80}$/.test(campaign)) return null;
  const target = new URL(CAMPAIGN_DESTINATIONS[destination as CampaignDestination].path, 'https://realtrust.ro');
  target.searchParams.set('utm_source', platform);
  target.searchParams.set('utm_medium', 'social');
  target.searchParams.set('utm_campaign', campaign);
  return target.href;
}
