/**
 * Vite plugin: transformă <link rel="stylesheet"> injectat de Vite la build
 * în async preload (preload + onload swap), eliminând render-blocking.
 *
 * Lighthouse insight: "Render blocking requests" — index.css blochează FCP/LCP
 * cu ~320 ms. Acest plugin face CSS-ul să nu mai blocheze pagina.
 *
 * Fallback <noscript> garantează stilurile pentru utilizatorii fără JS.
 */
import type { Plugin } from "vite";

export default function viteAsyncCss(): Plugin {
  return {
    name: "vite-async-css",
    apply: "build",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        // Match: <link rel="stylesheet" crossorigin href="/assets/index-XXX.css">
        const linkRegex =
          /<link\s+rel="stylesheet"([^>]*?)href="([^"]+\.css)"([^>]*)>/gi;

        const noscriptFallbacks: string[] = [];

        const transformed = html.replace(linkRegex, (_match, before, href, after) => {
          // Preserve other attributes (crossorigin, type, etc.)
          const attrs = `${before}${after}`.replace(/\s+/g, " ").trim();
          noscriptFallbacks.push(
            `<link rel="stylesheet" ${attrs} href="${href}">`,
          );
          return (
            `<link rel="preload" as="style" ${attrs} href="${href}" ` +
            `onload="this.onload=null;this.rel='stylesheet'">`
          );
        });

        if (noscriptFallbacks.length === 0) return html;

        // Append <noscript> fallback right before </head>
        const noscriptBlock = `<noscript>${noscriptFallbacks.join("")}</noscript>`;
        return transformed.replace("</head>", `${noscriptBlock}</head>`);
      },
    },
  };
}
