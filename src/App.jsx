import { useMemo, useState } from 'react'
import rawIncidents from './data/incidents.json'
import GlobeView from './components/GlobeView'
import ChartsPanel from './components/ChartsPanel'
import FilterBar from './components/FilterBar'
import IncidentDrawer from './components/IncidentDrawer'
import IncidentDetail from './components/IncidentDetail'
import DonateSection from './components/DonateSection'
import { TYPE_COLORS } from './typeColors'
import './App.css'

const DEFAULT_FILTERS = {
  types: Object.keys(TYPE_COLORS),
  dateFrom: '2023-10-07',
  dateTo: new Date().toISOString().slice(0, 10),
}

export default function App() {
  const [incidents] = useState(rawIncidents)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selected, setSelected] = useState(null)
  const [mainTab, setMainTab] = useState('globe')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [clusterIncidents, setClusterIncidents] = useState(null)

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (!filters.types.includes(incident.type)) return false
      if (filters.dateFrom && incident.date < filters.dateFrom) return false
      if (filters.dateTo && incident.date > filters.dateTo) return false
      return true
    })
  }, [incidents, filters])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="app-title-mark">✡</span>
          <div>
            <h1>Antisemitism Incident Tracker</h1>
            <p>Tracking incidents reported since October 7, 2023</p>
          </div>
        </div>
        <div className="app-header-stat">
          <span className="app-header-stat-number">{filteredIncidents.length.toLocaleString()}</span>
          <span className="app-header-stat-label">incidents shown</span>
        </div>
      </header>

      <FilterBar
        filters={filters}
        onChange={(next) => {
          setFilters(next)
          setClusterIncidents(null)
        }}
      />

      <div className="main-tabs">
        <button className={`main-tab ${mainTab === 'globe' ? 'active' : ''}`} onClick={() => setMainTab('globe')}>
          Globe
        </button>
        <button className={`main-tab ${mainTab === 'charts' ? 'active' : ''}`} onClick={() => setMainTab('charts')}>
          Charts
        </button>
      </div>

      <div className="main-view">
        <div className="map-column" style={{ display: mainTab === 'globe' ? 'block' : 'none' }}>
          <GlobeView
            incidents={filteredIncidents}
            onSelectIncident={setSelected}
            onClusterSelect={(items) => {
              setClusterIncidents(items)
              setDrawerOpen(true)
            }}
          />
        </div>
        {mainTab === 'charts' && (
          <div className="chart-column">
            <ChartsPanel incidents={filteredIncidents} />
          </div>
        )}
      </div>

      <DonateSection />

      <IncidentDrawer
        incidents={filteredIncidents}
        clusterIncidents={clusterIncidents}
        onSelectIncident={setSelected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onClearCluster={() => setClusterIncidents(null)}
      />
      <IncidentDetail incident={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
