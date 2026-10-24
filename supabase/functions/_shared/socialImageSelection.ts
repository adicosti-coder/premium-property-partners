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
export function instagramFrame(width: number, height: number, story = false) {
  const w = 1080, h = story ? 1920 : height > width ? 1350 : 1080;
  const scale = Math.min(w / width, h / height);
  const iw = Math.max(1, Math.round(width * scale)), ih = Math.max(1, Math.round(height * scale));
  return { width: w, height: h, imageWidth: iw, imageHeight: ih, x: Math.floor((w - iw) / 2), y: Math.floor((h - ih) / 2) };
}
/** Meta Graph: feed 4:5–1.91:1 (we only emit 1:1 / 4:5), Story 9:16; min 320px wide, max 1440. Prevents error 36003. */
export function metaAspectError(width: number, height: number, story = false): string | null {
  if (!width || !height) return "Dimensiuni imagine necunoscute";
  if (width < 320 || width > 1440) return `Lățime nepermisă de Meta (${width}px)`;
  const r = width / height;
  const ok = story ? Math.abs(r - 9 / 16) < 0.01 : Math.abs(r - 1) < 0.01 || Math.abs(r - 0.8) < 0.01;
  return ok ? null : `Raport ${width}×${height} nepermis (${story ? "Story cere 9:16" : "Feed cere 1:1 sau 4:5"})`;
}
