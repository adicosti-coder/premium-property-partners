import type { jsPDF } from "jspdf";

let cachedRegularB64: string | null = null;
let cachedBoldB64: string | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
};

const loadFontBase64 = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load font: ${url} (${res.status})`);
  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
};

/**
 * Ensures Romanian diacritics (ȘȚĂÂÎ etc.) render correctly in jsPDF.
 * We register NotoSans under the existing "helvetica" family used in the generator,
 * so we don't need to refactor the whole PDF file.
 */
export const ensureInvestorGuideFonts = async (doc: jsPDF) => {
  try {
    cachedRegularB64 ??= await loadFontBase64("/fonts/NotoSans-Regular.ttf");
    cachedBoldB64 ??= await loadFontBase64("/fonts/NotoSans-Bold.ttf");

    const anyDoc = doc as any;
    anyDoc.addFileToVFS("NotoSans-Regular.ttf", cachedRegularB64);
    anyDoc.addFont("NotoSans-Regular.ttf", "helvetica", "normal");

    anyDoc.addFileToVFS("NotoSans-Bold.ttf", cachedBoldB64);
    anyDoc.addFont("NotoSans-Bold.ttf", "helvetica", "bold");

    doc.setFont("helvetica", "normal");
  } catch (err) {
    // Fallback: keep built-in fonts (may render diacritics poorly)
    console.warn("ensureInvestorGuideFonts: falling back to default fonts", err);
  }
};
