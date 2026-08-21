import countryTotals from '../data/countryTotals.json'

export default function CoverageNote({ incidents }) {
  const entries = Object.entries(countryTotals)
    .map(([country, info]) => {
      const documented = incidents.filter((i) => i.location.state === country).length
      return { country, documented, ...info }
    })
    .filter((e) => e.documented > 0)

  if (entries.length === 0) return null

  return (
    <div className="coverage-note">
      <strong>US data</strong> is a full incident-by-incident feed (ADL H.E.A.T. Map). Outside the US, no bulk database
      exists — incidents below are individually researched and sourced, so the map shows a subset of each country's
      official total, not every case.
      <ul>
        {entries.map((e) => (
          <li key={e.country}>
            <strong>{e.country}:</strong> {e.documented.toLocaleString()} individually mapped, of{' '}
            <a href={e.source_url} target="_blank" rel="noreferrer">
              ~{e.total.toLocaleString()} reported by {e.source_name}
            </a>{' '}
            ({e.period})
          </li>
        ))}
      </ul>
    </div>
  )
}
