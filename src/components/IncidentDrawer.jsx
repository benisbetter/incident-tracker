import IncidentRows from './IncidentRows'

export default function IncidentDrawer({ incidents, clusterIncidents, clusterMeta, onSelectIncident, open, onOpenChange, onClearCluster }) {
  const shown = clusterIncidents ?? incidents

  return (
    <>
      <button className={`drawer-toggle ${open ? 'drawer-toggle-open' : ''}`} onClick={() => onOpenChange(!open)}>
        <span className="drawer-toggle-arrow">{open ? '›' : '‹'}</span>
        <span className="drawer-toggle-label">Incidents</span>
        <span className="drawer-toggle-count">{incidents.length.toLocaleString()}</span>
      </button>

      <div className={`incident-drawer ${open ? 'open' : ''}`}>
        <div className="incident-drawer-header">
          <span>{clusterIncidents ? 'Selected Incidents' : 'Incidents'}</span>
          <span className="incident-panel-count">{shown.length.toLocaleString()}</span>
          <button className="incident-drawer-close" onClick={() => onOpenChange(false)}>×</button>
        </div>
        {clusterMeta && (
          <p className="drawer-total-note">
            {shown.length.toLocaleString()} individually mapped, of{' '}
            <a href={clusterMeta.source_url} target="_blank" rel="noreferrer">
              ~{clusterMeta.total.toLocaleString()} reported by {clusterMeta.source_name}
            </a>{' '}
            ({clusterMeta.period})
          </p>
        )}
        {clusterIncidents && (
          <button className="drawer-clear-cluster" onClick={onClearCluster}>
            ← Show all {incidents.length.toLocaleString()} incidents
          </button>
        )}
        <IncidentRows incidents={shown} onSelectIncident={onSelectIncident} />
      </div>
    </>
  )
}
