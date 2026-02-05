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
 * We embed NotoSans as a custom font family and transparently map any "helvetica"
 * usage to NotoSans, so the existing PDF generator doesn't need a huge refactor.
 */
export const ensureInvestorGuideFonts = async (doc: jsPDF) => {
  try {
    cachedRegularB64 ??= await loadFontBase64("/fonts/NotoSans-Regular.ttf");
    cachedBoldB64 ??= await loadFontBase64("/fonts/NotoSans-Bold.ttf");

    const anyDoc = doc as any;

    anyDoc.addFileToVFS("NotoSans-Regular.ttf", cachedRegularB64);
    anyDoc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");

    anyDoc.addFileToVFS("NotoSans-Bold.ttf", cachedBoldB64);
    anyDoc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");

    // jsPDF treats "helvetica" as a built-in font; overriding it is unreliable.
    // Instead, map calls to "helvetica" -> "NotoSans".
    const originalSetFont = (doc as any).setFont?.bind(doc);
    if (typeof originalSetFont === "function") {
      (doc as any).setFont = (fontName?: string, fontStyle?: string) => {
        const mappedName = fontName === "helvetica" ? "NotoSans" : fontName;
        return originalSetFont(mappedName, fontStyle);
      };
    }

    (doc as any).setFont?.("NotoSans", "normal");
  } catch (err) {
    // Fallback: keep built-in fonts (may render diacritics poorly)
    console.warn("ensureInvestorGuideFonts: falling back to default fonts", err);
  }
};
