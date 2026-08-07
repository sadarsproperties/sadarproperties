import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { Realtor } from '../types'
import AppLayout from '../components/AppLayout'
import { ExportMenu } from '../components/ExportMenu'
import { CsvImport } from '../components/CsvImport'

const REALTOR_CSV_COLUMNS = ['name', 'brokerage', 'phone', 'email', 'licenseNumber', 'state', 'countyName', 'city', 'source', 'sourceUrl', 'notes']

export default function RealtorsPage() {
  const [realtors, setRealtors] = useState<Realtor[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [countyFilter, setCountyFilter] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [newRealtor, setNewRealtor] = useState({
    name: '', brokerage: '', phone: '', email: '', licenseNumber: '',
    state: '', countyName: '', city: '', notes: '',
  })

  async function fetchRealtors() {
    setLoading(true)
    try {
      // The generic list endpoint doesn't filter realtors server-side, so all
      // filtering (name, state, county) is applied client-side here.
      let data = await api.getRealtors()
      const q = name.trim().toLowerCase()
      if (q) data = data.filter(r => (r.name || '').toLowerCase().includes(q) || (r.brokerage || '').toLowerCase().includes(q))
      const st = stateFilter.trim().toLowerCase()
      if (st) data = data.filter(r => (r.state || '').toLowerCase().includes(st))
      const co = countyFilter.trim().toLowerCase()
      if (co) data = data.filter(r => (r.countyName || '').toLowerCase().includes(co))
      setRealtors(data)
    } catch (e) {
      console.error('Failed to load realtors:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRealtors() }, [name, stateFilter, countyFilter])

  async function handleDelete(id: string) {
    if (!confirm('Delete this realtor?')) return
    try {
      await api.deleteRealtor(id)
      setRealtors(prev => prev.filter(r => r.id !== id))
    } catch { alert('Failed to delete realtor.') }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newRealtor.name.trim()) { alert('Name is required.'); return }
    try {
      await api.createRealtor({
        name: newRealtor.name.trim(),
        brokerage: newRealtor.brokerage.trim(),
        phone: newRealtor.phone.trim(),
        email: newRealtor.email.trim(),
        licenseNumber: newRealtor.licenseNumber.trim(),
        state: newRealtor.state.trim(),
        countyName: newRealtor.countyName.trim(),
        city: newRealtor.city.trim(),
        notes: newRealtor.notes.trim(),
      })
      setShowAddModal(false)
      setNewRealtor({ name: '', brokerage: '', phone: '', email: '', licenseNumber: '', state: '', countyName: '', city: '', notes: '' })
      fetchRealtors()
    } catch { alert('Failed to create realtor.') }
  }

  async function handleCsvImport(rows: Record<string, string>[]) {
    const cleaned = rows.filter(r => (r.name || '').trim())
    if (cleaned.length === 0) { alert('No valid rows found (name is required).'); return }
    try {
      await api.bulkRealtors(cleaned as any)
      fetchRealtors()
    } catch { alert('CSV import failed.') }
  }

  const totalCount = realtors.length
  const brokerageCount = new Set(realtors.map(r => (r.brokerage || '').trim()).filter(Boolean)).size
  const withCounty = realtors.filter(r => (r.countyName || '').trim()).length

  return (
    <AppLayout title="Realtor Network Directory">
      {/* Header Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Total Realtors</div>
          <div className="mt-1 text-3xl font-extrabold text-[#1A3C34]">{totalCount}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Brokerages</div>
          <div className="mt-1 text-3xl font-extrabold text-[#F5A623]">{brokerageCount}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">County Assigned</div>
          <div className="mt-1 text-3xl font-extrabold text-[#0BA887]">{withCounty}</div>
        </div>
      </div>

      {/* Filter + Actions */}
      <div className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-lg font-bold text-[#1A3C34]">Search & Filter Realtors</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-2xl bg-[#1A3C34] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1A3C34]/95 active:scale-[0.98]"
            >
              + Add Realtor
            </button>
            <CsvImport columns={REALTOR_CSV_COLUMNS} onImport={handleCsvImport} />
            <ExportMenu rows={realtors as any} filename="realtors-export" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Name / Brokerage</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Jane or Keller Williams"
              className="w-full rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">State</label>
            <input
              type="text"
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              placeholder="e.g. MO"
              className="w-full rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">County</label>
            <input
              type="text"
              value={countyFilter}
              onChange={e => setCountyFilter(e.target.value)}
              placeholder="e.g. St. Louis"
              className="w-full rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[#6B7280]">Loading realtors…</div>
      ) : realtors.length === 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white p-12 text-center text-sm font-semibold text-[#6B7280] shadow-sm">
          No realtors yet. Add one manually or import a CSV.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-[#F9F6F1] text-left text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Brokerage</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">County</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {realtors.map(r => (
                  <tr key={r.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                    <td className="px-4 py-3 font-semibold text-[#1A3C34]">{r.name}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{r.brokerage || '—'}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{r.phone || '—'}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{r.email || '—'}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{r.countyName || '—'}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{r.state || '—'}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{r.source || 'Manual'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#B91C1C] hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Realtor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-black/5 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#1A3C34]">Add New Realtor</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#8A8A8A] hover:text-black">✕</button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Full Name *</label>
                  <input type="text" required value={newRealtor.name}
                    onChange={e => setNewRealtor({ ...newRealtor, name: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Brokerage</label>
                  <input type="text" value={newRealtor.brokerage}
                    onChange={e => setNewRealtor({ ...newRealtor, brokerage: e.target.value })}
                    placeholder="e.g. Keller Williams"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Phone</label>
                  <input type="text" value={newRealtor.phone}
                    onChange={e => setNewRealtor({ ...newRealtor, phone: e.target.value })}
                    placeholder="e.g. (555) 123-4567"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Email</label>
                  <input type="email" value={newRealtor.email}
                    onChange={e => setNewRealtor({ ...newRealtor, email: e.target.value })}
                    placeholder="e.g. jane@kw.com"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">License Number</label>
                  <input type="text" value={newRealtor.licenseNumber}
                    onChange={e => setNewRealtor({ ...newRealtor, licenseNumber: e.target.value })}
                    placeholder="e.g. RE123456"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">City</label>
                  <input type="text" value={newRealtor.city}
                    onChange={e => setNewRealtor({ ...newRealtor, city: e.target.value })}
                    placeholder="e.g. St. Louis"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">County</label>
                  <input type="text" value={newRealtor.countyName}
                    onChange={e => setNewRealtor({ ...newRealtor, countyName: e.target.value })}
                    placeholder="e.g. St. Louis"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">State</label>
                  <input type="text" value={newRealtor.state}
                    onChange={e => setNewRealtor({ ...newRealtor, state: e.target.value })}
                    placeholder="e.g. MO"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Notes</label>
                <textarea value={newRealtor.notes}
                  onChange={e => setNewRealtor({ ...newRealtor, notes: e.target.value })}
                  rows={2}
                  placeholder="Specialties, coverage area, relationship notes…"
                  className="w-full resize-y rounded-2xl border border-black/10 p-3 outline-none focus:border-[#1A3C34]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5">
                  Cancel
                </button>
                <button type="submit"
                  className="rounded-2xl bg-[#F5A623] px-6 py-2 text-sm font-bold text-[#1A3C34] shadow hover:brightness-95">
                  Add Realtor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
