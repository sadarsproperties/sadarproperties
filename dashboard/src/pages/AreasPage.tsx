import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { AreaStat, County, City } from '../types'
import AppLayout from '../components/AppLayout'
import { ExportMenu } from '../components/ExportMenu'

export default function AreasPage() {
  const [stats, setStats] = useState<AreaStat[]>([])
  const [counties, setCounties] = useState<County[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)

  const [showCountyModal, setShowCountyModal] = useState(false)
  const [showCityModal, setShowCityModal] = useState(false)
  const [newCounty, setNewCounty] = useState({ state: '', countyName: '' })
  const [newCity, setNewCity] = useState({ countyId: '', cityName: '' })

  async function fetchAll() {
    setLoading(true)
    try {
      const [statsData, countyData, cityData] = await Promise.all([
        api.getAreaStats(),
        api.getCounties(),
        api.getCities(),
      ])
      setStats(statsData)
      setCounties(countyData)
      setCities(cityData)
    } catch (e) {
      console.error('Failed to load area analytics:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  async function handleAddCounty(e: React.FormEvent) {
    e.preventDefault()
    if (!newCounty.state.trim() || !newCounty.countyName.trim()) { alert('State and county name are required.'); return }
    try {
      await api.createCounty({ state: newCounty.state.trim(), countyName: newCounty.countyName.trim() })
      setShowCountyModal(false)
      setNewCounty({ state: '', countyName: '' })
      fetchAll()
    } catch { alert('Failed to add county (it may already exist).') }
  }

  async function handleAddCity(e: React.FormEvent) {
    e.preventDefault()
    if (!newCity.countyId || !newCity.cityName.trim()) { alert('County and city name are required.'); return }
    const parent = counties.find(c => c.id === newCity.countyId)
    try {
      await api.createCity({
        countyId: newCity.countyId,
        cityName: newCity.cityName.trim(),
        state: parent?.state || '',
        countyName: parent?.countyName || '',
      })
      setShowCityModal(false)
      setNewCity({ countyId: '', cityName: '' })
      fetchAll()
    } catch { alert('Failed to add city (it may already exist).') }
  }

  const citiesFor = (countyId: string) => cities.filter(c => c.countyId === countyId)

  const totals = stats.reduce((acc, s) => ({
    properties: acc.properties + s.properties,
    sellers: acc.sellers + s.sellers,
    buyers: acc.buyers + s.buyers,
    investors: acc.investors + s.investors,
    realtors: acc.realtors + s.realtors,
    titleCompanies: acc.titleCompanies + s.titleCompanies,
  }), { properties: 0, sellers: 0, buyers: 0, investors: 0, realtors: 0, titleCompanies: 0 })

  return (
    <AppLayout title="Geography & Market Analytics">
      {/* Totals */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Properties</div>
          <div className="mt-1 text-3xl font-extrabold text-[#1A3C34]">{totals.properties}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Sellers</div>
          <div className="mt-1 text-3xl font-extrabold text-[#1A3C34]">{totals.sellers}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Buyers</div>
          <div className="mt-1 text-3xl font-extrabold text-[#F5A623]">{totals.buyers}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Investors</div>
          <div className="mt-1 text-3xl font-extrabold text-[#F5A623]">{totals.investors}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Realtors</div>
          <div className="mt-1 text-3xl font-extrabold text-[#0BA887]">{totals.realtors}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Title Cos</div>
          <div className="mt-1 text-3xl font-extrabold text-[#0BA887]">{totals.titleCompanies}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-[#1A3C34]">County Market Breakdown</div>
            <div className="text-xs text-[#8A8A8A]">Per-county sellers, buyers, realtors, and title companies. Buyer/investor counts reflect buy-box demand for the area.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCountyModal(true)}
              className="rounded-2xl bg-[#1A3C34] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1A3C34]/95 active:scale-[0.98]"
            >
              + Add County
            </button>
            <button
              onClick={() => setShowCityModal(true)}
              disabled={counties.length === 0}
              className="rounded-2xl border border-black/10 px-4 py-2.5 text-sm font-bold text-[#1A3C34] transition hover:bg-black/5 disabled:opacity-40"
            >
              + Add City
            </button>
            <ExportMenu rows={stats as any} filename="area-stats-export" />
          </div>
        </div>
      </div>

      {/* Stats Table */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[#6B7280]">Loading market analytics…</div>
      ) : stats.length === 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white p-12 text-center text-sm font-semibold text-[#6B7280] shadow-sm">
          No counties yet. Add a county to begin tracking per-area market data.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-[#F9F6F1] text-left text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">County</th>
                  <th className="px-4 py-3">Cities</th>
                  <th className="px-4 py-3 text-right">Properties</th>
                  <th className="px-4 py-3 text-right">Sellers</th>
                  <th className="px-4 py-3 text-right">Buyers</th>
                  <th className="px-4 py-3 text-right">Investors</th>
                  <th className="px-4 py-3 text-right">Realtors</th>
                  <th className="px-4 py-3 text-right">Title Cos</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(s => {
                  const cityNames = citiesFor(s.id).map(c => c.cityName)
                  return (
                    <tr key={s.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                      <td className="px-4 py-3 font-semibold text-[#1A3C34]">{s.state}</td>
                      <td className="px-4 py-3 font-semibold text-[#1A3C34]">{s.countyName}</td>
                      <td className="px-4 py-3 text-xs text-[#6B7280]">{cityNames.length ? cityNames.join(', ') : '—'}</td>
                      <td className="px-4 py-3 text-right text-[#2C2C2C]">{s.properties}</td>
                      <td className="px-4 py-3 text-right text-[#2C2C2C]">{s.sellers}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#F5A623]">{s.buyers}</td>
                      <td className="px-4 py-3 text-right text-[#2C2C2C]">{s.investors}</td>
                      <td className="px-4 py-3 text-right text-[#2C2C2C]">{s.realtors}</td>
                      <td className="px-4 py-3 text-right text-[#2C2C2C]">{s.titleCompanies}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add County Modal */}
      {showCountyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#1A3C34]">Add County</h2>
              <button onClick={() => setShowCountyModal(false)} className="text-[#8A8A8A] hover:text-black">✕</button>
            </div>
            <form onSubmit={handleAddCounty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">State *</label>
                <input type="text" required value={newCounty.state}
                  onChange={e => setNewCounty({ ...newCounty, state: e.target.value })}
                  placeholder="e.g. MO"
                  className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">County Name *</label>
                <input type="text" required value={newCounty.countyName}
                  onChange={e => setNewCounty({ ...newCounty, countyName: e.target.value })}
                  placeholder="e.g. St. Louis"
                  className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCountyModal(false)}
                  className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5">
                  Cancel
                </button>
                <button type="submit"
                  className="rounded-2xl bg-[#F5A623] px-6 py-2 text-sm font-bold text-[#1A3C34] shadow hover:brightness-95">
                  Add County
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add City Modal */}
      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#1A3C34]">Add City</h2>
              <button onClick={() => setShowCityModal(false)} className="text-[#8A8A8A] hover:text-black">✕</button>
            </div>
            <form onSubmit={handleAddCity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">County *</label>
                <select required value={newCity.countyId}
                  onChange={e => setNewCity({ ...newCity, countyId: e.target.value })}
                  className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#1A3C34]">
                  <option value="">Select a county…</option>
                  {counties.map(c => (
                    <option key={c.id} value={c.id}>{c.countyName}, {c.state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">City Name *</label>
                <input type="text" required value={newCity.cityName}
                  onChange={e => setNewCity({ ...newCity, cityName: e.target.value })}
                  placeholder="e.g. Florissant"
                  className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCityModal(false)}
                  className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5">
                  Cancel
                </button>
                <button type="submit"
                  className="rounded-2xl bg-[#F5A623] px-6 py-2 text-sm font-bold text-[#1A3C34] shadow hover:brightness-95">
                  Add City
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
