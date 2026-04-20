import type { Plugin } from "vite";

/**
 * Makes Vite's stylesheet injection fully non-blocking and pushes hydration
 * scripts to the end of <body> so the static shell paints first.
 */
export default function viteAsyncCss(): Plugin {
  return {
    name: "vite-async-css",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      const moduleScripts = html.match(/<script\s+type="module"[^>]*><\/script>/g) ?? [];

      let transformed = html
        .replace(/<script\s+type="module"[^>]*><\/script>\s*/g, "")
        .replace(
          /<link rel="stylesheet"(?:\s+crossorigin)?\s+href="([^"]+\.css)"\s*\/?>/g,
          (_match, href) =>
            `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'">` +
            `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
        );

      if (moduleScripts.length > 0) {
        transformed = transformed.replace("</body>", `${moduleScripts.join("\n")}\n</body>`);
      }

      return transformed;
    },
  };
}
