/**
 * Builds a redirect target that keeps the current query string and hash.
 * Parameters already present on the target win over incoming ones.
 */
export function withPreservedQuery(to: string, search = "", hash = ""): string {
  const [pathAndQuery, targetHash] = to.split("#", 2);
  const [path, targetQuery = ""] = pathAndQuery.split("?", 2);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  new URLSearchParams(targetQuery).forEach((value, key) => params.set(key, value));
  const query = params.toString();
  const finalHash = targetHash !== undefined ? `#${targetHash}` : hash && hash !== "#" ? (hash.startsWith("#") ? hash : `#${hash}`) : "";
  return `${path}${query ? `?${query}` : ""}${finalHash}`;
}
