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
            return `<noscript><link rel="stylesheet" href="${href}"></noscript>`;
          },
        );

      if (moduleScripts.length > 0) {
        const bootstrap = buildDeferredBootstrap(cssHrefs, moduleScripts.map(({ src, crossorigin }) => ({ src, crossorigin })));
        transformed = transformed.replace("</body>", `${bootstrap}\n</body>`);
      }

      return transformed;
    },
  };
}

function buildDeferredBootstrap(
  cssHrefs: string[],
  scripts: Array<{ src: string; crossorigin: boolean }>,
): string {
  return `<script>
(function(){
  var loaded=false;
  var fallback=0;
  var css=${JSON.stringify(cssHrefs)};
  var scripts=${JSON.stringify(scripts)};
  var events=['pointerdown','touchstart','keydown','scroll'];
  function cleanup(){events.forEach(function(e){document.removeEventListener(e,load,{capture:true});});if(fallback)clearTimeout(fallback);}
  function load(){
    if(loaded)return;loaded=true;cleanup();
    css.forEach(function(href){var l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l);});
    scripts.forEach(function(item){var s=document.createElement('script');s.type='module';s.src=item.src;if(item.crossorigin)s.crossOrigin='';document.body.appendChild(s);});
  }
  events.forEach(function(e){document.addEventListener(e,load,{once:true,passive:true,capture:true});});
  // Kick off CSS+JS hydration as soon as the browser is idle after first paint.
  // We do NOT wait for user interaction — Lighthouse / search crawlers never
  // interact, and the LCP element lives inside the React-rendered Hero, so
  // delaying React mount inflates LCP and Speed Index dramatically.
  function schedule(){
    if('requestIdleCallback' in window){
      requestIdleCallback(load,{timeout:1200});
    } else {
      setTimeout(load,200);
    }
  }
  if(document.readyState==='complete'||document.readyState==='interactive'){
    schedule();
  } else {
    window.addEventListener('DOMContentLoaded',schedule,{once:true});
  }
  // Hard safety fallback (was 8000ms — caused LCP=3.3s on Lighthouse mobile).
  fallback=setTimeout(load,1500);
})();
</script>`;
}
