module.exports = {
  ci: {
    collect: {
      // Static build output produced by `bun run build`.
      staticDistDir: "./dist",
      url: [
        "http://localhost/index.html",
        "http://localhost/imobiliare.html",
        "http://localhost/investitii.html",
      ],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      // Mobile-first performance budget. Targets reflect the audit goal:
      // LCP 1.3–1.8s, Speed Index 3–4s, overall score 90+.
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["warn", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.95 }],

        "largest-contentful-paint": ["error", { maxNumericValue: 1800 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 1500 }],
        "speed-index": ["error", { maxNumericValue: 4000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        "interactive": ["warn", { maxNumericValue: 3500 }],

        // Byte budgets — keep payload tight on mobile networks.
        "total-byte-weight": ["warn", { maxNumericValue: 600000 }],
        "unused-javascript": ["warn", { maxNumericValue: 120000 }],
        "unused-css-rules": ["warn", { maxNumericValue: 40000 }],

        // Render-path hygiene.
        "render-blocking-resources": ["warn", { maxNumericValue: 0 }],
        "uses-long-cache-ttl": "off",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
