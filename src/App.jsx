import { useEffect, useMemo, useState } from 'react'
import rawIncidents from './data/incidents.json'
import GlobeView from './components/GlobeView'
import ChartsPanel from './components/ChartsPanel'
import FilterBar from './components/FilterBar'
import IncidentDrawer from './components/IncidentDrawer'
import IncidentDetail from './components/IncidentDetail'
import DonateSection from './components/DonateSection'
import CoverageNote from './components/CoverageNote'
import { TYPE_COLORS } from './typeColors'
import { US_STATE_CODES } from './usStateCodes'
import countryTotals from './data/countryTotals.json'
import './App.css'

const DEFAULT_FILTERS = {
  types: Object.keys(TYPE_COLORS),
  dateFrom: '2023-10-07',
  dateTo: new Date().toISOString().slice(0, 10),
}

export default function App() {
  const [incidents, setIncidents] = useState(rawIncidents)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selected, setSelected] = useState(null)
  const [mainTab, setMainTab] = useState('globe')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [clusterIncidents, setClusterIncidents] = useState(null)
  const [clusterMeta, setClusterMeta] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      return
    }
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => setIsFullscreen((v) => !v))
    } else {
      // Fullscreen API unsupported (e.g. embedded iframe) — fall back to a
      // layout-only "fullscreen" that just hides the title, no real API call.
      setIsFullscreen((v) => !v)
    }
  }

  useEffect(() => {
    fetch('/api/incidents')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setIncidents(data)
      })
      .catch(() => {
        // offline, running plain `vite dev`, or not deployed on Vercel —
        // keep showing the bundled snapshot, no error surfaced to the user
      })
  }, [])

  // The US has no gap between "mapped" and "reported" — ADL's feed is the
  // full incident set. Every other country only has individual detail for
  // a subset, so for those this adds their real published aggregate total
  // instead of just the ones we could map (falling back to the mapped
  // count only when no aggregate total exists, e.g. Greece).
  const worldwideTotal = useMemo(() => {
    const countByCountry = {}
    for (const incident of incidents) {
      const country = incident.location.state
      countByCountry[country] = (countByCountry[country] || 0) + 1
    }
    let total = 0
    for (const [country, count] of Object.entries(countByCountry)) {
      if (US_STATE_CODES.has(country)) {
        total += count
      } else {
        total += countryTotals[country]?.total ?? count
      }
    }
    return total
  }, [incidents])

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (!filters.types.includes(incident.type)) return false
      if (filters.dateFrom && incident.date < filters.dateFrom) return false
      if (filters.dateTo && incident.date > filters.dateTo) return false
      return true
    })
  }, [incidents, filters])

  return (
    <div className={`app ${drawerOpen ? 'app-drawer-open' : ''} ${isFullscreen ? 'app-fullscreen' : ''}`}>
      {!isFullscreen && (
        <header className="app-header">
          <div className="app-title">
            <span className="app-title-mark">✡</span>
            <div>
              <h1>Antisemitism Incident Tracker</h1>
              <p>Tracking incidents reported since October 7, 2023</p>
            </div>
          </div>
          <div className="app-header-stats">
            <div className="app-header-stat">
              <span className="app-header-stat-number">{filteredIncidents.length.toLocaleString()}</span>
              <span className="app-header-stat-label">incidents shown</span>
            </div>
            <div className="app-header-stat" title="US: every individual incident (ADL feed). Other countries: their official published total, not just the ones we could individually map.">
              <span className="app-header-stat-number">{worldwideTotal.toLocaleString()}</span>
              <span className="app-header-stat-label">total reported worldwide</span>
            </div>
          </div>
        </header>
      )}

      <FilterBar
        filters={filters}
        onChange={(next) => {
          setFilters(next)
          setClusterIncidents(null)
          setClusterMeta(null)
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
        <button className="fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit full screen' : 'Full screen'}>
          {isFullscreen ? '⤡' : '⤢'}
        </button>
        <div className="map-column" style={{ display: mainTab === 'globe' ? 'block' : 'none' }}>
          <GlobeView
            incidents={filteredIncidents}
            onSelectIncident={setSelected}
            onClusterSelect={(items, meta) => {
              setClusterIncidents(items)
              setClusterMeta(meta ?? null)
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

      <CoverageNote incidents={incidents} />

      <DonateSection />

      <IncidentDrawer
        incidents={filteredIncidents}
        clusterIncidents={clusterIncidents}
        clusterMeta={clusterMeta}
        onSelectIncident={setSelected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onClearCluster={() => {
          setClusterIncidents(null)
          setClusterMeta(null)
        }}
      />
      <IncidentDetail incident={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
