import { useState } from 'react'
import { TYPE_COLORS, TYPE_LABELS } from '../typeColors'

const LIST_LIMIT = 300

export default function IncidentList({ incidents, onSelectIncident }) {
  const [open, setOpen] = useState(true)
  const sorted = [...incidents].sort((a, b) => b.date.localeCompare(a.date))
  const shown = sorted.slice(0, LIST_LIMIT)

  return (
    <div className={`incident-panel ${open ? '' : 'incident-panel-collapsed'}`}>
      <button className="incident-panel-header" onClick={() => setOpen(!open)}>
        <span>Incidents</span>
        <span className="incident-panel-count">{sorted.length}</span>
        <span className={`incident-panel-chevron ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="incident-list">
          {sorted.length === 0 && <p className="incident-list-empty">No incidents match the current filters.</p>}
          {sorted.length > LIST_LIMIT && (
            <p className="incident-list-note">Showing most recent {LIST_LIMIT} of {sorted.length} matching incidents. Narrow the filters to see others.</p>
          )}
          {shown.map((incident) => (
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
      )}
    </div>
  )
}
