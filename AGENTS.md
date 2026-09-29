# Project Architecture Rules

- Keep the homepage hero LCP image sets strictly separated by mobile/desktop media queries so high-DPR phones never fetch desktop assets.
- Start the decorative desktop hero video only after genuine user interaction so the responsive image remains the stable LCP candidate.