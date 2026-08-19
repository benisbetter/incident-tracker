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

      <FilterBar filters={filters} onChange={setFilters} />

      <div className="main-columns">
        <div className="map-column">
          <GlobeView incidents={filteredIncidents} onSelectIncident={setSelected} />
        </div>
        <div className="chart-column">
          <ChartsPanel incidents={filteredIncidents} />
        </div>
      </div>

      <DonateSection />

      <IncidentDrawer incidents={filteredIncidents} onSelectIncident={setSelected} />
      <IncidentDetail incident={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
