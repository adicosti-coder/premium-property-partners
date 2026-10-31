const DEFAULT_PROFILES = {
 instagram: 'https://www.instagram.com/realtrust_timisoara',
 facebook: 'https://www.facebook.com/realtrust.ro',
};
function profile(value: string | undefined, host: string): string | null {
 try { const url = new URL(value ?? ''); return url.protocol === 'https:' && [host,`www.${host}`].includes(url.hostname) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function appendSocialFollow(message: string, profiles = DEFAULT_PROFILES): string {
 if (!message.trim() || message.includes('P.S. Vezi ultimele') || /\b(STOP|RETRAG)\b|acord.*public|public.*acord|nu vă vom mai|nu mai (?:scriem|contactăm)/i.test(message)) return message;
 const instagram = profile(profiles.instagram,'instagram.com');
 const facebook = profile(profiles.facebook,'facebook.com');
 if (!instagram && !facebook) return message;
 const ps = `P.S. Vezi ultimele noastre apartamente administrate și studiile de caz din Timișoara pe ${[instagram ? `Instagram: ${instagram}` : '',facebook ? `Facebook: ${facebook}` : ''].filter(Boolean).join(' și ')}`;
 const marker = 'Dacă nu doriți mesaje, răspundeți NU.';
 if (message.endsWith(marker)) return `${message.slice(0,-marker.length).trimEnd()}\n\n${ps}\n\n${marker}`;
 return `${message}\n\n${ps}`;
}
export function runtimeSocialProfiles() {
 const runtime = globalThis as typeof globalThis & { Deno?: { env: { get: (key: string) => string | undefined } } };
 return { instagram: runtime.Deno?.env.get('SOCIAL_INSTAGRAM_URL') ?? DEFAULT_PROFILES.instagram, facebook: runtime.Deno?.env.get('SOCIAL_FACEBOOK_URL') ?? DEFAULT_PROFILES.facebook };
}
