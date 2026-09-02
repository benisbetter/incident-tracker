# Antisemitism Incident Tracker

Interactive 2D map + charts of antisemitic incidents reported since October 7, 2023. Built for live display on a podcast recording.

## Stack

React 18 + Vite, react-leaflet + leaflet.markercluster (2D map, no API key needed), recharts (charts). No traditional backend — one small Vercel serverless function (`api/incidents.js`) keeps the data current; the app also ships a static snapshot (`src/data/incidents.json`) so it works fully offline or run locally with no deployment.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed localhost URL. Locally there's no serverless function running, so the app shows the bundled snapshot in `src/data/incidents.json` — that's expected.

## Deploy (this is what makes it self-updating)

The bundled data is a snapshot from when this was built. Deployed to Vercel, the app instead calls `api/incidents.js` on every page load, which pulls the current ADL feed server-side and returns it live — no one has to run anything, ever, after this one-time setup:

1. Push this folder to a GitHub repo (your own account — this project has no tie to anything else).
2. Go to [vercel.com](https://vercel.com), click **Add New → Project**, and import that repo.
3. Leave all settings at their defaults and click **Deploy**. Vercel auto-detects the Vite app and the `api/incidents.js` serverless function — nothing to configure.

That's it. The live URL now refreshes its incident data automatically (cached ~12 hours at a time, matching how often ADL itself updates) with zero maintenance. Free on Vercel's Hobby tier.

If the live fetch ever fails (ADL's site down, etc.) the app silently falls back to the bundled snapshot — it never shows an error or a blank page.

## Data

Two sources feed the map:

- **ADL's H.E.A.T. Map** — the bulk of the data, pulled from ADL's own incident feed (`api/incidents.js` does this live once deployed; `src/data/incidents.json` has a snapshot for local/offline use).
- **Hand-researched incidents** — a handful of individually sourced, named cases ADL's feed doesn't carry (e.g. the Chabad HQ ramming, the Michigan synagogue attack). These are hardcoded in both `api/incidents.js` and the snapshot file, so they show up either way. Add more the same way — same shape, no other code changes needed.

Each record:

```json
{
  "id": "00001",
  "date": "2023-10-15",
  "location": { "lat": 40.7128, "lng": -74.0060, "city": "New York", "state": "NY" },
  "type": "vandalism",
  "severity": "moderate",
  "description": "...",
  "source_url": "https://...",
  "source_name": "...",
  "verified": true
}
```

- `type`: one of `death`, `injury`, `physical_attack`, `vandalism`, `harassment`, `online`
- `severity`: one of `low`, `moderate`, `high`, `critical`

## Out of scope (by design)

No user accounts, no public submission form, no payments, no database — the serverless function is the only server-side piece, and it only reads ADL's public data, never writes anything.
