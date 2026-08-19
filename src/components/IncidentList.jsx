import { TYPE_COLORS, TYPE_LABELS } from '../typeColors'

export default function IncidentList({ incidents, onSelectIncident }) {
  const sorted = [...incidents].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="incident-list">
      {sorted.length === 0 && <p className="incident-list-empty">No incidents match the current filters.</p>}
      {sorted.map((incident) => (
        <div key={incident.id} className="incident-row" onClick={() => onSelectIncident(incident)}>
          <span className="incident-date">{incident.date}</span>
          <span className="incident-location">{incident.location.city}, {incident.location.state}</span>
          <span className="incident-badge" style={{ backgroundColor: TYPE_COLORS[incident.type] }}>
            {TYPE_LABELS[incident.type]}
          </span>
          <p className="incident-desc">{incident.description}</p>
        </div>
      ))}
    </div>
  )
}
