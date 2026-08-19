// Serverless function (runs on Vercel, not in the browser) that pulls the
// current ADL H.E.A.T. Map feed server-side — the browser can't call ADL
// directly because their endpoint sends no CORS header. Runs fresh on every
// cache miss (see Cache-Control below), no cron, no manual steps.

const CUTOFF = '2023-10-07'
const PAGE_RANGE = 250 // generous ceiling; pages past ADL's real count just 404/empty and are skipped

// Incidents ADL doesn't carry (post-dated their feed, or found via separate
// news research). Same records baked into src/data/incidents.json — kept
// here too so the live feed doesn't lose them.
const MANUAL_INCIDENTS = [
  {
    date: '2026-01-28',
    location: { lat: 40.6688, lng: -73.9426, city: 'Brooklyn', state: 'NY' },
    type: 'physical_attack',
    severity: 'high',
    description:
      "A man repeatedly rammed his car into the entrance of Chabad-Lubavitch World Headquarters at 770 Eastern Parkway in Crown Heights during Yud Shvat. No injuries reported; suspect Dan Sohail, 36, was taken into custody. NYPD is investigating it as an antisemitic hate crime.",
    source_url: 'https://www.cbsnews.com/newyork/news/car-into-chabad-headquarters-brooklyn/',
    source_name: 'CBS News New York',
    verified: true,
  },
  {
    date: '2026-03-12',
    location: { lat: 42.5652, lng: -83.3132, city: 'West Bloomfield Township', state: 'MI' },
    type: 'death',
    severity: 'critical',
    description:
      "Ayman Mohamad Ghazali rammed a vehicle into Temple Israel and opened fire before dying by suicide; a security guard was struck by the vehicle and injured. The FBI determined the attack was a Hezbollah-inspired act of terrorism against the Jewish community, motivated by the deaths of the attacker's relatives in an Israeli airstrike in Lebanon days earlier.",
    source_url: 'https://abcnews.com/US/suspect-michigan-synagogue-attack-lost-family-israeli-strike/story?id=131031752',
    source_name: 'ABC News',
    verified: true,
  },
  {
    date: '2026-08-14',
    location: { lat: 40.7577, lng: -73.9700, city: 'New York', state: 'NY' },
    type: 'physical_attack',
    severity: 'high',
    description:
      'Larry Montes disrupted Shabbat services at Central Synagogue in Midtown East, striking a congregant and headbutting a security guard. He was arrested and charged with hate crimes and damage to religious property resulting in injury.',
    source_url: 'https://www.cnn.com/2026/08/15/us/attack-synagogue-nyc-hnk',
    source_name: 'CNN',
    verified: true,
  },
  {
    date: '2025-06-30',
    location: { lat: 40.7128, lng: -74.0060, city: 'New York', state: 'NY' },
    type: 'physical_attack',
    severity: 'moderate',
    description:
      'Tarek Bazrouk, 20, was charged with federal hate crimes over a series of assaults on Jewish victims in New York City between 2024 and 2025, including an attack on a man wearing an Israel Defense Forces sweatshirt.',
    source_url: 'https://www.justice.gov/opa/pr/new-york-man-charged-federal-hate-crimes-after-repeatedly-assaulting-jewish-victims',
    source_name: 'U.S. Department of Justice',
    verified: true,
  },
]

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
    const lng = parseFloat(r.longitude)
    if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng)) continue
    if (!r.body || !r.body.trim()) continue

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
