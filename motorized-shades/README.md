# Beacon Blinds — Motorized Shades

Standalone responsive landing page in `dist/`. Start the preview and form backend with `node server.mjs` (Node 20+).

Uses Beacon Blinds' existing logo, photography, phone number, service areas, and orange accents. The inline consultation form submits through the local `/api/consultation` route to Beacon’s existing `https://beaconblinds.com/api/contact/` endpoint. It includes server validation, a honeypot, optional SMS consent, and confirmed-success handling. Hosting this page requires porting that server route or hosting the page on Beacon’s own site with its contact endpoint; static-only hosting cannot deliver submissions. The review rating and excerpt were taken from Beacon's homepage on September 21, 2026; recheck before launching advertising.

Preview is marked noindex. Remove that directive only when the final page is approved for indexing. No change has been made to beaconblinds.com.

## Verification

`node --test consultation.test.mjs` checks validation, routing, consent, and rejection handling with an injected mock transport. No live test lead was sent to Beacon; actual delivery remains unverified.

## Asset sources

- Website: https://beaconblinds.com/
- Logo: https://pub-3a548384bf414e35a2afbd74ba7be033.r2.dev/images/beacon-blinds-logo-new_b5ee72f1.png
- Hero: https://pub-3a548384bf414e35a2afbd74ba7be033.r2.dev/images/beacon-hero-motorized-shades-3AYZkvDCfiaBxyGeQvkzBu.webp
- Dining room: https://pub-3a548384bf414e35a2afbd74ba7be033.r2.dev/images/hero-motorized-Qa5TWTET2He36AFjyXGCKc.webp
- Consultation background: https://pub-3a548384bf414e35a2afbd74ba7be033.r2.dev/images/job-motorized-shades-1_a9ddb3a2.jpg
- Fonts: Inter and Poppins, matching the other landing pages, from Google Fonts.
- Layout and shared styles: adapted directly from The Shutter Factory motorized-shades landing page.

## Review carousel

Six unique five-star Beacon Blinds reviews were transcribed from user-supplied screenshots on September 22, 2026. The Beautiful Blinds and Shades screenshot supplied the layout reference only. Valerie Robinson’s two screenshots are one review. Full text is preserved in `content/reviews.json` and the page markup. Reviews are manually maintained; the carousel does not fetch live Google reviews. Cards use initial avatars, responsive horizontal scrolling, arrow controls, and accessible native dialogs for full reviews.

## Service-area map

Leaflet map with one orange approximate outline encompassing the supplied ZIP areas and Austin city. Community list, zoom controls, reset view, mobile layout, and a fallback are included. Geographic references and the reproducible boundary method are recorded in `dist/assets/map/SOURCES.md`. Run `python3 scripts/build-service-boundary.py` to rebuild and validate the envelope against the stored reference geometry.
