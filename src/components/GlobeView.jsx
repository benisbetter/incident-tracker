import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { TYPE_COLORS } from '../typeColors'

const RAW_ALTITUDE_THRESHOLD = 0.15

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

export default function GlobeView({ incidents, onSelectIncident }) {
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

  const clusters = useMemo(() => {
    if (altitude <= RAW_ALTITUDE_THRESHOLD) return null
    const binDeg = Math.min(30, Math.max(0.6, altitude * 6))
    return clusterPoints(points, binDeg)
  }, [points, altitude])

  const handleZoom = useCallback(({ altitude: alt }) => {
    clearTimeout(altitudeTimer.current)
    altitudeTimer.current = setTimeout(() => setAltitude(alt), 120)
  }, [])

  const handleClusterClick = useCallback(
    (cluster) => {
      if (cluster.count === 1) {
        onSelectIncident(cluster.items[0].incident)
        return
      }
      const globe = globeRef.current
      const nextAltitude = Math.max(0.08, altitude / 3.2)
      globe.pointOfView({ lat: cluster.lat, lng: cluster.lng, altitude: nextAltitude }, 500)
    },
    [altitude, onSelectIncident]
  )

  const makeClusterEl = useCallback(
    (d) => {
      const el = document.createElement('div')
      el.className = 'globe-cluster'
      const px = Math.min(56, 22 + Math.sqrt(d.count) * 3)
      el.style.width = `${px}px`
      el.style.height = `${px}px`
      el.style.backgroundColor = d.color
      el.textContent = d.count > 1 ? d.count : ''
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
        pointsData={clusters ? [] : points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius={0.35}
        pointAltitude={0.005}
        pointLabel={(p) => `${p.incident.date} — ${p.incident.location.city}, ${p.incident.location.state}`}
        onPointClick={(p) => onSelectIncident(p.incident)}
        htmlElementsData={clusters || []}
        htmlLat="lat"
        htmlLng="lng"
        htmlElement={makeClusterEl}
      />
    </div>
  )
}
