import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { api } from '../api/client'
import AppLayout from '../components/AppLayout'
import { ExportMenu } from '../components/ExportMenu'
import { PROPERTY_TYPES, LEAD_CATEGORIES, type Property } from '../types'
import { PropertyDrawer } from '../components/PropertyDrawer'

const SOURCES = [
  'Zillow',
  'Redfin',
  'Realtor.com',
  'PropStream',
  'BatchLeads',
  'DealMachine',
  'LoopNet',
  'Crexi',
  'County Records',
  'Foreclosure Lists',
  'Tax Delinquent Lists',
  'Manual'
]

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under $10,000', min: 0, max: 9999 },
  { label: '$10,000 – $25,000', min: 10000, max: 25000 },
  { label: '$25,000 – $50,000', min: 25001, max: 50000 },
  { label: '$50,000 – $100,000', min: 50001, max: 100000 },
  { label: '$100,000 – $250,000', min: 100001, max: 250000 },
  { label: '$250,000 and above', min: 250001, max: Infinity }
]

export default function PropertiesPage() {
  const navigate = useNavigate()
  const { data, loading, refresh } = useStore()
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  // State for search and filters
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [selectedPropType, setSelectedPropType] = useState<string>('All')
  const [selectedLeadCat, setSelectedLeadCat] = useState<string>('All')
  const [selectedSource, setSelectedSource] = useState<string>('All')
  const [selectedPriceRangeIdx, setSelectedPriceRangeIdx] = useState<number>(0) // All Prices
  // Best-deals view: score filter + sort + compare selection
  const [scoreFilter, setScoreFilter] = useState<'all' | '70' | '50'>('all')
  const [sortByScore, setSortByScore] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])

  const queryParam = new URLSearchParams(window.location.search).get('q') || ''
  useEffect(() => {
    setSearch(queryParam)
  }, [queryParam])

  // Filtered properties
  const filteredProperties = useMemo(() => {
    const range = PRICE_RANGES[selectedPriceRangeIdx]
    
    return data.properties.filter(p => {
      // 1. Search filter
      const searchLower = search.toLowerCase()
      const matchesSearch = 
        !search ||
        p.address.toLowerCase().includes(searchLower) ||
        p.city.toLowerCase().includes(searchLower) ||
        p.state.toLowerCase().includes(searchLower) ||
        p.zip.toLowerCase().includes(searchLower) ||
        (p.zipCode && p.zipCode.toLowerCase().includes(searchLower))

      // 2. Property Type filter
      const matchesPropType = 
        selectedPropType === 'All' || 
        p.propertyType === selectedPropType

      // 3. Lead Category filter
      const matchesLeadCat = 
        selectedLeadCat === 'All' || 
        p.leadCategories.includes(selectedLeadCat as any)

      // 4. Source filter
      const matchesSource = 
        selectedSource === 'All' || 
        (p.source || 'Manual') === selectedSource

      // 5. Price filter
      const price = p.askingPrice || p.price || 0
      const matchesPrice = price >= range.min && price <= range.max

      // 6. Deal score filter (best-deals)
      const score = p.dealScore || 0
      const matchesScore = scoreFilter === 'all' || score >= (scoreFilter === '70' ? 70 : 50)

      return matchesSearch && matchesPropType && matchesLeadCat && matchesSource && matchesPrice && matchesScore
    }).sort((a, b) =>
      sortByScore ? (b.dealScore || 0) - (a.dealScore || 0) : 0
    )
  }, [data.properties, search, selectedPropType, selectedLeadCat, selectedSource, selectedPriceRangeIdx, scoreFilter, sortByScore])

  const exportRows = useMemo(() => {
    return filteredProperties.map(p => ({
      Address: p.address,
      City: p.city,
      State: p.state,
      'ZIP Code': p.zip || p.zipCode || '',
      'Asking Price': p.askingPrice || p.price || 0,
      ARV: p.arv || '',
      'Property Type': p.propertyType,
      'Lead Categories': p.leadCategories.join(', '),
      Source: p.source || 'Manual',
      'Source URL': p.sourceUrl || '',
      Bedrooms: p.bedrooms || '',
      Bathrooms: p.bathrooms || '',
      Sqft: p.sqft || '',
      'Lot Size': p.lotSize || '',
      'Year Built': p.yearBuilt || '',
      Status: p.status || 'new',
      'Deal Score': p.dealScore || '',
      'Date Added': p.createdAt
    }))
  }, [filteredProperties])

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this property lead?')) return
    try {
      await api.deleteProperty(id)
      refresh()
    } catch (e: any) {
      alert('Delete failed: ' + e.message)
    }
  }

  function toggleCompare(id: string) {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 4) {
        alert('You can compare up to 4 properties at once.')
        return prev
      }
      return [...prev, id]
    })
  }

  return (
    <AppLayout title="Property Database">
      {/* Top filters bar */}
      <div className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by address, city, state, or ZIP..."
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pl-10 text-sm font-semibold outline-none focus:border-[#1A3C34] focus:ring-1 focus:ring-[#1A3C34]"
            />
            <span className="absolute left-3.5 top-3.5 text-gray-400">🔍</span>
          </div>

          {/* Price Range Select */}
          <div>
            <select
              value={selectedPriceRangeIdx}
              onChange={e => setSelectedPriceRangeIdx(Number(e.target.value))}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#1A3C34]"
            >
              {PRICE_RANGES.map((r, idx) => (
                <option key={idx} value={idx}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Export & Actions */}
          <div className="flex justify-end gap-2">
            <ExportMenu rows={exportRows} filename="rewip-properties-database" />
            <button 
              onClick={() => refresh()} 
              className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-black/5"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Categories/Sources filters */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2 border-t border-black/5">
          {/* Property Types */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Property Type</label>
            <select
              value={selectedPropType}
              onChange={e => setSelectedPropType(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#1A3C34]"
            >
              <option value="All">All Types</option>
              {PROPERTY_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Lead Categories */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Lead Category</label>
            <select
              value={selectedLeadCat}
              onChange={e => setSelectedLeadCat(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#1A3C34]"
            >
              <option value="All">All Lead Labels</option>
              {LEAD_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Source Adapter Ingestion Source */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Ingestion Source</label>
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#1A3C34]"
            >
              <option value="All">All Sources</option>
              {SOURCES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Best deals + compare row */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-black/5">
          <select
            value={scoreFilter}
            onChange={e => setScoreFilter(e.target.value as any)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#1A3C34]"
          >
            <option value="all">All Deal Scores</option>
            <option value="70">≥ 70% — good deals</option>
            <option value="50">≥ 50% — decent deals</option>
          </select>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={sortByScore}
              onChange={e => setSortByScore(e.target.checked)}
              className="h-4 w-4 accent-[#1A3C34] rounded"
            />
            Sort by best deal score
          </label>
          <div className="flex-1" />
          {compareIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">{compareIds.length} selected</span>
              <button
                onClick={() => navigate(`/compare?ids=${compareIds.join(',')}`)}
                disabled={compareIds.length < 2}
                className="rounded-xl bg-[#1A3C34] text-white px-4 py-2 text-xs font-bold disabled:opacity-40"
              >
                Compare ({compareIds.length})
              </button>
              <button
                onClick={() => setCompareIds([])}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && <div className="py-6 text-sm text-[#6B7280] text-center">Loading properties…</div>}

      {/* Grid of properties */}
      {!loading && filteredProperties.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white p-12 text-center">
          <div className="text-4xl">📭</div>
          <div className="mt-3 font-semibold text-lg text-[#1A3C34]">No properties matched your criteria</div>
          <p className="mt-1 text-sm text-[#6B7280]">Try clearing some filters or adding new leads.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map(p => {
            const price = p.askingPrice || p.price || 0
            const score = p.dealScore || 0
            const scoreColor = score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-rose-500'
            const tier = score >= 80 ? 'HOT' : score >= 60 ? 'GOOD' : score >= 40 ? 'MARGINAL' : score > 0 ? 'WEAK' : ''
            const tierClass = score >= 80 ? 'bg-rose-100 text-rose-700' : score >= 60 ? 'bg-emerald-100 text-emerald-700' : score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
            const matchCount = p.topMatches?.length || 0

            return (
              <div 
                key={p.id}
                className={`group rounded-3xl border bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${compareIds.includes(p.id) ? 'border-[#F5A623] ring-1 ring-[#F5A623]/40' : 'border-black/5'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-[#1A3C34] group-hover:text-amber-600 transition duration-150">{p.address}</h3>
                    <p className="text-sm font-medium text-slate-500">{p.city}, {p.state} {p.zip || p.zipCode}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(p.id)}
                        onChange={() => toggleCompare(p.id)}
                        className="h-3.5 w-3.5 accent-[#1A3C34] rounded"
                      />
                      Compare
                    </label>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600 uppercase">{p.source || 'Manual'}</span>
                  </div>
                </div>

                <div className="my-4 grid grid-cols-2 gap-2 border-y border-black/5 py-3 text-sm">
                  <div>
                    <span className="block text-xs text-[#8A8A8A]">Asking Price</span>
                    <span className="font-extrabold text-slate-900">${price.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[#8A8A8A]">Est. ARV</span>
                    <span className="font-extrabold text-[#10B981]">{p.arv ? `$${p.arv.toLocaleString()}` : '—'}</span>
                  </div>
                </div>

                {/* Specs */}
                <div className="mb-4 flex gap-3 text-xs text-slate-500">
                  {p.bedrooms && <span>🛏️ {p.bedrooms} Beds</span>}
                  {p.bathrooms && <span>🛁 {p.bathrooms} Baths</span>}
                  {p.sqft && <span>📐 {p.sqft.toLocaleString()} sqft</span>}
                </div>

                {/* Tags */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">{p.propertyType}</span>
                  {p.leadCategories.map(cat => (
                    <span key={cat} className="rounded-lg bg-[#F5A623]/10 px-2 py-0.5 text-xs font-semibold text-[#B87A0A]">{cat}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {score > 0 ? (
                      <>
                        <span className={`text-sm font-extrabold ${scoreColor}`}>Deal Score: {score}%</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${tierClass}`}>{tier} DEAL</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Score Pending</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedProperty(p)} 
                      className="rounded-xl border border-sky-600 bg-sky-50 text-sky-700 px-2.5 py-1.5 text-xs font-bold hover:bg-sky-100"
                    >
                      Details
                    </button>
                    <button 
                      onClick={() => navigate('/deal-analyzer')} 
                      className="rounded-xl bg-[#1A3C34] text-white px-3.5 py-1.5 text-xs font-bold"
                    >
                      Analyze
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)} 
                      className="rounded-xl border border-rose-200 text-rose-500 px-2.5 py-1.5 text-xs font-bold hover:bg-rose-50"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedProperty && (
        <PropertyDrawer
          property={selectedProperty}
          sellers={data.sellers}
          buyers={data.buyers}
          investors={data.investors}
          onClose={() => setSelectedProperty(null)}
          onUpdate={async (updated) => {
            try {
              await api.updateProperty(updated.id, updated);
              await refresh();
              setSelectedProperty(updated);
            } catch (e) {
              alert('Failed to update property details');
            }
          }}
        />
      )}
    </AppLayout>
  )
}
