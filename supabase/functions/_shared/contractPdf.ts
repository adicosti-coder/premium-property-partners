// Generates the signed-contract PDF (pdf-lib) and stores it in the private
// `owner-contracts` bucket. Called right after the owner accepts the terms.
//
// StandardFonts use WinAnsi encoding, which cannot render Romanian diacritics,
// so all text is transliterated before being drawn.
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const BUCKET = "owner-contracts";

const DIACRITICS: Record<string, string> = {
  ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t",
  Ă: "A", Â: "A", Î: "I", Ș: "S", Ş: "S", Ț: "T", Ţ: "T",
};

export const ascii = (value: unknown): string =>
  String(value ?? "")
    .replace(/[ăâîșşțţĂÂÎȘŞȚŢ]/g, (c) => DIACRITICS[c] ?? c)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "");

export interface ContractPdfInput {
  id: string;
  owner_name: string;
  owner_email: string | null;
  owner_tax_id: string | null;
  owner_address: string | null;
  property_address: string | null;
  management_fee_percent: number | null;
  onboarding_fee_cents: number | null;
  photo_session_included: boolean | null;
  photo_session_fee_cents: number | null;
  currency: string | null;
  line_items: { label: string; amount_cents: number }[] | null;
  contract_body?: string | null;
  signature_name: string | null;
  signature_ip: string | null;
  signed_at: string | null;
}

const money = (cents: number, currency: string) =>
  `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

export function contractTotalCents(c: ContractPdfInput): number {
  const items = c.line_items ?? [];
  if (items.length) return items.reduce((s, i) => s + (i.amount_cents ?? 0), 0);
  return (c.onboarding_fee_cents ?? 0) +
    (c.photo_session_included ? (c.photo_session_fee_cents ?? 0) : 0);
}

export function contractLineItems(c: ContractPdfInput): { label: string; amount_cents: number }[] {
  if (c.line_items?.length) return c.line_items;
  const items = [{ label: "Taxa de onboarding", amount_cents: c.onboarding_fee_cents ?? 0 }];
  if (c.photo_session_included) {
    items.push({ label: "Sedinta foto profesionala", amount_cents: c.photo_session_fee_cents ?? 0 });
  }
  return items;
}

/** Builds the PDF bytes for a signed contract. */
export async function buildContractPdf(c: ContractPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const gold = rgb(0.83, 0.69, 0.22);
  const navy = rgb(0.1, 0.21, 0.36);
  const grey = rgb(0.35, 0.37, 0.4);

  const margin = 56;
  let page = doc.addPage([595.28, 841.89]); // A4
  let { width, height } = page.getSize();
  let y = height - margin;

  const ensure = (space: number) => {
    if (y - space < margin + 40) {
      page = doc.addPage([595.28, 841.89]);
      ({ width, height } = page.getSize());
      y = height - margin;
    }
  };

  const text = (
    value: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number } = {},
  ) => {
    const size = opts.size ?? 10;
    const f = opts.bold ? bold : font;
    const maxWidth = width - margin * 2;
    const words = ascii(value).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(candidate, size) > maxWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    if (!lines.length) lines.push("");
    for (const l of lines) {
      ensure(size + 6);
      page.drawText(l, { x: margin, y, size, font: f, color: opts.color ?? rgb(0.12, 0.12, 0.12) });
      y -= size + 4;
    }
    y -= opts.gap ?? 0;
  };

  const row = (label: string, value: string) => {
    ensure(16);
    page.drawText(ascii(label), { x: margin, y, size: 10, font: bold, color: navy });
    page.drawText(ascii(value), { x: margin + 170, y, size: 10, font, color: rgb(0.12, 0.12, 0.12) });
    y -= 16;
  };

  // Header band
  page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: navy });
  page.drawRectangle({ x: 0, y: height - 100, width, height: 4, color: gold });
  page.drawText("CONTRACT DE ADMINISTRARE", {
    x: margin, y: height - 52, size: 18, font: bold, color: rgb(1, 1, 1),
  });
  page.drawText("RealTrust Timisoara  ·  realtrust.ro  ·  info@realtrust.ro", {
    x: margin, y: height - 74, size: 9, font, color: rgb(0.85, 0.87, 0.9),
  });
  y = height - 130;

  const currency = c.currency ?? "ron";
  row("Numar contract:", c.id.slice(0, 8).toUpperCase());
  row("Data semnarii:", c.signed_at ? new Date(c.signed_at).toLocaleString("ro-RO") : "-");
  y -= 8;

  text("1. Parti contractante", { size: 12, bold: true, color: navy, gap: 4 });
  row("Proprietar:", c.owner_name);
  row("CNP / CUI:", c.owner_tax_id ?? "-");
  row("Adresa proprietar:", c.owner_address ?? "-");
  row("Email:", c.owner_email ?? "-");
  row("Administrator:", "RealTrust Timisoara");
  y -= 8;

  text("2. Obiectul contractului", { size: 12, bold: true, color: navy, gap: 4 });
  row("Adresa proprietatii:", c.property_address ?? "-");
  row("Comision administrare:", `${c.management_fee_percent ?? 20}% din incasari`);
  row("Sedinta foto:", c.photo_session_included ? "Inclusa (facturata separat)" : "Neinclusa");
  y -= 8;

  text("3. Sume datorate la semnare", { size: 12, bold: true, color: navy, gap: 4 });
  for (const item of contractLineItems(c)) {
    row(`- ${item.label}`, money(item.amount_cents ?? 0, currency));
  }
  row("TOTAL:", money(contractTotalCents(c), currency));
  y -= 8;

  if (c.contract_body) {
    text("4. Clauze contractuale", { size: 12, bold: true, color: navy, gap: 4 });
    for (const paragraph of String(c.contract_body).split(/\n{1,}/)) {
      if (paragraph.trim()) text(paragraph.trim(), { size: 9.5, color: grey, gap: 2 });
    }
    y -= 6;
  }

  ensure(90);
  text("5. Semnatura electronica", { size: 12, bold: true, color: navy, gap: 4 });
  row("Semnat de:", c.signature_name ?? c.owner_name);
  row("Confirmat prin:", "cod OTP transmis pe email");
  row("Timestamp semnatura:", c.signed_at ? new Date(c.signed_at).toISOString() : "-");
  row("Adresa IP:", c.signature_ip ?? "-");

  // Footer on every page
  const pages = doc.getPages();
  pages.forEach((p, index) => {
    const size = p.getSize();
    p.drawRectangle({ x: 0, y: 0, width: size.width, height: 3, color: gold });
    p.drawText(
      ascii(`RealTrust Timisoara · Contract ${c.id.slice(0, 8).toUpperCase()} · pagina ${index + 1}/${pages.length}`),
      { x: margin, y: 12, size: 8, font, color: grey },
    );
  });

  return await doc.save();
}

/**
 * Generates the PDF, uploads it to the private bucket and persists the path
 * on the contract row. Never throws — signing must not fail because of the PDF.
 */
export async function generateAndStoreContractPdf(
  contract: ContractPdfInput,
  admin: SupabaseClient,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  try {
    const bytes = await buildContractPdf(contract);
    const path = `${contract.id}/contract-semnat-${Date.now()}.pdf`;
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (error) throw error;

    await admin
      .from("owner_contracts")
      .update({ contract_pdf_path: path, contract_pdf_generated_at: new Date().toISOString() })
      .eq("id", contract.id);

    return { ok: true, path };
  } catch (err) {
    console.error("contractPdf: generation failed:", (err as Error)?.message);
    return { ok: false, error: (err as Error)?.message };
  }
}
