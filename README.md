# Beacon Blinds landing page

Motorized-shades landing page for Beacon Blinds, with orange brand accents, Google and Facebook review badges, a customer-review carousel, an interactive Central Texas service-area map, and a consultation form.

The installation gallery uses eleven photos in a looping carousel with a large center image, smaller side images, orange arrows, photo selectors, keyboard navigation, touch swiping, and reduced-motion support.

## Run locally

Requires Node.js 20 or newer. No package installation is needed.

```sh
cd motorized-shades
node server.mjs
```

Open http://127.0.0.1:4318/.

## Validate

```sh
node --test motorized-shades/consultation.test.mjs motorized-shades/consultation-http.test.mjs
python3 motorized-shades/scripts/build-service-boundary.py
```

Form tests use mock requests and do not send a live lead.

## Project layout

- `motorized-shades/dist/`: page, styles, browser scripts, images, fonts, and Leaflet map assets.
- `motorized-shades/server.mjs`: local preview server and consultation API route.
- `motorized-shades/consultation.mjs`: validated forwarding to Beacon's contact endpoint.
- `motorized-shades/content/`: transcribed customer reviews.
- `motorized-shades/scripts/`: reproducible service-area boundary generation.

See [project notes](motorized-shades/README.md) for asset sources and implementation details. Netlify publishes `motorized-shades/dist` using the root `netlify.toml` and runs the consultation backend through `netlify/functions/consultation.mjs` at `/api/consultation`. The Node server remains available for local preview. The preview currently uses `noindex,nofollow`.

## Netlify

The `beaconblindsland` project is connected to `main` in this repository. Netlify runs the mock-based form tests before publishing and bundles the serverless consultation function. The function checks request origin, body size, content type, and contact details before forwarding a valid lead to Beacon’s existing contact endpoint. Each forwarded lead declares `campaignTag: "google_landing_page"`, which becomes the GoHighLevel tag on the contact — without it this traffic reaches the CRM as `direct`, because the main site reads attribution from a browser cookie that a server-to-server post cannot carry. This repository owns that name: `cody-del/beacon-blinds-rebuild` validates the shape (lowercase slug, 2-40 characters) and passes it through verbatim, so renaming the campaign is a change here alone. GoHighLevel matches tags literally, so the string written here is exactly what the CRM workflows must filter on. A live test lead sent on September 29, 2026 was accepted by both this function and Beacon's contact endpoint. Its arrival in GoHighLevel has not been confirmed yet.

## Tracking

The page carries Beacon's Google Ads tag (`AW-16673765845`). It reports the "SS - Submit Lead Form" conversion after a confirmed submission, and the "Phone Call" conversion against the page's number, (830) 364-4591. That number is Beacon's call-tracking number for this landing page only, not the main site's (512) 930-1188. If the displayed number changes, the `phone_conversion_number` in `dist/index.html` must change with it. See [project notes](motorized-shades/README.md#google-ads-tracking) for details.
