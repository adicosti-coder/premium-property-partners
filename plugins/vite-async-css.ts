import type { Plugin } from "vite";

/**
 * Convert Vite's render-blocking `<link rel="stylesheet">` into the native
 * preload-swap pattern so CSS never blocks the first paint, and move
 * module scripts to the end of <body>.
 *
 * Uses `transformIndexHtml.order = 'post'` so this runs AFTER Vite's
 * internal CSS-injection hook (otherwise the stylesheet tag is re-added).
 */
export default function viteAsyncCss(): Plugin {
  return {
    name: "vite-async-css",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const cssHrefs: string[] = [];
        const moduleScripts: { src: string; crossorigin: boolean }[] = [];

        // Capture & strip module script tags (any attr order).
        let transformed = html.replace(
          /<script\b([^>]*\btype="module"[^>]*)><\/script>\s*/g,
          (match, attrs) => {
            const srcMatch = attrs.match(/\bsrc="([^"]+)"/);
            if (!srcMatch) return match;
            moduleScripts.push({
              src: srcMatch[1],
              crossorigin: /\bcrossorigin\b/.test(attrs),
            });
            return "";
          },
        );

        // Capture & strip stylesheet link tags (any attr order).
        transformed = transformed.replace(
          /<link\b([^>]*\brel="stylesheet"[^>]*)\s*\/?>/g,
          (match, attrs) => {
            const hrefMatch = attrs.match(/\bhref="([^"]+\.css)"/);
            if (!hrefMatch) return match;
            cssHrefs.push(hrefMatch[1]);
            return "";
          },
        );

        if (cssHrefs.length > 0) {
          const cssTags = cssHrefs
            .map(
              (href) =>
                `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
                `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
            )
            .join("");
          transformed = transformed.replace("</head>", `${cssTags}</head>`);
        }

        if (moduleScripts.length > 0) {
          const scriptTags = moduleScripts
            .map(
              ({ src, crossorigin }) =>
                `<script type="module" src="${src}"${crossorigin ? " crossorigin" : ""}></script>`,
            )
            .join("");
          transformed = transformed.replace("</body>", `${scriptTags}</body>`);
        }

        return transformed;
      },
    },
  };
}
