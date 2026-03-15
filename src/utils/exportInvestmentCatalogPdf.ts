import { supabase } from "@/lib/supabaseClient";
import { drawCoverPage } from "@/utils/pdf/sections/coverPage";
import { drawWhyTimisoaraPage } from "@/utils/pdf/sections/whyTimisoaraPage";
import { drawPropertiesPages } from "@/utils/pdf/sections/propertiesPages";
import { drawFinancialPage } from "@/utils/pdf/sections/financialPage";
import { drawCtaPage } from "@/utils/pdf/sections/ctaPage";
import type { PdfContext, PropertyRow } from "@/utils/pdf/pdfTypes";

interface ExportOptions {
  language?: "ro" | "en";
  returnBlob?: boolean;
}

export const exportInvestmentCatalogPdf = async ({ language = "ro", returnBlob = false }: ExportOptions = {}): Promise<Blob | void> => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  await (await import("@/utils/pdf/ensureInvestorGuideFonts")).ensureInvestorGuideFonts(doc);

  // Fetch properties from DB (include image_path and images)
  const { data: properties } = await supabase
    .from("properties")
    .select("name, location, size, bedrooms, bathrooms, capacity, base_price_per_night, weekend_price_per_night, roi_percentage, estimated_revenue, tag, features, booking_rating, booking_review_count, description_ro, description_en, listing_type, capital_necesar, slug, image_path, images")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const allProps = (properties ?? []) as PropertyRow[];
  const saleProperties = allProps.filter(p => p.listing_type === "vanzare" || p.listing_type === "investitie");
  const rentalProperties = allProps.filter(p => p.listing_type === "cazare" || p.listing_type === "inchiriere");

  // Preload property images as base64
  const imageCache = new Map<string, string>();
  const loadImage = async (url: string): Promise<string | null> => {
    if (imageCache.has(url)) return imageCache.get(url)!;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          imageCache.set(url, b64);
          resolve(b64);
        };
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // Preload all images in parallel
  const supabaseUrl = "https://mvzssjyzbwccioqvhjpo.supabase.co";
  const imageUrls = allProps.map(p => {
    if (p.image_path) {
      if (p.image_path.startsWith("http")) return p.image_path;
      return `${supabaseUrl}/storage/v1/object/public/property-images/${p.image_path}`;
    }
    if (p.images && p.images.length > 0) {
      const img = p.images[0];
      if (img.startsWith("http")) return img;
      return `${supabaseUrl}/storage/v1/object/public/property-images/${img}`;
    }
    return null;
  });

  await Promise.all(imageUrls.filter(Boolean).map(url => loadImage(url!)));

  const ctx: PdfContext = {
    doc,
    pageWidth,
    pageHeight,
    margin: 18,
    contentWidth: pageWidth - 36,
    yPosition: 20,
    isRo: language === "ro",
    imageCache,
    imageUrls,
    supabaseUrl,
  };

  // ========== BUILD PDF ==========
  drawCoverPage(ctx, saleProperties, rentalProperties);
  drawWhyTimisoaraPage(ctx);
  
  if (saleProperties.length > 0) {
    drawPropertiesPages(ctx, saleProperties, "sale");
  }
  if (rentalProperties.length > 0) {
    drawPropertiesPages(ctx, rentalProperties, "rental");
  }

  drawFinancialPage(ctx);
  drawCtaPage(ctx);

  if (returnBlob) {
    return doc.output("blob");
  }

  const fileName = ctx.isRo
    ? "catalog-investitii-timisoara-2026.pdf"
    : "investment-catalog-timisoara-2026.pdf";
  doc.save(fileName);
};
