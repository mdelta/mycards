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
