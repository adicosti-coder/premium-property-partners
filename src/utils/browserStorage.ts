/**
 * SSR/build-safe access to browser-only APIs.
 *
 * In production publishing, parts of the app can be prerendered in a non-browser
 * environment where `window`, `document`, `localStorage`, etc. are undefined.
 */

export const isBrowser = (): boolean => typeof window !== "undefined";

export const safeLocalStorage = {
  getItem(key: string): string | null {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem(key: string): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// Session storage utilities
export const getSessionStorage = (key: string): string | null => {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setSessionStorage = (key: string, value: string): void => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

export const removeSessionStorage = (key: string): void => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
};
