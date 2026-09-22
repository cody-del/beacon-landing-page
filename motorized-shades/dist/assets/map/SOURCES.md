# Beacon Blinds service-area map

The user supplied the main service communities and ZIP codes on September 22, 2026, and explicitly requested Austin as well. The map draws one orange outer envelope, with no internal ZIP-code borders. It is illustrative coverage, not a promise of service at every individual address. The adjacent caption identifies the boundary as approximate.

## Supplied communities

Austin (whole city); Horseshoe Bay (78654, 78657); Marble Falls (78654, 78657); Kingsland (78639); Burnet (78611); Jonestown (78645); Leander (78645, 78646, 78641); Liberty Hill (78642); Cedar Park (78613); Georgetown (78626, 78628, 78633); Spicewood (78669); Lakeway (78734, 78738).

## Geographic references

U.S. Census Bureau TIGERweb ZIP Code Tabulation Areas, retrieved September 22, 2026:
https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1

Queried the 15 distinct supplied ZIP codes using ZCTA5. The service returned 14 polygons; 78646 has no polygon in this dataset. It is retained in the supplied list here, with Leander covered by the other supplied ZIP areas. No boundary is fabricated specifically for 78646.

Austin city, Texas, GEOID 4805000, current incorporated-place geometry retrieved September 22, 2026:
https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4

Reference queries use returnGeometry=true, outSR=4326, maxAllowableOffset=0.0008, f=geojson. Both raw responses are retained here. `scripts/build-service-boundary.py` generates a convex envelope around all reference geometry, thereby connecting the communities into one continuous outline and including intervening areas. Every source vertex is checked inside or on the envelope. No separate city/ZIP polygons appear on the customer-facing map.

Basemap: OpenStreetMap standard tiles, requested by the browser only near the map; no tile downloads or offline caching. Map attribution is visible. Leaflet 1.9.4 is vendored from the existing Shutter Factory project with its license. No office marker is shown because an office address was not provided for this page.
