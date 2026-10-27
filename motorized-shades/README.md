# Beacon Blinds — Motorized Shades

Standalone responsive landing page in `dist/`. Start the preview and form backend with `node server.mjs` (Node 20+).

The exterior-shades version is at `/exterior-shades/` (`dist/exterior-shades/index.html`). It shares the original design, reviews, map, and form scripts, with outdoor copy and no gallery. Its hero uses the client-supplied `20260701_083222.mp4`, a 15.7-second poolside exterior-shade clip, optimized as `beacon-exterior-hero.mp4` with audio removed and fast-start enabled. A frame from the same clip is the fallback poster. The shared video controls respect reduced motion and data saving. The mobile crop favors the left patio shades. The feature section uses the real outdoor-kitchen photo. The motorized page remains at `/`.

Exterior form requests include `product: exterior-shades`. The server maps this to `Solar & Exterior Shades`, `/exterior-shades/`, and `Exterior shades landing page consultation`; absent product values retain the existing motorized routing. Both pages use the same Beacon Ads conversion actions and the `google_landing_page` GHL tag.

Uses Beacon Blinds' existing logo, photography, service areas, and orange accents. The phone number shown, (830) 364-4591, is Beacon's call-tracking number for this landing page only. It is deliberately different from the main site's (512) 930-1188; do not change it to match. The inline consultation form submits through the local `/api/consultation` route, which creates the lead directly in Beacon's GoHighLevel location (see **GoHighLevel leads** below). It includes server validation, a honeypot, a per-visitor rate limit, and confirmed-success handling. The optional SMS consent checkbox was removed, so every submission sends `smsConsent: false`. Netlify hosting is configured in the repository-root `netlify.toml`; `netlify/functions/consultation.mjs` provides the same endpoint in production. Static-only hosting without that function cannot deliver submissions. The review rating and excerpt were taken from Beacon's homepage on September 21, 2026; recheck before launching advertising.

Preview is marked noindex. Remove that directive only when the final page is approved for indexing. Until October 2026 leads went through beaconblinds.com's contact endpoint, which accepts a `campaignTag` field for this page (`cody-del/beacon-blinds-rebuild` PR #51). This page no longer uses it.

## GoHighLevel leads

`consultation.mjs` sends each lead straight to GHL with the site's `GHL_PRIVATE_TOKEN` (a private integration in Beacon's sub-account with contact read and write access) and `GHL_LOCATION_ID` (`EcOn99KjgnFoU6yoY4FT`). Both are Netlify environment variables. Without them the form tells visitors to call. For each lead it:

1. upserts the contact (name, email, phone, and source `Beacon Blinds Website - <form name>`, unchanged from when beaconblinds.com created these contacts);
2. adds the tags `beacon-blinds`, `service-motorized-smart-home` or `service-solar-exterior-shades`, `sms-consent-no`, and `google_landing_page`. GHL's follow-up workflow triggers on `google_landing_page`. These leads deliberately do not get beaconblinds.com's `website-lead` tag. The tags are added in their own request so that a returning contact keeps its existing tags;
3. adds a note with the service, request, SMS consent, source page, form, and campaign.

The visitor sees success only after GHL returns a contact id and accepts the tags. A failed note is logged but not reported, because the lead is already in GHL.

## Google Ads tracking

The page reports to Beacon's Google Ads account, `AW-16673765845`. Lead-form conversions use the same conversion action as beaconblinds.com. That site's browser-side conversion never runs for leads from here, because they reach it server to server.

- **Google tag:** in the `<head>` of `dist/index.html`. The script loads and configures `AW-16673765845`.
- **Lead form:** "SS - Submit Lead Form" (`AW-16673765845/cNjoCN3wx8EcENXz1Y4-`), fired from `dist/form.js` only after `/api/consultation` returns `success: true`. The email address is lowercased, trimmed, and SHA-256 hashed in the browser, then sent as enhanced-conversion `user_data`. Only the email is sent, never the phone number, matching the main site. If the tag is blocked or missing, nothing is sent and the form works as before.
- **Phone calls:** `AW-16673765845/4h04CM2734sdENXz1Y4-` (the "Call ((830) 364-4591)" action, created September 30, 2026), configured in the `<head>` with `phone_conversion_number: '(830) 364-4591'`. For visitors who arrive from a Google ad, Google swaps in a forwarding number by matching that exact string in the page text. The forwarding number then rings through to the 830 tracking number. The snippet supplied for the main site uses (512) 930-1188, which never appears on this page. If the displayed number ever changes, change this value in the same commit, character for character, or calls stop being tracked.

Installed September 29, 2026. On September 30 the phone-call snippet was switched to `AW-726943250/uOLuCP666IsdEJKM0doC`. That ID is the Naples Shutter account (its call actions use other labels), so from then on calls from this page counted in neither account, and Beacon's own call action recorded nothing. It was pointed back at Beacon's action on October 13, 2026. `tracking.test.mjs` fails if another account's ID returns. A conversion reaching Google Ads has not been observed yet.

## GA4

Both pages also send to beaconblinds.com's GA4 property, `G-L2T4RG7EZ1`, so paid traffic, engagement and leads show up there. The `gtag('config', 'G-L2T4RG7EZ1')` in each page's head runs only when the hostname is `go.beaconblinds.com`, so deploy previews, branch deploys and local copies send it nothing. An accepted lead also sends one `generate_lead` to GA4 only (`send_to`, `form_name`, `source_page`, the main site's parameters), before the enhanced-conversion `user_data` is set and from the same host only. A filled honeypot is refused by `/api/consultation`, so it sends nothing. `tracking.test.mjs` pins both.

## Verification

`node --test consultation.test.mjs consultation-http.test.mjs tracking.test.mjs` checks validation, the GHL requests and tags, consent, origin, rate limiting, and rejection handling with an injected mock transport. `tracking.test.mjs` pins the Google tag, both conversion labels, the call-tracking number, and that only Beacon's account appears on the page. Netlify runs the same tests before every deploy.

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
