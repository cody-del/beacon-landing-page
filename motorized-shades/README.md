# Beacon Blinds — Motorized Shades

Standalone responsive landing page in `dist/`. Start the preview and form backend with `node server.mjs` (Node 20+).

Uses Beacon Blinds' existing logo, photography, service areas, and orange accents. The phone number shown, (830) 364-4591, is Beacon's call-tracking number for this landing page only. It is deliberately different from the main site's (512) 930-1188; do not change it to match. The inline consultation form submits through the local `/api/consultation` route to Beacon’s existing `https://beaconblinds.com/api/contact/` endpoint. It includes server validation, a honeypot, and confirmed-success handling. The optional SMS consent checkbox was removed, so every submission sends `smsConsent: false`. Netlify hosting is configured in the repository-root `netlify.toml`; `netlify/functions/consultation.mjs` provides the same endpoint in production. Static-only hosting without that function cannot deliver submissions. The review rating and excerpt were taken from Beacon's homepage on September 21, 2026; recheck before launching advertising.

Preview is marked noindex. Remove that directive only when the final page is approved for indexing. The only change made to beaconblinds.com for this page is that its contact endpoint accepts the `campaignTag` field this page sends (`cody-del/beacon-blinds-rebuild` PR #51).

## Google Ads tracking

The page reports to two Google Ads accounts. Lead-form conversions go to Beacon's account `AW-16673765845`, the same account and conversion action as beaconblinds.com. That site's browser-side conversion never runs for leads from here, because they reach it server to server. Phone-call conversions go to `AW-726943250`.

- **Google tag:** in the `<head>` of `dist/index.html`. The script loads and configures `AW-16673765845`. `AW-726943250` appears only in the phone-call snippet beneath it.
- **Lead form:** "SS - Submit Lead Form" (`AW-16673765845/cNjoCN3wx8EcENXz1Y4-`), fired from `dist/form.js` only after `/api/consultation` returns `success: true`. The email address is lowercased, trimmed, and SHA-256 hashed in the browser, then sent as enhanced-conversion `user_data`. Only the email is sent, never the phone number, matching the main site. If the tag is blocked or missing, nothing is sent and the form works as before.
- **Phone calls:** `AW-726943250/uOLuCP666IsdEJKM0doC`, configured in the `<head>` with `phone_conversion_number: '(830) 364-4591'`. For visitors who arrive from a Google ad, Google swaps in a forwarding number by matching that exact string in the page text. The forwarding number then rings through to the 830 tracking number. The snippet supplied for the main site uses (512) 930-1188, which never appears on this page. If the displayed number ever changes, change this value in the same commit, character for character, or calls stop being tracked.

Installed September 29, 2026. The phone-call conversion moved from `AW-16673765845/r_O1CPaQrcEcENXz1Y4-` to `AW-726943250` on September 30, 2026. A conversion reaching Google Ads has not been observed yet.

## Verification

`node --test consultation.test.mjs consultation-http.test.mjs` checks validation, routing, consent, origin, and rejection handling with an injected mock transport. Netlify runs the same tests before every deploy.

One live test lead was sent on September 29, 2026, before the Google tag was installed, so it recorded no conversion. It used the name "TEST LP Claude 2026-09-29", an `example.com` address, and a 555 phone number. Both this page's function and beaconblinds.com's endpoint returned success. Its arrival and `google_landing_page` tag in GoHighLevel have not been checked yet; delete the contact once they have.

## Asset sources

- Website: https://beaconblinds.com/
- Logo: https://pub-3a548384bf414e35a2afbd74ba7be033.r2.dev/images/beacon-blinds-logo-new_b5ee72f1.png
- Hero: `dist/assets/beacon-shades-hero.mp4`, a silent 24-second, 1280×720 H.264 montage of four client-supplied installation videos from October 6, 2026. Crossfades connect the rooms and wrap into the opening shot. The poster is a frame from this edit. `hero-video.js` respects reduced motion and data saving, pauses outside the viewport, and provides a play/pause button. The former generated hero photo is no longer displayed. Source and edit details: `content/hero-video-sources.json`.
- Motorization experts section: `dist/assets/beacon-project-high-rise-closed-shades.webp`, a real client-supplied dining-room photograph from the October 6 ZIP (source `48963b4e-3e11-4d5d-9abe-efde47bdb19b~1.jpg`).
- Consultation background: https://pub-3a548384bf414e35a2afbd74ba7be033.r2.dev/images/job-motorized-shades-1_a9ddb3a2.jpg
- Fonts: Inter and Poppins, matching the other landing pages, self-hosted as `dist/assets/*.ttf`. The page makes no Google Fonts request.
- Layout and shared styles: adapted directly from The Shutter Factory motorized-shades landing page.

## Review carousel

Six unique five-star Beacon Blinds reviews were transcribed from user-supplied screenshots on September 22, 2026. The Beautiful Blinds and Shades screenshot supplied the layout reference only. Valerie Robinson’s two screenshots are one review. Full text is preserved in `content/reviews.json` and the page markup. Reviews are manually maintained; the carousel does not fetch live Google reviews. Cards use initial avatars, responsive horizontal scrolling, arrow controls, and accessible native dialogs for full reviews.

## Service-area map

Leaflet map with one orange approximate outline matching the user-supplied service-area map. Community list, zoom controls, reset view, mobile layout, and a fallback are included. Geographic references and the reproducible boundary method are recorded in `dist/assets/map/SOURCES.md`. Run `python3 scripts/build-service-boundary.py` to rebuild and validate the outline from its stored screenshot trace.

The five gallery project photographs were supplied by the user on September 22, 2026. Copies are stored as `dist/assets/beacon-gallery-*.jpg`; original files are unchanged.

The gallery also includes three additional photos from the website’s [Recent Jobs gallery](https://beaconblinds.com/recent-jobs/), alongside the five original client photos. Three website photos were already present and are not duplicated. Optimized copies are stored as `dist/assets/beacon-website-*`. Source URLs are recorded in `content/gallery-sources.json`. The website’s video is not included in the photo carousel.

The Santa Rita Ranch “Modern Shutters” photo was removed from the landing-page gallery at the user’s request.

Six more client-supplied photos from `drive-download-20261006T184431Z-1-001.zip` were added on October 6, 2026, bringing the carousel to fourteen photos after the removals below. These are optimized, orientation-corrected 1600px WebP copies; originals are unchanged. The same archive contained four unique video clips and two duplicate copies, used for the hero montage.

The Silhouette home-office photo and the plantation-shutter installation photo were removed from the carousel on October 6, 2026 at the user’s request. Their source details are retained under `excluded_assets` in the gallery manifest.

Consultation CTAs and the existing `#consultation` sitelink target a wrapper around the form and its success state. On mobile, the compact form uses side-by-side name fields and full-width phone/email fields so the complete default card fits a 375×667 viewport. Native anchor navigation preserves keyboard use, browser history, and reduced-motion preferences.

The photo of an installer fitting a blind beneath an arched window was also removed from the carousel on October 6, 2026 at the user’s request.
