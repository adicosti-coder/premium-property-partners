# Project Architecture Rules

- Keep the homepage hero LCP image sets strictly separated by mobile/desktop media queries so high-DPR phones never fetch desktop assets.
- Start the decorative desktop hero video only after genuine user interaction so the responsive image remains the stable LCP candidate.- Listing/contact pages ship a static #route-shell heading (prerender plugin) removed on first React H1 (max 3s) so real-user FCP/LCP don't wait for the JS bundle.
- WhatsApp first-contact templates always use the Meta-approved resolver (v6 → v5 → v3), never an environment override; outbound stops for DNC/STOP or any prior inbound interaction.
- Client qualification derives its saved zone and next step from WhatsApp history, never asks the zone twice, and keeps owner handover logic separate.
- Owner-consent queue messages resolve their dedicated template against Meta's approved Romanian body at send time; use the existing intro resolver until approval so inspection templates never reach owners.
