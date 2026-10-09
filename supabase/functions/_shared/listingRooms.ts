/** Source facts only: never count the living room as a bedroom. */
export function resolveListingBedrooms(rooms: unknown, description: string): number | null {
  const text = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const explicit = text.match(/\b(\d+|un|unu|doua|doi|trei|patru)\s+dormito(?:are|r)\b/);
  if (explicit && !/\b(?:nu(?:\s+are)?|fara)\s*$/.test(text.slice(Math.max(0, (explicit.index ?? 0) - 12), explicit.index))) {
    const words: Record<string, number> = { un: 1, unu: 1, doua: 2, doi: 2, trei: 3, patru: 4 };
    const count = words[explicit[1]] ?? Number(explicit[1]);
    if (count > 0 && count <= 20) return count;
  }
  const count = Number(rooms);
  return Number.isFinite(count) && count > 0 ? Math.max(1, Math.floor(count) - 1) : null;
}