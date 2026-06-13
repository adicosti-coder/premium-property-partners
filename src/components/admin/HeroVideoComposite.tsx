import HeroVideoManager from "@/components/admin/HeroVideoManager";
import HeroTextManager from "@/components/admin/HeroTextManager";

/**
 * Compozit pentru tab-ul „Hero Video & Text".
 * Extras într-un fișier dedicat ca să permită lazy-loading printr-un singur chunk.
 */
export default function HeroVideoComposite() {
  return (
    <div className="space-y-6">
      <HeroVideoManager />
      <HeroTextManager />
    </div>
  );
}
