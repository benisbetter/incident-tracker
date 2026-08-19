import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { TYPE_COLORS, TYPE_LABELS, SEVERITY_RADIUS } from '../typeColors'

export default function MapView({ incidents, onSelectIncident }) {
  return (
    <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '100%', minHeight: 420, width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading disableClusteringAtZoom={9}>
        {incidents.map((incident) => (
          <CircleMarker
            key={incident.id}
            center={[incident.location.lat, incident.location.lng]}
            radius={SEVERITY_RADIUS[incident.severity] ?? 8}
            pathOptions={{ color: TYPE_COLORS[incident.type], fillColor: TYPE_COLORS[incident.type], fillOpacity: 0.7 }}
            eventHandlers={{ click: () => onSelectIncident(incident) }}
          >
            <Popup>
              <strong>{incident.date}</strong> — {incident.location.city}, {incident.location.state}
              <br />
              {TYPE_LABELS[incident.type]}
              <br />
              {incident.description}
              <br />
              <a href={incident.source_url} target="_blank" rel="noreferrer">{incident.source_name}</a>
            </Popup>
          </CircleMarker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
