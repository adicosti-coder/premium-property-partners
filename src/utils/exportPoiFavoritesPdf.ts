import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";

interface POI {
  id: string;
  name: string;
  name_en: string;
  category: string;
  description: string | null;
  description_en: string | null;
  address: string | null;
  rating: number | null;
}

interface ExportOptions {
  title: string;
  pois: POI[];
  language: "ro" | "en";
  labels: {
    category: string;
    address: string;
    rating: string;
    generatedOn: string;
    noDescription: string;
  };
  categoryLabels: Record<string, string>;
}

export const exportPoiFavoritesPdf = ({ title, pois, language, labels, categoryLabels }: ExportOptions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  const date = new Date().toLocaleDateString(language === "ro" ? "ro-RO" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`${labels.generatedOn}: ${date}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 20;

  doc.setTextColor(0, 0, 0);

  // POIs
  pois.forEach((poi, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    const name = language === "ro" ? poi.name : poi.name_en;
    const description = language === "ro" ? poi.description : poi.description_en;
    const categoryLabel = categoryLabels[poi.category] || poi.category;

    // POI name
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${name}`, margin, yPosition);
    yPosition += 7;

    // Category and rating
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let infoLine = `${labels.category}: ${categoryLabel}`;
    if (poi.rating) {
      infoLine += ` | ${labels.rating}: ${poi.rating} ⭐`;
    }
    doc.text(infoLine, margin, yPosition);
    yPosition += 6;

    // Address
    if (poi.address) {
      doc.text(`${labels.address}: ${poi.address}`, margin, yPosition);
      yPosition += 6;
    }

    // Description
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const descText = description || labels.noDescription;
    const splitDescription = doc.splitTextToSize(descText, pageWidth - 2 * margin);
    doc.text(splitDescription, margin, yPosition);
    yPosition += splitDescription.length * 4 + 8;

    doc.setTextColor(0, 0, 0);

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition - 4, pageWidth - margin, yPosition - 4);
  });

  // Save the PDF
  const fileName = `city-guide-favorites-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};

// Generate a short random code
const generateShareCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create shareable link and save to database (for authenticated users)
export const createShareableLink = async (favoriteIds: string[], userId?: string): Promise<{ link: string; shareCode: string | null }> => {
  const baseUrl = window.location.origin;
  
  // If user is authenticated, save to database for tracking
  if (userId && favoriteIds.length > 0) {
    const shareCode = generateShareCode();
    
    const { error } = await supabase
      .from('shared_poi_links')
      .insert({
        share_code: shareCode,
        user_id: userId,
        poi_ids: favoriteIds,
      });
    
    if (!error) {
      return {
        link: `${baseUrl}/?share=${shareCode}`,
        shareCode,
      };
    }
    console.error('Error saving share link:', error);
  }
  
  // Fallback to encoded IDs (for non-authenticated users or if save fails)
  const encodedIds = btoa(JSON.stringify(favoriteIds));
  return {
    link: `${baseUrl}/?shared_pois=${encodedIds}`,
    shareCode: null,
  };
};

// Legacy function for backward compatibility
export const generateShareableLink = (favoriteIds: string[]): string => {
  const baseUrl = window.location.origin;
  const encodedIds = btoa(JSON.stringify(favoriteIds));
  return `${baseUrl}/?shared_pois=${encodedIds}`;
};

// Parse shared POI IDs from URL (handles both new share codes and legacy encoded IDs)
export const parseSharedPois = async (searchParams: URLSearchParams): Promise<{ poiIds: string[] | null; shareCode: string | null }> => {
  // Check for new share code format
  const shareCode = searchParams.get('share');
  if (shareCode) {
    const { data, error } = await supabase
      .from('shared_poi_links')
      .select('poi_ids')
      .eq('share_code', shareCode)
      .single();
    
    if (!error && data?.poi_ids) {
      return { poiIds: data.poi_ids, shareCode };
    }
  }
  
  // Fallback to legacy encoded format
  const sharedParam = searchParams.get('shared_pois');
  if (!sharedParam) return { poiIds: null, shareCode: null };
  
  try {
    const decoded = atob(sharedParam);
    const ids = JSON.parse(decoded);
    if (Array.isArray(ids) && ids.every(id => typeof id === 'string')) {
      return { poiIds: ids, shareCode: null };
    }
    return { poiIds: null, shareCode: null };
  } catch {
    return { poiIds: null, shareCode: null };
  };
};

// Notify the original sharer that someone imported their favorites
export const notifyPoiImport = async (shareCode: string, importerName?: string, importedCount?: number): Promise<void> => {
  try {
    await supabase.functions.invoke('notify-poi-import', {
      body: {
        shareCode,
        importerName,
        importedCount,
      },
    });
  } catch (error) {
    console.error('Error notifying POI import:', error);
  }
};
