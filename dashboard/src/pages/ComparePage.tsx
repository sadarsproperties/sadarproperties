import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import AppLayout from '../components/AppLayout'
import type { Property } from '../types'

function money(v: number | undefined | null) {
  return v ? `$${Number(v).toLocaleString()}` : '—'
}

function tierOf(score: number) {
  if (score >= 80) return { label: 'HOT DEAL', cls: 'bg-rose-100 text-rose-700' }
  if (score >= 60) return { label: 'GOOD DEAL', cls: 'bg-emerald-100 text-emerald-700' }
  if (score >= 40) return { label: 'MARGINAL', cls: 'bg-amber-100 text-amber-700' }
  if (score > 0) return { label: 'WEAK', cls: 'bg-slate-100 text-slate-500' }
  return { label: 'PENDING', cls: 'bg-slate-100 text-slate-400' }
}

interface Row {
  label: string
  values: (string | number)[]
}

function buildRows(props: Property[]): Row[] {
  const field = (label: string, fn: (p: Property) => string | number): Row => ({
    label,
    values: props.map(p => fn(p)),
  })
  return [
    field('Address', p => p.address),
    field('City / State / ZIP', p => [p.city, p.state, p.zip || p.zipCode].filter(Boolean).join(', ') || '—'),
    field('Asking Price', p => money(p.askingPrice || p.price)),
    field('Est. ARV', p => money(p.arv)),
    field('Deal Score', p => (p.dealScore ? `${p.dealScore}%` : '—')),
    field('Bedrooms', p => p.bedrooms ?? '—'),
    field('Bathrooms', p => p.bathrooms ?? '—'),
    field('Sqft', p => (p.sqft ? p.sqft.toLocaleString() : '—')),
    field('Lot Size', p => p.lotSize ?? '—'),
    field('Year Built', p => p.yearBuilt ?? '—'),
    field('Property Type', p => p.propertyType || '—'),
    field('Status', p => p.status || 'new'),
    field('Source', p => p.source || 'Manual'),
    field('Lead Categories', p => p.leadCategories?.join(', ') || '—'),
    field('Source URL', p => p.sourceUrl || '—'),
    field('Date Added', p => (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—')),
  ]
}

export default function ComparePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data } = useStore()

  const ids = (params.get('ids') || '').split(',').filter(Boolean)
  const props = useMemo(
    () => ids.map(id => data.properties.find(p => p.id === id)).filter((p): p is Property => !!p),
    [ids, data.properties]
  )

  const rows = useMemo(() => buildRows(props), [props])

  function exportCsv() {
    if (props.length === 0) return
    const header = ['Field', ...props.map(p => p.address)]
    const lines = rows.map(r => [r.label, ...r.values])
    const csv = [header, ...lines]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'property-comparison.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <AppLayout title="Compare Properties">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate('/properties')}
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-black/5"
        >
          ← Back to Properties
        </button>
        {props.length >= 2 && (
          <button
            onClick={exportCsv}
            className="rounded-xl bg-[#1A3C34] text-white px-4 py-2 text-xs font-bold"
          >
            ⬇ Export Comparison to CSV
          </button>
        )}
        <span className="text-xs font-semibold text-slate-500">{props.length} properties compared</span>
      </div>

      {props.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white p-12 text-center">
          <div className="text-4xl">🔍</div>
          <div className="mt-3 font-semibold text-lg text-[#1A3C34]">No properties to compare</div>
          <p className="mt-1 text-sm text-[#6B7280]">Select 2–4 properties on the Properties page and hit Compare.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-black/10">
                <th className="sticky left-0 bg-white px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-[#8A8A8A]">
                  Field
                </th>
                {props.map(p => {
                  const tier = tierOf(p.dealScore || 0)
                  return (
                    <th key={p.id} className="px-4 py-3 text-left align-top">
                      <div className="font-extrabold text-[#1A3C34]">{p.address}</div>
                      <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {p.city}, {p.state} {p.zip || p.zipCode}
                      </div>
                      <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${tier.cls}`}>
                        {tier.label}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={i % 2 ? 'bg-slate-50/50' : ''}>
                  <td className="sticky left-0 bg-white px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-[#8A8A8A]">
                    {row.label}
                  </td>
                  {row.values.map((v, j) => (
                    <td key={j} className="px-4 py-2.5 font-semibold text-slate-700">
                      {typeof v === 'number' ? v.toLocaleString() : v || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  )
}
