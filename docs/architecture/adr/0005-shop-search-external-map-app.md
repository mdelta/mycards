# ADR-0005: Shop search via external map app

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 1.1 (F-07), 3.2, 4.2

## Context

The user wants to find a card's shop near the current location and show it in Google Maps or an
OpenStreetMap-based app.

## Options

1. Open the user's map app with a search query (store name).
2. In-app OSM map (e.g. Leaflet + Nominatim/Overpass) – needs INTERNET and location permission.
3. Google Places API – API key, billing, network.

## Decision

Option 1: the app launches an Android intent with a search query for the shop (default: card's
store name, editable per card). The user's installed map app (Google Maps, Organic Maps, OsmAnd, …)
performs the search around the current location.

## Consequences

- No location permission, no API key, no network access needed by MyCards itself.
- Result quality depends on the map app. Exact intent/URI format and behaviour per map app is
  verified during implementation (fallback: a maps web URL opened in the browser).
- Websites attached to cards (F-06) are likewise opened in the user's browser.

## Implementation (step 6)

- [DECIDED] Links and the map search are opened with the official `@capacitor/app-launcher` plugin
  behind the domain port `ExternalLauncher`; websites open in the user's browser app, not in an
  in-app browser view.
- [DECIDED] Map search URI: `geo:0,0?q=<URL-encoded search term>`. The search term is the card's
  shop search term, else its store name. If no app handles `geo:`, the OpenStreetMap search page
  (`https://www.openstreetmap.org/search?query=…`) opens in the browser; if that fails too, the
  user sees a message.
- [DECIDED] Only `http` and `https` URLs are accepted as homepage or website (validated on save and
  import).
- Still to verify on a device: `geo:` search with Google Maps and OsmAnd/Organic Maps.
