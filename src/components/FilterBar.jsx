import { TYPE_COLORS, TYPE_LABELS } from '../typeColors'

const ALL_TYPES = Object.keys(TYPE_COLORS)

export default function FilterBar({ filters, onChange }) {
  function toggleType(type) {
    const types = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type]
    onChange({ ...filters, types })
  }

  function reset() {
    onChange({ types: ALL_TYPES, dateFrom: '2023-10-07', dateTo: new Date().toISOString().slice(0, 10) })
  }

  return (
    <div className="filter-bar">
      <div className="filter-types">
        {ALL_TYPES.map((type) => (
          <label key={type} className="filter-checkbox" style={{ borderColor: TYPE_COLORS[type] }}>
            <input
              type="checkbox"
              checked={filters.types.includes(type)}
              onChange={() => toggleType(type)}
            />
            {TYPE_LABELS[type]}
          </label>
        ))}
      </div>
      <div className="filter-dates">
        <label>
          From
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          />
        </label>
        <button onClick={reset}>Reset filters</button>
      </div>
    </div>
  )
}
