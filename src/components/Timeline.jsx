import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TYPE_COLORS, TYPE_LABELS } from '../typeColors'

function groupByMonth(incidents) {
  const byMonth = {}
  for (const incident of incidents) {
    const month = incident.date.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = { month }
    byMonth[month][incident.type] = (byMonth[month][incident.type] ?? 0) + 1
  }
  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))
}

export default function Timeline({ incidents }) {
  const data = groupByMonth(incidents)
  const types = Object.keys(TYPE_COLORS)

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 13 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 13 }} />
        <Tooltip />
        <Legend formatter={(value) => TYPE_LABELS[value] ?? value} />
        {types.map((type) => (
          <Bar key={type} dataKey={type} stackId="a" fill={TYPE_COLORS[type]} name={type} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
