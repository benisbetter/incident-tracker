import { useState } from 'react'
import IncidentRows from './IncidentRows'

export default function IncidentDrawer({ incidents, onSelectIncident }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className={`drawer-toggle ${open ? 'drawer-toggle-open' : ''}`} onClick={() => setOpen(!open)}>
        <span className="drawer-toggle-arrow">{open ? '›' : '‹'}</span>
        <span className="drawer-toggle-label">Incidents</span>
        <span className="drawer-toggle-count">{incidents.length.toLocaleString()}</span>
      </button>

      {open && <div className="incident-drawer-backdrop" onClick={() => setOpen(false)} />}

      <div className={`incident-drawer ${open ? 'open' : ''}`}>
        <div className="incident-drawer-header">
          <span>Incidents</span>
          <span className="incident-panel-count">{incidents.length.toLocaleString()}</span>
          <button className="incident-drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>
        <IncidentRows incidents={incidents} onSelectIncident={onSelectIncident} />
      </div>
    </>
  )
}
