// Serverless function (runs on Vercel, not in the browser) that pulls the
// current ADL H.E.A.T. Map feed server-side — the browser can't call ADL
// directly because their endpoint sends no CORS header. Runs fresh on every
// cache miss (see Cache-Control below), no cron, no manual steps.

import MANUAL_INCIDENTS from '../src/data/manualIncidents.json' with { type: 'json' }

const CUTOFF = '2023-10-07'
const PAGE_RANGE = 250 // generous ceiling; pages past ADL's real count just 404/empty and are skipped

// MANUAL_INCIDENTS = hand-researched incidents ADL doesn't carry (US cases
// outside their feed, plus every non-US country). Single shared file — also
// used to rebuild src/data/incidents.json's bundled snapshot, so the two
// never drift apart.

const STATE_ABBR = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO',
  Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR',
  Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
  Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
}

function parseDate(s) {
  if (!s) return null
  const parts = s.split('/')
  if (parts.length === 2) {
    const [m, y] = parts
    return `${y}-${m.padStart(2, '0')}-01`
  }
  if (parts.length === 3) {
    const [m, d, y] = parts
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

function toType(label, isMurder) {
  if (isMurder) return 'death'
  if (/Assault/i.test(label)) return 'physical_attack'
  if (/Vandalism/i.test(label)) return 'vandalism'
  if (/Harassment/i.test(label)) return 'harassment'
  return null
}

function toSeverity(type, body) {
  if (type === 'death') return 'critical'
  if (type === 'physical_attack') {
    return /hospitalized|serious injur|critical condition|stabbed|shot\b/i.test(body || '') ? 'high' : 'moderate'
  }
  if (type === 'vandalism') return 'moderate'
  return 'low'
}

async function fetchPage(page) {
  try {
    const res = await fetch(`https://www.adl.org/apps/heatmap/json?page=${page}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function fetchAllPages() {
  const pageNumbers = Array.from({ length: PAGE_RANGE }, (_, i) => i + 1)
  const batches = await Promise.all(pageNumbers.map(fetchPage))
  return batches.flat()
}

function convert(raw) {
  const byId = new Map()
  for (const r of raw) byId.set(r.id, r)

  const out = []
  for (const r of byId.values()) {
    const date = parseDate(r.attack_date)
    if (!date || date < CUTOFF) continue

    const label = r.type_of_attack || ''
    if (!/Antisemitic Incident/i.test(label)) continue

    const type = toType(label, /Extremist Murder/i.test(label))
    if (!type) continue

    const lat = parseFloat(r.latitude)
    let lng = parseFloat(r.longitude)
    if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng)) continue
    if (!r.body || !r.body.trim()) continue

    // ADL's raw feed occasionally has the longitude sign flipped for a US
    // record (plots it in Asia instead of the US). Every US state is west
    // of the prime meridian, so a positive longitude here is always wrong.
    if (STATE_ABBR[r.state_code] && lng > 0) lng = -lng

    out.push({
      date,
      location: { lat, lng, city: r.city || '', state: STATE_ABBR[r.state_code] || r.state_code || '' },
      type,
      severity: toSeverity(type, r.body),
      description: r.body.trim(),
      source_url: 'https://www.adl.org/resources/tools-to-track-hate/heat-map',
      source_name: 'ADL H.E.A.T. Map',
      verified: true,
    })
  }
  return out
}

export default async function handler(req, res) {
  try {
    const raw = await fetchAllPages()
    const incidents = convert(raw).concat(MANUAL_INCIDENTS)

    incidents.sort((a, b) => a.date.localeCompare(b.date))
    incidents.forEach((incident, i) => {
      incident.id = String(i + 1).padStart(5, '0')
    })

    // Cache at Vercel's edge for ~12h — matches ADL's own "updated monthly"
    // cadence, so almost every visitor hits the cache and the expensive
    // 250-page refetch only actually runs a couple of times a day.
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=86400')
    res.status(200).json(incidents)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incident data', message: err.message })
  }
}
