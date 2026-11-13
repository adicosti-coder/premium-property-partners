import { useSyncExternalStore } from "react";
import { isTranslatedStaticPath, normalizeSeoPath } from "./seoLanguagePolicy";

/**
 * Which routes currently have a real English version. Pages declare it
 * (e.g. a blog article once its translation is loaded); the prerendered HTML
 * seeds the first route through `<html data-en-path>` so the canonical does
 * not flip while data loads.
 */
const declared = new Map<string, boolean>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export function declareEnglishVersion(pathname: string, available: boolean): void {
  const path = normalizeSeoPath(pathname);
  if (declared.get(path) === available) return;
  declared.set(path, available);
  notify();
}

export function isEnglishVersionAvailable(pathname: string): boolean {
  const path = normalizeSeoPath(pathname);
  // Static pages declared translated are English-capable from the first render.
  if (isTranslatedStaticPath(path)) return true;
  const value = declared.get(path);
  if (value !== undefined) return value;
  if (typeof document === "undefined") return false;
  const seeded = document.documentElement.getAttribute("data-en-path");
  return seeded !== null && normalizeSeoPath(seeded) === path;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEnglishVersionAvailable(pathname: string): boolean {
  return useSyncExternalStore(subscribe, () => isEnglishVersionAvailable(pathname), () => false);
}

/** Test helper. */
export function resetEnglishVersions(): void {
  declared.clear();
  notify();
}
