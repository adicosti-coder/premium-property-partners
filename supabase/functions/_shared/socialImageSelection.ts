const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function socialImageTopic(title: string): string | null {
  const t = normalize(title);
  if (/tax|fiscal|anaf|impozit|legislati|e.factur|dac7/.test(t)) return "taxes";
  if (/smart.?lock|check.?in|self.?check|acces digital|incuiet|pms/.test(t)) return "smart-lock";
  if (/financ|randament|\broi\b|cash.?flow|invest|raport|kpi|buget/.test(t)) return "finance";
  return null;
}
export function usableSocialImage(raw: unknown, title: string, type: string): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim(), "https://realtrust.ro");
    if (u.protocol !== "https:") return null;
    const p = normalize(decodeURIComponent(u.pathname));
    if (/placeholder|no[-_]?image|default[-_]?image|favicon|(?:^|[\/_-])logo|hero-|og-default|og-image|social-preview/.test(p) || /\.svg$/.test(p)) return null;
    if (type === "blog" && ["taxes", "finance"].includes(socialImageTopic(title) || "") && /smart.?lock|check.?in|chei|lacat|security-deposit/.test(p)) return null;
    return u.href;
  } catch { return null; }
}
export function selectSocialImage(title: string, type: string, candidates: unknown[], markdown = ""): string | null {
  const contentImages = [...markdown.slice(0, 6000).matchAll(/!\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)].map(m => m[1]);
  for (const raw of [...candidates.flat(), ...contentImages]) {
    const image = usableSocialImage(raw, title, type);
    if (image) return image;
  }
  return null;
}
export function instagramFrame(width: number, height: number) {
  const w = 1080, h = height > width ? 1350 : 1080;
  const scale = Math.min(w / width, h / height);
  const iw = Math.max(1, Math.round(width * scale)), ih = Math.max(1, Math.round(height * scale));
  return { width: w, height: h, imageWidth: iw, imageHeight: ih, x: Math.floor((w - iw) / 2), y: Math.floor((h - ih) / 2) };
}
