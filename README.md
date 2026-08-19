# Antisemitism Incident Tracker

Interactive map + timeline of antisemitic incidents reported since October 7, 2023. Built for live display on a podcast recording.

## Stack

React 18 + Vite, react-leaflet (map, no API key needed), recharts (timeline). No backend — data lives in `src/data/incidents.json`.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL.

## Build for deploy

```bash
npm run build
```

Outputs a static `dist/` folder — drop it on Vercel, Netlify, or any static host.

## Data

`src/data/incidents.json` ships with 6 real, sourced incidents (AP/JTA/CBS/DOJ), each `verified: true` with a source link. Add more the same way — same JSON shape, no code changes needed.

Each record:

```json
{
  "id": "001",
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

Source real incidents from AP, Reuters, JTA, ADL's Audit of Antisemitic Incidents, or similar outlets — don't invent entries. Keep the same JSON shape and the app keeps working with no code changes.

## Out of scope (by design)

No auto-scraping, no user accounts, no public submission form, no payments, no backend/database.
