import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Hosting serves `/assets/*` with `Cache-Control: immutable, max-age=1y`, but
 * everything copied verbatim from `public/` gets a short-lived cache entry.
 *
 * Fonts and the hero image are referenced from the static critical CSS inside
 * index.html, so Vite never fingerprints them. This plugin copies them into
 * `dist/assets/` under a content-hashed name and rewrites every reference in
 * the emitted HTML/CSS/JS, so repeat visits hit the long-lived cache bucket.
 *
 * Originals stay in place (absolute social-preview URLs keep working).
 */
const TARGETS = [
  "fonts/Inter-Regular.woff2",
  "fonts/Inter-SemiBold.woff2",
  "fonts/PlayfairDisplay-SemiBold-latin.woff2",
  "fonts/PlayfairDisplay-SemiBold-latin-ext.woff2",
  "fonts/NotoSans-Regular.woff2",
  "fonts/NotoSans-Bold.woff2",
  "images/hero-optimized-800w.webp",
  "images/hero-cinematic-1600w.webp",
];

const REWRITABLE = new Set([".html", ".css", ".js"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (REWRITABLE.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

export default function viteHashStaticAssets(): Plugin {
  return {
    name: "vite-hash-static-assets",
    apply: "build",
    closeBundle: {
      order: "post",
      sequential: true,
      handler() {
        const dist = path.resolve(process.cwd(), "dist");
        if (!fs.existsSync(dist)) return;
        const assetsDir = path.join(dist, "assets");
        fs.mkdirSync(assetsDir, { recursive: true });

        const map = new Map<string, string>();
        for (const rel of TARGETS) {
          const source = path.join(dist, rel);
          if (!fs.existsSync(source)) continue;
          const buf = fs.readFileSync(source);
          const hash = createHash("sha256").update(buf).digest("hex").slice(0, 8);
          const ext = path.extname(rel);
          const base = path.basename(rel, ext);
          const hashedName = `${base}-${hash}${ext}`;
          fs.writeFileSync(path.join(assetsDir, hashedName), buf);
          map.set(`/${rel}`, `/assets/${hashedName}`);
        }
        if (map.size === 0) return;

        for (const file of walk(dist)) {
          const original = fs.readFileSync(file, "utf8");
          let next = original;
          for (const [from, to] of map) {
            // Only rewrite root-relative references (skip absolute
            // https://realtrust.ro/... social-preview URLs).
            next = next.split(`"${from}`).join(`"${to}`);
            next = next.split(`'${from}`).join(`'${to}`);
            next = next.split(`(${from}`).join(`(${to}`);
            next = next.split(` ${from} `).join(` ${to} `);
          }
          if (next !== original) fs.writeFileSync(file, next);
        }
      },
    },
  };
}
