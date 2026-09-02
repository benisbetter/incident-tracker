import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { TYPE_COLORS } from '../typeColors'
import countryTotals from '../data/countryTotals.json'

// One clickable pin per country, labeled with its real officially-reported
// total (not just what we've individually sourced). Clicking it flies to
// that country and opens the drawer filtered to its researched incidents.
const COUNTRY_MARKERS = Object.entries(countryTotals).map(([country, info]) => ({ country, ...info }))
const COUNTRIES_WITH_TOTAL_PIN = new Set(Object.keys(countryTotals))

// Esri's free dark basemap needs no API key on any domain (unlike CartoDB,
// which started requiring one on real deployments). Leaflet tiles use
// native z/x/y templating, no manual axis flip needed like the globe did.
const DARK_TILE_URL =
  'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'

const pointIconCache = new Map()
function pointIcon(color) {
  let icon = pointIconCache.get(color)
  if (!icon) {
    icon = L.divIcon({
      className: '',
      html: `<div class="globe-point" style="background-color:${color}"></div>`,
      iconSize: [8, 8],
    })
    pointIconCache.set(color, icon)
  }
  return icon
}

function countryIcon(marker) {
  const label = marker.total >= 1000 ? `${(marker.total / 1000).toFixed(1)}K` : marker.total
  return L.divIcon({
    className: '',
    html: `<div class="globe-country-pin">${label}</div>`,
    iconSize: [48, 30],
  })
}

function clusterIcon(cluster) {
  const children = cluster.getAllChildMarkers()
  const colorCounts = {}
  for (const m of children) {
    const c = m.options.incidentColor
    colorCounts[c] = (colorCounts[c] || 0) + 1
  }
  const dominant = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0][0]
  const count = cluster.getChildCount()
  const px = Math.min(38, 14 + Math.sqrt(count) * 2)
  return L.divIcon({
    className: '',
    html: `<div class="globe-cluster" style="width:${px}px;height:${px}px;font-size:${px < 22 ? 10 : 11}px;background-color:${dominant}">${count}</div>`,
    iconSize: [px, px],
  })
}

// Leaflet doesn't know when its container is resized by CSS (tab switch,
// fullscreen toggle, drawer opening) — it must be told explicitly or tiles
// render into stale dimensions.
function ResizeHandler() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer().parentElement
    if (!container) return
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

function ZoomWatcher({ onZoom }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) })
  return null
}

export default function MapView({ incidents, onSelectIncident, onClusterSelect }) {
  const mapRef = useRef()
  const [focusedCountry, setFocusedCountry] = useState(null)
  const drillZoom = useRef(0)
  const drillLockUntil = useRef(0)
  const incidentsRef = useRef(incidents)
  useEffect(() => {
    incidentsRef.current = incidents
  })

  // Any zoom-out at all from where the drill-in landed collapses the
  // country back to a single total pin. Guarded by drillLockUntil since
  // flyToBounds's own animation passes through intermediate zoom levels.
  const handleZoom = useCallback(
    (zoom) => {
      if (Date.now() < drillLockUntil.current) return
      if (focusedCountry && zoom < drillZoom.current - 0.5) setFocusedCountry(null)
    },
    [focusedCountry]
  )

  const points = useMemo(
    () =>
      incidents.filter((incident) => {
        const country = incident.location.state
        return !COUNTRIES_WITH_TOTAL_PIN.has(country) || country === focusedCountry
      }),
    [incidents, focusedCountry]
  )

  const countryMarkers = useMemo(
    () => COUNTRY_MARKERS.filter((m) => m.country !== focusedCountry),
    [focusedCountry]
  )

  const handleCountryClick = useCallback(
    (marker) => {
      const countryIncidents = incidentsRef.current.filter((i) => i.location.state === marker.country)
      onClusterSelect?.(countryIncidents, marker)
      setFocusedCountry(marker.country)

      const map = mapRef.current
      if (!map) return
      drillLockUntil.current = Date.now() + 700
      if (countryIncidents.length > 0) {
        const bounds = L.latLngBounds(countryIncidents.map((i) => [i.location.lat, i.location.lng]))
        map.flyToBounds(bounds.pad(0.3), { duration: 0.6 })
      } else {
        map.flyTo([marker.lat, marker.lng], 5, { duration: 0.6 })
      }
      setTimeout(() => {
        drillZoom.current = map.getZoom()
      }, 650)
    },
    [onClusterSelect]
  )

  return (
    <div className="globe-container">
      <MapContainer
        ref={mapRef}
        center={[39.8283, -98.5795]}
        zoom={4}
        minZoom={2}
        maxZoom={12}
        worldCopyJump
        preferCanvas
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <TileLayer url={DARK_TILE_URL} maxZoom={12} attribution="" />
        <ResizeHandler />
        <ZoomWatcher onZoom={handleZoom} />
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={clusterIcon}
          spiderfyOnMaxZoom={false}
          maxClusterRadius={50}
          onClick={(e) => {
            onClusterSelect?.(e.layer.getAllChildMarkers().map((m) => m.options.incidentData))
          }}
        >
          {points.map((incident) => (
            <Marker
              key={incident.id}
              position={[incident.location.lat, incident.location.lng]}
              icon={pointIcon(TYPE_COLORS[incident.type])}
              incidentColor={TYPE_COLORS[incident.type]}
              incidentData={incident}
              eventHandlers={{ click: () => onSelectIncident(incident) }}
            />
          ))}
        </MarkerClusterGroup>
        {countryMarkers.map((marker) => (
          <Marker
            key={marker.country}
            position={[marker.lat, marker.lng]}
            icon={countryIcon(marker)}
            eventHandlers={{ click: () => handleCountryClick(marker) }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
