# Project Architecture Rules

- Keep the homepage hero LCP image sets strictly separated by mobile/desktop media queries so high-DPR phones never fetch desktop assets.
- Start the decorative desktop hero video only after genuine user interaction so the responsive image remains the stable LCP candidate.- Listing/contact pages ship a static #route-shell heading (prerender plugin) removed on first React H1 (max 3s) so real-user FCP/LCP don't wait for the JS bundle.
