import { Facebook, Linkedin, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface FloatingShareRailProps {
  url: string;
  title: string;
}

/**
 * Vertical, sticky social share rail shown only on lg+ desktops.
 * Mobile uses the inline SocialShareButtons in the article header/footer.
 */
const FloatingShareRail = ({ url, title }: FloatingShareRailProps) => {
  const { language } = useLanguage();
  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

  const open = (href: string) =>
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=520");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: language === "ro" ? "Link copiat!" : "Link copied!",
      });
    } catch {
      /* noop */
    }
  };

  const baseBtn =
    "w-10 h-10 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-white transition-colors";

  return (
    <aside
      className="hidden lg:flex fixed left-4 xl:left-8 top-1/2 -translate-y-1/2 z-40 flex-col gap-2.5"
      aria-label={language === "ro" ? "Distribuie articolul" : "Share article"}
    >
      <button
        onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encUrl}`)}
        className={`${baseBtn} hover:bg-[#1877F2] hover:border-[#1877F2]`}
        aria-label="Share on Facebook"
      >
        <Facebook className="w-4 h-4" />
      </button>
      <button
        onClick={() => open(`https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`)}
        className={`${baseBtn} hover:bg-[#0A66C2] hover:border-[#0A66C2]`}
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </button>
      <button
        onClick={() => open(`https://wa.me/?text=${encTitle}%20${encUrl}`)}
        className={`${baseBtn} hover:bg-whatsapp hover:border-whatsapp`}
        aria-label="Share on WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </button>
      <button
        onClick={copy}
        className={`${baseBtn} hover:bg-primary hover:border-primary`}
        aria-label={language === "ro" ? "Copiază link" : "Copy link"}
      >
        <Link2 className="w-4 h-4" />
      </button>
    </aside>
  );
};

export default FloatingShareRail;
