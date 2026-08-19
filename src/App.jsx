import { useMemo, useState } from 'react'
import rawIncidents from './data/incidents.json'
import GlobeView from './components/GlobeView'
import Timeline from './components/Timeline'
import FilterBar from './components/FilterBar'
import IncidentList from './components/IncidentList'
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
        <h1>Antisemitism Incident Tracker</h1>
        <p>Tracking incidents reported since October 7, 2023</p>
      </header>

      <FilterBar filters={filters} onChange={setFilters} />

      <div className="main-columns">
        <div className="map-column">
          <GlobeView incidents={filteredIncidents} onSelectIncident={setSelected} />
        </div>
        <div className="list-column">
          <IncidentList incidents={filteredIncidents} onSelectIncident={setSelected} />
        </div>
      </div>

      <div className="timeline-section">
        <Timeline incidents={filteredIncidents} />
      </div>

      <DonateSection />

      <IncidentDetail incident={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
