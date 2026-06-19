import type { Plugin } from "vite";

/**
 * Inject the generated CSS via native `<link rel="preload" as="style" onload>`
 * inside <head> so the preload-scanner discovers it BEFORE rendering body —
 * this avoids the 2.1s LCP render-delay caused by the previous JS-driven
 * idle hydration (Lighthouse mobile was waiting for requestIdleCallback to
 * inject styles before declaring LCP).
 *
 * Module scripts stay at the end of <body> so they never block the static
 * shell from painting.
 */
export default function viteAsyncCss(): Plugin {
  return {
    name: "vite-async-css",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      const cssHrefs: string[] = [];
      const moduleScripts = Array.from(
        html.matchAll(/<script\s+type="module"([^>]*)\s+src="([^"]+)"([^>]*)><\/script>/g),
        ([match, beforeSrc, src, afterSrc]) => ({
          match,
          src,
          crossorigin: /\scrossorigin(?:=|\s|>|$)/.test(`${beforeSrc} ${afterSrc}`),
        }),
      );

      let transformed = html
        .replace(/<script\s+type="module"[^>]*><\/script>\s*/g, "")
        .replace(
          /<link rel="stylesheet"(?:\s+crossorigin)?\s+href="([^"]+\.css)"\s*\/?>/g,
          (_match, href) => {
            cssHrefs.push(href);
            return "";
          },
        );

      // Inject CSS preloads in <head> using the native async pattern.
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

      // Module scripts at end of body — async by default, never blocks paint.
      if (moduleScripts.length > 0) {
        const scriptTags = moduleScripts
          .map(({ src, crossorigin }) =>
            `<script type="module" src="${src}"${crossorigin ? " crossorigin" : ""}></script>`,
          )
          .join("");
        transformed = transformed.replace("</body>", `${scriptTags}</body>`);
      }

      return transformed;
    },
  };
}
