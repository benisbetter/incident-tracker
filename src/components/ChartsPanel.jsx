import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { TYPE_COLORS, TYPE_LABELS } from '../typeColors'

const SEVERITY_COLORS = { low: '#6366f1', moderate: '#ca8a04', high: '#ea580c', critical: '#7f1d1d' }
const SEVERITY_ORDER = ['low', 'moderate', 'high', 'critical']

const TOOLTIP_STYLE = { background: '#141b2d', border: '1px solid #2a3550', color: '#e6e9f2', fontSize: 12 }
const AXIS_TICK = { fontSize: 11, fill: '#8b93a8' }
const LEGEND_STYLE = { fontSize: 12, color: '#8b93a8' }

function groupByMonth(incidents) {
  const byMonth = {}
  for (const incident of incidents) {
    const month = incident.date.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = { month }
    byMonth[month][incident.type] = (byMonth[month][incident.type] ?? 0) + 1
  }
  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))
}

function groupByType(incidents) {
  const counts = {}
  for (const i of incidents) counts[i.type] = (counts[i.type] || 0) + 1
  return Object.entries(counts).map(([type, count]) => ({ type, count }))
}

function groupBySeverity(incidents) {
  const counts = { low: 0, moderate: 0, high: 0, critical: 0 }
  for (const i of incidents) counts[i.severity] = (counts[i.severity] || 0) + 1
  return SEVERITY_ORDER.map((severity) => ({ severity, count: counts[severity] }))
}

const TABS = [
  { id: 'trend', label: 'Monthly Trend' },
  { id: 'type', label: 'By Type' },
  { id: 'severity', label: 'By Severity' },
]

export default function ChartsPanel({ incidents }) {
  const [tab, setTab] = useState('trend')

  return (
    <div className="charts-panel">
      <div className="chart-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`chart-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="chart-body">
        {tab === 'trend' && <TrendChart incidents={incidents} />}
        {tab === 'type' && <TypeChart incidents={incidents} />}
        {tab === 'severity' && <SeverityChart incidents={incidents} />}
      </div>
    </div>
  )
}

function TrendChart({ incidents }) {
  const data = groupByMonth(incidents)
  const types = Object.keys(TYPE_COLORS)
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" />
        <XAxis dataKey="month" tick={AXIS_TICK} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend formatter={(value) => TYPE_LABELS[value] ?? value} wrapperStyle={LEGEND_STYLE} />
        {types.map((type) => (
          <Bar key={type} dataKey={type} stackId="a" fill={TYPE_COLORS[type]} name={type} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function TypeChart({ incidents }) {
  const data = groupByType(incidents)
  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="type" outerRadius={100} label={(d) => TYPE_LABELS[d.type]}>
          {data.map((d) => (
            <Cell key={d.type} fill={TYPE_COLORS[d.type]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend formatter={(value) => TYPE_LABELS[value] ?? value} wrapperStyle={LEGEND_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function SeverityChart({ incidents }) {
  const data = groupBySeverity(incidents)
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" />
        <XAxis dataKey="severity" tick={AXIS_TICK} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count">
          {data.map((d) => (
            <Cell key={d.severity} fill={SEVERITY_COLORS[d.severity]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
