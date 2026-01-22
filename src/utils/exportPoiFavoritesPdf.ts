import { jsPDF } from "jspdf";

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

// Generate shareable link with encoded favorite IDs
export const generateShareableLink = (favoriteIds: string[]): string => {
  const baseUrl = window.location.origin;
  const encodedIds = btoa(JSON.stringify(favoriteIds));
  return `${baseUrl}/?shared_pois=${encodedIds}`;
};

// Parse shared POI IDs from URL
export const parseSharedPois = (searchParams: URLSearchParams): string[] | null => {
  const sharedParam = searchParams.get('shared_pois');
  if (!sharedParam) return null;
  
  try {
    const decoded = atob(sharedParam);
    const ids = JSON.parse(decoded);
    if (Array.isArray(ids) && ids.every(id => typeof id === 'string')) {
      return ids;
    }
    return null;
  } catch {
    return null;
  }
};
