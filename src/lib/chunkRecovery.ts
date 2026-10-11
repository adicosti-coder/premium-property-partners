const RETRY_WINDOW_MS = 60_000;
const STORAGE_KEY = "realtrust:chunk-recovery";

export function isChunkLoadError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading (?:CSS )?chunk|error loading dynamically imported module/i.test(error.message);
}

/** One refresh per URL/minute; blocked storage and offline mode fail safely. */
export function reserveChunkReload(
  storage: Pick<Storage, "getItem" | "setItem">,
  url: string,
  online: boolean,
  now = Date.now(),
): boolean {
  if (!online) return false;
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) {
      const previous = JSON.parse(saved) as { url?: string; at?: number };
      if (previous.url === url && typeof previous.at === "number" && now - previous.at < RETRY_WINDOW_MS) {
        return false;
      }
    }
    storage.setItem(STORAGE_KEY, JSON.stringify({ url, at: now }));
    return true;
  } catch {
    return false;
  }
}