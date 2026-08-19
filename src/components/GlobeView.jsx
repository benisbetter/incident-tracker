import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { TYPE_COLORS } from '../typeColors'

const MIN_ALTITUDE = 0.25

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
  const altitudeTimer = useRef()

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
    const globe = globeRef.current
    if (!globe) return
    globe.pointOfView({ lat: 39.8283, lng: -98.5795, altitude: 1.8 }, 0)
    const controls = globe.controls()
    controls.enableDamping = true
    // The globe texture is a fixed-resolution image — zooming past this
    // point just magnifies its pixels into a blur. Markers already give
    // full detail at close range, so cap how far in the camera can go.
    controls.minDistance = 100 * (1 + MIN_ALTITUDE)
  }, [])

  const points = useMemo(
    () =>
      incidents.map((incident) => ({
        lat: incident.location.lat,
        lng: incident.location.lng,
        color: TYPE_COLORS[incident.type],
        incident,
      })),
    [incidents]
  )

  // Fixed zoom levels (like map tile clustering) instead of a continuous
  // altitude*factor formula — a smoothly-varying bin size reshuffles which
  // points share a bin on every tiny camera move, making counts appear to
  // jump around. Snapping to discrete steps keeps clusters stable while
  // panning/zooming within a level, and lets them merge/split predictably
  // when crossing a level.
  const ZOOM_LEVELS = [25, 12, 6, 3, 1.5, 0.7, 0.35, MIN_ALTITUDE]
  const binDeg = useMemo(() => {
    for (const level of ZOOM_LEVELS) {
      if (altitude >= level) return level
    }
    return ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
  }, [altitude])

  const clusters = useMemo(() => clusterPoints(points, binDeg), [points, binDeg])

  const handleZoom = useCallback(({ altitude: alt }) => {
    clearTimeout(altitudeTimer.current)
    altitudeTimer.current = setTimeout(() => setAltitude(alt), 120)
  }, [])

  const handleClusterClick = useCallback(
    (cluster) => {
      onClusterSelect?.(cluster.items.map((p) => p.incident))
      if (cluster.count === 1) {
        onSelectIncident(cluster.items[0].incident)
        return
      }
      const globe = globeRef.current
      const nextAltitude = Math.max(MIN_ALTITUDE, altitude / 3.2)
      globe.pointOfView({ lat: cluster.lat, lng: cluster.lng, altitude: nextAltitude }, 500)
    },
    [altitude, onSelectIncident, onClusterSelect]
  )

  const makeClusterEl = useCallback(
    (d) => {
      const el = document.createElement('div')
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
    },
    [handleClusterClick]
  )

  return (
    <div className="globe-container" ref={containerRef}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundColor="rgba(0,0,0,0)"
        onZoom={handleZoom}
        htmlElementsData={clusters}
        htmlLat="lat"
        htmlLng="lng"
        htmlElement={makeClusterEl}
      />
    </div>
  )
}
