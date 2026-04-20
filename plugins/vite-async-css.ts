import type { Plugin } from "vite";

/**
 * Converts the auto-injected <link rel="stylesheet"> tag into an async preload
 * pattern so it doesn't block first paint. The inline critical CSS already
 * present in <head> covers the above-the-fold hero shell, eliminating FOUC.
 *
 * Pattern:
 *   <link rel="preload" as="style" href="..." onload="this.rel='stylesheet'">
 *   <noscript><link rel="stylesheet" href="..."></noscript>
 *
 * Only runs in production builds.
 */
export default function viteAsyncCss(): Plugin {
  return {
    name: "vite-async-css",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"(?:\s+crossorigin)?\s+href="([^"]+\.css)"\s*\/?>(?!<\/noscript>)/g,
        (_match, href) =>
          `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
          `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
      );
    },
  };
}
