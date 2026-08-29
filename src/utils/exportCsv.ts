/**
 * Minimal, dependency-free CSV export helper used by the admin panels.
 * Values are escaped for Excel/Sheets and the file is prefixed with a BOM so
 * Romanian diacritics survive in Excel.
 */

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "boolean" ? (value ? "da" : "nu") : String(value);
  // Neutralise formula injection (=, +, -, @ at the start of a cell)
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
};

export function buildCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))].join(
    "\r\n",
  );
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const blob = new Blob(["\uFEFF" + buildCsv(headers, rows)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** `poi-recenzii-2026-08-29.csv` */
export const csvFileName = (prefix: string): string =>
  `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
