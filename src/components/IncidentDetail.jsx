import { TYPE_COLORS, TYPE_LABELS } from '../typeColors'

export default function IncidentDetail({ incident, onClose }) {
  if (!incident) return null

  return (
    <div className="incident-detail-overlay" onClick={onClose}>
      <div className="incident-detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="incident-detail-close" onClick={onClose}>×</button>
        <span className="incident-badge" style={{ backgroundColor: TYPE_COLORS[incident.type] }}>
          {TYPE_LABELS[incident.type]}
        </span>
        {incident.verified && <span className="verified-badge">Verified</span>}
        <h2>{incident.location.city}, {incident.location.state}</h2>
        <p className="incident-detail-meta">{incident.date} — Severity: {incident.severity}</p>
        <p>{incident.description}</p>
        <a href={incident.source_url} target="_blank" rel="noreferrer">{incident.source_name}</a>
      </div>
    </div>
  )
}
