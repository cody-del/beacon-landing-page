# Beacon Blinds landing page

Motorized-shades landing page for Beacon Blinds, with orange brand accents, Google and Facebook review badges, a customer-review carousel, an interactive Central Texas service-area map, and a consultation form.

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

The `beaconblindsland` project is connected to `main` in this repository. Netlify runs the mock-based form tests before publishing and bundles the serverless consultation function. The function checks request origin, body size, content type, and contact details before forwarding a valid lead to Beacon’s existing contact endpoint. Actual email delivery has not been verified with a live lead.
