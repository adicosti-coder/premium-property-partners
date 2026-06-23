/**
 * Local persistent log of prospect-scan sessions.
 * Stored in localStorage so admins keep a visible history across reloads
 * without polluting the database.
 */
import jsPDF from "jspdf";

const KEY = "prospect_scan_history_v1";
const MAX_ENTRIES = 50;

export type ScanHistoryStatus = "completed" | "failed" | "simulated";

export interface ScanHistoryEntry {
  id: string;
  started_at: string;          // ISO
  ended_at: string;            // ISO
  duration_ms: number;
  mode: "scan" | "rescan" | "simulated";
  status: ScanHistoryStatus;
  query_limit: number;
  total_queries: number;
  processed_queries: number;
  batches_total: number;
  batches_done: number;
  new_listings: number;
  duplicate_skipped: number;
  blacklisted_skipped: number;
  error_message?: string | null;
  error_details?: string | null;
}

function safeRead(): ScanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function getScanHistory(): ScanHistoryEntry[] {
  return safeRead();
}

export function appendScanHistory(entry: Omit<ScanHistoryEntry, "id">): ScanHistoryEntry {
  const withId: ScanHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  const next = [withId, ...safeRead()].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota — silently ignore */
  }
  return withId;
}

export function clearScanHistory(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

/**
 * Generate a printable PDF summary of the last scan session(s).
 */
export function exportScanReportPdf(
  current: ScanHistoryEntry | null,
  history: ScanHistoryEntry[],
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Raport Scanare Prospecți — RealTrust", M, y);
  y += 22;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110);
  doc.text(`Generat: ${new Date().toLocaleString("ro-RO")}`, M, y);
  y += 20;
  doc.setTextColor(0);

  const session = current ?? history[0] ?? null;
  if (session) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Sesiune curentă", M, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const rows: [string, string][] = [
      ["Mod", session.mode + (session.status === "simulated" ? " (simulat)" : "")],
      ["Status", session.status],
      ["Început", new Date(session.started_at).toLocaleString("ro-RO")],
      ["Sfârșit", new Date(session.ended_at).toLocaleString("ro-RO")],
      ["Durată", fmtDuration(session.duration_ms)],
      ["Limită pachet", `${session.query_limit} kw`],
      ["Cuvinte procesate", `${session.processed_queries} / ${session.total_queries}`],
      ["Loturi (×25)", `${session.batches_done} / ${session.batches_total} finalizate`],
      ["Prospecți noi", String(session.new_listings)],
      ["Duplicate ignorate", String(session.duplicate_skipped)],
      ["Anti-spam blocate", String(session.blacklisted_skipped)],
    ];
    if (session.error_message) rows.push(["Eroare", session.error_message]);

    rows.forEach(([k, v]) => {
      doc.setTextColor(110);
      doc.text(k, M, y);
      doc.setTextColor(0);
      doc.text(String(v), M + 150, y, { maxWidth: W - M - 150 });
      y += 14;
    });

    if (session.error_details) {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Detalii tehnice eroare:", M, y);
      y += 12;
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(session.error_details, W - M * 2);
      doc.text(lines, M, y);
      y += lines.length * 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
    }
    y += 10;
  }

  if (history.length > 0) {
    if (y > 700) { doc.addPage(); y = M; }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Istoric (ultimele ${Math.min(history.length, 20)})`, M, y);
    y += 16;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const cols = [
      { x: M,        label: "Data" },
      { x: M + 110,  label: "Mod" },
      { x: M + 165,  label: "Status" },
      { x: M + 225,  label: "Procesate" },
      { x: M + 295,  label: "Loturi" },
      { x: M + 355,  label: "Noi" },
      { x: M + 395,  label: "Dup." },
      { x: M + 435,  label: "Durată" },
    ];
    doc.setFont("helvetica", "bold");
    cols.forEach((c) => doc.text(c.label, c.x, y));
    y += 12;
    doc.setFont("helvetica", "normal");

    history.slice(0, 20).forEach((e) => {
      if (y > 800) { doc.addPage(); y = M; }
      doc.text(new Date(e.started_at).toLocaleString("ro-RO"), cols[0].x, y);
      doc.text(e.mode, cols[1].x, y);
      doc.text(e.status, cols[2].x, y);
      doc.text(`${e.processed_queries}/${e.total_queries}`, cols[3].x, y);
      doc.text(`${e.batches_done}/${e.batches_total}`, cols[4].x, y);
      doc.text(String(e.new_listings), cols[5].x, y);
      doc.text(String(e.duplicate_skipped), cols[6].x, y);
      doc.text(fmtDuration(e.duration_ms), cols[7].x, y);
      y += 12;
    });
  }

  const filename = `raport-scanare-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`;
  doc.save(filename);
}
