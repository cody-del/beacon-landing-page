# Beacon Blinds service-area map

The user supplied the main service communities and ZIP codes on September 22, 2026, and explicitly requested Austin as well. The map draws one orange outer envelope, with no internal ZIP-code borders. It is illustrative coverage, not a promise of service at every individual address. The adjacent caption identifies the boundary as approximate.

## Supplied communities

Austin (whole city); Horseshoe Bay (78654, 78657); Marble Falls (78654, 78657); Kingsland (78639); Burnet (78611); Jonestown (78645); Leander (78645, 78646, 78641); Liberty Hill (78642); Cedar Park (78613); Georgetown (78626, 78628, 78633); Spicewood (78669); Lakeway (78734, 78738).

## Current outline: user-supplied reference map

On September 22, 2026, the user supplied “Screenshot 2026-09-22 at 2.35.33 PM.png” and asked to match its outline while keeping it orange. This supersedes the original convex envelope of Census ZIP boundaries.

`content/service-area-outline.json` stores a manual trace in the 1526 × 1482 reference image's pixel coordinates. Four visible city labels anchor an unrotated Web Mercator fit. City-label positions are approximate, so the map retains its approximate-coverage caption. The script `scripts/build-service-boundary.py` converts the trace to longitude/latitude, checks the ring for self-intersections, and writes the GeoJSON with counterclockwise winding.

Geographic anchor references, retrieved September 22, 2026:
- Marble Falls: https://maps.apple.com/place?auid=16688004959670472475
- Georgetown: https://maps.apple.com/place?auid=3563600831153405583
- Austin: https://maps.apple.com/place?auid=11018610862491969006
- Buda: https://maps.apple.com/place?auid=18217975772247405617

The shape follows the supplied screenshot rather than exact ZIP or city boundaries. The orange stroke, light fill, zoom controls, reset view, and community list are retained.

## Earlier geographic references (retained for provenance)

The stored `zip-reference.geojson` and `austin-reference.geojson` came from the U.S. Census Bureau on September 22, 2026. They supported the earlier envelope and no longer drive the current outline:
- ZIP Code Tabulation Areas: https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1
- Austin city, GEOID 4805000: https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4

Basemap: OpenStreetMap standard tiles with visible attribution. Leaflet 1.9.4 is vendored with its license.
