export interface SocialCaptionOptions {
  platform: "instagram" | "facebook";
  title?: string;
  type?: "blog" | "property";
  sourceUrl?: string;
  hashtags?: string;
  max?: number;
}

const URLS = /https?:\/\/[^\s<>]+|www\.[^\s<>]+/gi;
const TAGS = /#[\p{L}\p{N}_]+/gu;
const DEFAULT_TAGS = ["#RealTrust", "#Timișoara", "#ImobiliareTimișoara", "#ApartamenteTimișoara", "#ProprietatiTimisoara"];
const BLOG_TAGS = ["#RealTrust", "#Timișoara", "#GhidTimisoara", "#SfaturiUtile", "#BlogRealTrust"];
const compact = (text: string) => text.replace(/[ \t]+/g, " ").trim();

/** Used by previews, AI results and outbound channels; never adds property facts. */
export function formatSocialCaption(raw: string, options: SocialCaptionOptions): string {
  const extractedUrl = raw.match(URLS)?.[0]?.replace(/[.,;!?)]+$/, "") ?? "";
  const tags = [...(options.hashtags?.match(TAGS) ?? []), ...(raw.match(TAGS) ?? []),
    ...(options.type === "blog" ? BLOG_TAGS : DEFAULT_TAGS)];
  const seen = new Set<string>();
  const hashtags = tags.filter((tag) => {
    const key = tag.toLocaleLowerCase("ro");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8).join(" ");
  const cleaned = raw
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/gi, "$1")
    .replace(URLS, "").replace(TAGS, "")
    .split(/\n+/).map(compact)
    .filter((line) => line && !/^(?:🔗\s*|📥\s*)?(?:link[ -](?:în|in) bio|salvează postarea|detalii și toate pozele|citește (?:articolul|mai mult)|articol(?:ul)? complet|link(?:ul)?(?: articolului)?\s*:)/i.test(line));
  const rawTitle = options.title?.trim() || cleaned.shift() || "RealTrust";
  const titleText = compact(rawTitle.replace(URLS, "").replace(TAGS, ""));
  const title = /^\p{Extended_Pictographic}/u.test(titleText) ? titleText : `🔑 ${titleText}`;
  if (cleaned[0]?.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, "") === titleText.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, "")) cleaned.shift();
  let blocks = cleaned;
  if (blocks.length === 1) blocks = blocks[0].split(/(?<=[.!?])\s+(?=[\p{Lu}])/u);
  const paragraphs: string[] = [];
  const count = Math.min(3, blocks.length);
  for (let i = 0; i < count; i++) {
    paragraphs.push(blocks.slice(Math.floor(i * blocks.length / count), Math.floor((i + 1) * blocks.length / count)).join(" "));
  }
  const cta = options.platform === "instagram"
    ? options.type === "blog" ? "🔗 Link în Bio pentru articolul complet!" : "📥 Salvează postarea și accesează link-ul din profilul nostru!"
    : options.sourceUrl || extractedUrl;
  const suffix = [cta, hashtags].filter(Boolean).join("\n\n");
  const max = options.max ?? (options.platform === "instagram" ? 2200 : 63206);
  let content = [title, ...paragraphs].join("\n\n");
  const room = Math.max(0, max - suffix.length - 2);
  if (content.length > room) {
    const cut = content.slice(0, Math.max(0, room - 1));
    const boundary = cut.lastIndexOf(" ");
    content = `${(boundary > cut.length * 0.7 ? cut.slice(0, boundary) : cut).trim()}…`;
  }
  return [content, suffix].filter(Boolean).join("\n\n");
}