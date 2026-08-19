import { useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { TYPE_COLORS, SEVERITY_RADIUS } from '../typeColors'

export default function GlobeView({ incidents, onSelectIncident }) {
  const globeRef = useRef()
  const containerRef = useRef()
  const [size, setSize] = useState({ width: 600, height: 420 })

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
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.4
  }, [])

  const points = useMemo(
    () =>
      incidents.map((incident) => ({
        lat: incident.location.lat,
        lng: incident.location.lng,
        size: (SEVERITY_RADIUS[incident.severity] ?? 8) / 20,
        color: TYPE_COLORS[incident.type],
        incident,
      })),
    [incidents]
  )

  return (
    <div className="globe-container" ref={containerRef}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundColor="rgba(0,0,0,0)"
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="size"
        pointAltitude={0.005}
        pointLabel={(p) => `${p.incident.date} — ${p.incident.location.city}, ${p.incident.location.state}`}
        onPointClick={(p) => onSelectIncident(p.incident)}
      />
    </div>
  )
}
