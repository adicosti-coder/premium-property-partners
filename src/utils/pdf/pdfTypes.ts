import type { jsPDF } from "jspdf";

export interface PdfContext {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  yPosition: number;
  isRo: boolean;
  imageCache: Map<string, string>;
  imageUrls: (string | null)[];
  supabaseUrl: string;
}

export interface PropertyRow {
  name: string;
  location: string;
  size: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  capacity: number | null;
  base_price_per_night: number | null;
  weekend_price_per_night: number | null;
  roi_percentage: string | null;
  estimated_revenue: string | null;
  tag: string;
  features: string[];
  booking_rating: number | null;
  booking_review_count: number | null;
  description_ro: string;
  description_en: string;
  listing_type: string | null;
  capital_necesar: number | null;
  slug: string | null;
  image_path: string | null;
  images: string[] | null;
}

// Color palette
export const COLORS = {
  black: [20, 20, 20] as const,
  anthracite: [45, 45, 48] as const,
  anthraciteLight: [60, 60, 65] as const,
  gold: [212, 175, 55] as const,
  goldDark: [180, 148, 45] as const,
  white: [255, 255, 255] as const,
  offWhite: [248, 248, 248] as const,
  lightGray: [230, 230, 230] as const,
  gray: [150, 150, 150] as const,
  darkGray: [100, 100, 100] as const,
  textPrimary: [30, 30, 30] as const,
  textSecondary: [80, 80, 80] as const,
  green: [34, 160, 55] as const,
  greenDark: [28, 120, 42] as const,
  red: [180, 60, 60] as const,
};
