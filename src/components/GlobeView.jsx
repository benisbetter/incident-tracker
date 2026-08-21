import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { TYPE_COLORS } from '../typeColors'
import countryTotals from '../data/countryTotals.json'

const MIN_ALTITUDE = 0.03

// One clickable pin per country, labeled with its real officially-reported
// total (not just what we've individually sourced). Clicking it zooms in on
// that country and opens the drawer filtered to its researched incidents,
// with a note on how many of the official total those represent.
const COUNTRY_MARKERS = Object.entries(countryTotals).map(([country, info]) => ({
  kind: 'country',
  lat: info.lat,
  lng: info.lng,
  total: info.total,
  country,
  info,
}))

const COUNTRIES_WITH_TOTAL_PIN = new Set(Object.keys(countryTotals))

function darkTileUrl(x, y, l) {
  return `https://a.basemaps.cartocdn.com/dark_all/${l}/${x}/${y}.png`
}

function clusterPoints(points, binDeg) {
  const bins = new Map()
  for (const p of points) {
    const key = Math.floor(p.lat / binDeg) + '_' + Math.floor(p.lng / binDeg)
    let b = bins.get(key)
    if (!b) {
      b = { latSum: 0, lngSum: 0, count: 0, colorCounts: {}, items: [] }
      bins.set(key, b)
    }
    b.latSum += p.lat
    b.lngSum += p.lng
    b.count += 1
    b.colorCounts[p.color] = (b.colorCounts[p.color] || 0) + 1
    b.items.push(p)
  }
  const out = []
  for (const b of bins.values()) {
    const dominant = Object.entries(b.colorCounts).sort((x, y) => y[1] - x[1])[0][0]
    out.push({ lat: b.latSum / b.count, lng: b.lngSum / b.count, count: b.count, color: dominant, items: b.items })
  }
  return out
}

export default function GlobeView({ incidents, onSelectIncident, onClusterSelect }) {
  const globeRef = useRef()
  const containerRef = useRef()
  const [size, setSize] = useState({ width: 600, height: 420 })
  const [altitude, setAltitude] = useState(1.8)
  const [focusedCountry, setFocusedCountry] = useState(null)
  const altitudeTimer = useRef()
  const drillAltitude = useRef(0)
  const drillLockUntil = useRef(0)

  // react-globe.gl wipes and rebuilds every marker whenever the
  // `htmlElement` factory's identity changes (its dataMapper.clear() runs
  // on that prop changing). If the click handlers depend on incidents /
  // onClusterSelect / altitude directly, they get a new identity on almost
  // every render — including the render caused by the click itself — which
  // was destroying and recreating the whole marker layer mid-interaction.
  // That's why clicking a pin needed a second click: the first click's own
  // state update wiped the marker the click just landed on. Keeping the
  // latest values in refs lets the click handlers (and htmlElement) stay
  // permanently stable while still always reading current data.
  const incidentsRef = useRef(incidents)
  const onClusterSelectRef = useRef(onClusterSelect)
  const onSelectIncidentRef = useRef(onSelectIncident)
  const altitudeRef = useRef(altitude)
  useEffect(() => {
    incidentsRef.current = incidents
    onClusterSelectRef.current = onClusterSelect
    onSelectIncidentRef.current = onSelectIncident
    altitudeRef.current = altitude
  })

  // Any zoom-out at all from where the drill-in landed collapses the
  // country back to a single total pin — not just a big zoom-out. Guarded
  // by drillLockUntil: the fly-in animation itself passes through every
  // altitude between the old wide view and the drill-in target, so without
  // this lock a mid-flight tick above the threshold would collapse the
  // focus before the camera even finished arriving.
  useEffect(() => {
    if (Date.now() < drillLockUntil.current) return
    if (focusedCountry && altitude > drillAltitude.current + 0.01) setFocusedCountry(null)
  }, [altitude, focusedCountry])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Scrolling to max zoom-out otherwise lets the leftover wheel delta
    // fall through to the page and scroll it — always eat the event here.
    const stopScroll = (e) => e.preventDefault()
    el.addEventListener('wheel', stopScroll, { passive: false })
    return () => el.removeEventListener('wheel', stopScroll)
  }, [])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    globe.pointOfView({ lat: 39.8283, lng: -98.5795, altitude: 1.8 }, 0)
    const controls = globe.controls()
    controls.enableDamping = true
    controls.minDistance = 100 * (1 + MIN_ALTITUDE)
    controls.maxDistance = 100 * 4.5
  }, [])

  const points = useMemo(
    () =>
      incidents
        .filter((incident) => {
          const country = incident.location.state
          // Countries with a total pin stay collapsed into that single pin
          // until it's clicked — otherwise their individual pins clutter
          // the zoomed-out view right next to the pin showing their total.
          return !COUNTRIES_WITH_TOTAL_PIN.has(country) || country === focusedCountry
        })
        .map((incident) => ({
          lat: incident.location.lat,
          lng: incident.location.lng,
          color: TYPE_COLORS[incident.type],
          incident,
        })),
    [incidents, focusedCountry]
  )

  // Fixed zoom levels (like map tile clustering) instead of a continuous
  // altitude*factor formula — a smoothly-varying bin size reshuffles which
  // points share a bin on every tiny camera move, making counts appear to
  // jump around. Snapping to discrete steps keeps clusters stable while
  // panning/zooming within a level, and lets them merge/split predictably
  // when crossing a level.
  const ZOOM_LEVELS = [25, 12, 6, 3, 1.5, 0.7, 0.35, MIN_ALTITUDE]
  const binDeg = useMemo(() => {
    // A focused country always resolves to its finest-grain clustering
    // immediately, regardless of what altitude has (or hasn't) committed
    // yet — otherwise the split into individual pins depends on timing
    // that isn't guaranteed to happen before the next render.
    if (focusedCountry) return MIN_ALTITUDE
    for (const level of ZOOM_LEVELS) {
      if (altitude >= level) return level
    }
    return ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
  }, [altitude, focusedCountry])

  const clusters = useMemo(() => clusterPoints(points, binDeg), [points, binDeg])

  const countryMarkers = useMemo(
    () => COUNTRY_MARKERS.filter((m) => m.country !== focusedCountry),
    [focusedCountry]
  )
  const markers = useMemo(() => [...countryMarkers, ...clusters], [countryMarkers, clusters])

  const handleZoom = useCallback(({ altitude: alt }) => {
    clearTimeout(altitudeTimer.current)
    altitudeTimer.current = setTimeout(() => setAltitude(alt), 120)
  }, [])

  // Stable identity (empty deps) — reads everything that changes often via
  // refs instead of closing over it, so the DOM click listener bound at
  // element-creation time never goes stale and never forces a rebuild.
  const handleClusterClick = useCallback((cluster) => {
    onClusterSelectRef.current?.(cluster.items.map((p) => p.incident))
    if (cluster.count === 1) {
      onSelectIncidentRef.current(cluster.items[0].incident)
      return
    }
    const globe = globeRef.current
    const nextAltitude = Math.max(MIN_ALTITUDE, altitudeRef.current / 3.2)
    globe.pointOfView({ lat: cluster.lat, lng: cluster.lng, altitude: nextAltitude }, 500)
  }, [])

  const handleCountryClick = useCallback((marker) => {
    const countryIncidents = incidentsRef.current.filter((i) => i.location.state === marker.country)
    onClusterSelectRef.current?.(countryIncidents, marker.info)
    setFocusedCountry(marker.country)
    drillAltitude.current = 0.15
    drillLockUntil.current = Date.now() + 700
    // pointOfView's own fly-in animation doesn't reliably fire onZoom, so
    // altitude (which drives clustering) would otherwise stay stale until
    // the next manual scroll — set it directly instead of waiting on that.
    clearTimeout(altitudeTimer.current)
    setAltitude(0.15)
    const globe = globeRef.current
    globe.pointOfView({ lat: marker.lat, lng: marker.lng, altitude: 0.15 }, 600)
  }, [])

  const makeClusterEl = useCallback((d) => {
    const el = document.createElement('div')
    if (d.kind === 'country') {
      el.className = 'globe-country-pin'
      el.textContent = d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}K` : d.total
      el.title = `${d.country}: ~${d.total.toLocaleString()} reported incidents (click to see researched cases)`
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        handleCountryClick(d)
      })
      return el
    }
    if (d.count === 1) {
      el.className = 'globe-point'
      el.style.backgroundColor = d.color
    } else {
      el.className = 'globe-cluster'
      const px = Math.min(38, 14 + Math.sqrt(d.count) * 2)
      el.style.width = `${px}px`
      el.style.height = `${px}px`
      el.style.fontSize = px < 22 ? '10px' : '11px'
      el.style.backgroundColor = d.color
      el.textContent = d.count
    }
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      handleClusterClick(d)
    })
    return el
  }, [handleClusterClick, handleCountryClick])

  return (
    <div className="globe-container" ref={containerRef}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeTileEngineUrl={darkTileUrl}
        globeTileEngineMaxLevel={8}
        backgroundColor="rgba(0,0,0,0)"
        onZoom={handleZoom}
        htmlElementsData={markers}
        htmlLat="lat"
        htmlLng="lng"
        htmlElement={makeClusterEl}
      />
    </div>
  )
}
