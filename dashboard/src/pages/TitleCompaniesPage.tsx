import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { TitleCompany } from '../types'
import AppLayout from '../components/AppLayout'
import { ExportMenu } from '../components/ExportMenu'
import { CsvImport } from '../components/CsvImport'

const TITLE_CSV_COLUMNS = ['companyName', 'contactName', 'phone', 'email', 'address', 'state', 'countyName', 'source', 'sourceUrl', 'notes']

export default function TitleCompaniesPage() {
  const [titleCompanies, setTitleCompanies] = useState<TitleCompany[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [countyFilter, setCountyFilter] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [newTc, setNewTc] = useState({
    companyName: '', contactName: '', phone: '', email: '', address: '',
    state: '', countyName: '', notes: '',
  })

  async function fetchTitleCompanies() {
    setLoading(true)
    try {
      // The generic list endpoint doesn't filter title companies server-side, so
      // all filtering (name, state, county) is applied client-side here.
      let data = await api.getTitleCompanies()
      const q = name.trim().toLowerCase()
      if (q) data = data.filter(t => (t.companyName || '').toLowerCase().includes(q) || (t.contactName || '').toLowerCase().includes(q))
      const st = stateFilter.trim().toLowerCase()
      if (st) data = data.filter(t => (t.state || '').toLowerCase().includes(st))
      const co = countyFilter.trim().toLowerCase()
      if (co) data = data.filter(t => (t.countyName || '').toLowerCase().includes(co))
      setTitleCompanies(data)
    } catch (e) {
      console.error('Failed to load title companies:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTitleCompanies() }, [name, stateFilter, countyFilter])

  async function handleDelete(id: string) {
    if (!confirm('Delete this title company?')) return
    try {
      await api.deleteTitleCompany(id)
      setTitleCompanies(prev => prev.filter(t => t.id !== id))
    } catch { alert('Failed to delete title company.') }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newTc.companyName.trim()) { alert('Company name is required.'); return }
    try {
      await api.createTitleCompany({
        companyName: newTc.companyName.trim(),
        contactName: newTc.contactName.trim(),
        phone: newTc.phone.trim(),
        email: newTc.email.trim(),
        address: newTc.address.trim(),
        state: newTc.state.trim(),
        countyName: newTc.countyName.trim(),
        notes: newTc.notes.trim(),
      })
      setShowAddModal(false)
      setNewTc({ companyName: '', contactName: '', phone: '', email: '', address: '', state: '', countyName: '', notes: '' })
      fetchTitleCompanies()
    } catch { alert('Failed to create title company.') }
  }

  async function handleCsvImport(rows: Record<string, string>[]) {
    const cleaned = rows.filter(r => (r.companyName || '').trim())
    if (cleaned.length === 0) { alert('No valid rows found (companyName is required).'); return }
    try {
      await api.bulkTitleCompanies(cleaned as any)
      fetchTitleCompanies()
    } catch { alert('CSV import failed.') }
  }

  const totalCount = titleCompanies.length
  const withContact = titleCompanies.filter(t => (t.contactName || '').trim()).length
  const withCounty = titleCompanies.filter(t => (t.countyName || '').trim()).length

  return (
    <AppLayout title="Title Company Directory">
      {/* Header Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Total Companies</div>
          <div className="mt-1 text-3xl font-extrabold text-[#1A3C34]">{totalCount}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">With Contact</div>
          <div className="mt-1 text-3xl font-extrabold text-[#F5A623]">{withContact}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">County Assigned</div>
          <div className="mt-1 text-3xl font-extrabold text-[#0BA887]">{withCounty}</div>
        </div>
      </div>

      {/* Filter + Actions */}
      <div className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-lg font-bold text-[#1A3C34]">Search & Filter Title Companies</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-2xl bg-[#1A3C34] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1A3C34]/95 active:scale-[0.98]"
            >
              + Add Title Company
            </button>
            <CsvImport columns={TITLE_CSV_COLUMNS} onImport={handleCsvImport} />
            <ExportMenu rows={titleCompanies as any} filename="title-companies-export" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Company / Contact</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. First American"
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
        <div className="py-12 text-center text-sm font-semibold text-[#6B7280]">Loading title companies…</div>
      ) : titleCompanies.length === 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white p-12 text-center text-sm font-semibold text-[#6B7280] shadow-sm">
          No title companies yet. Add one manually or import a CSV.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-[#F9F6F1] text-left text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">County</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {titleCompanies.map(t => (
                  <tr key={t.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                    <td className="px-4 py-3 font-semibold text-[#1A3C34]">{t.companyName}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{t.contactName || '—'}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{t.phone || '—'}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{t.email || '—'}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{t.countyName || '—'}</td>
                    <td className="px-4 py-3 text-[#2C2C2C]">{t.state || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
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

      {/* Add Title Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-black/5 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#1A3C34]">Add New Title Company</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#8A8A8A] hover:text-black">✕</button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Company Name *</label>
                  <input type="text" required value={newTc.companyName}
                    onChange={e => setNewTc({ ...newTc, companyName: e.target.value })}
                    placeholder="e.g. First American Title"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Contact Name</label>
                  <input type="text" value={newTc.contactName}
                    onChange={e => setNewTc({ ...newTc, contactName: e.target.value })}
                    placeholder="e.g. John Smith"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Phone</label>
                  <input type="text" value={newTc.phone}
                    onChange={e => setNewTc({ ...newTc, phone: e.target.value })}
                    placeholder="e.g. (555) 123-4567"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Email</label>
                  <input type="email" value={newTc.email}
                    onChange={e => setNewTc({ ...newTc, email: e.target.value })}
                    placeholder="e.g. escrow@firstam.com"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Address</label>
                <input type="text" value={newTc.address}
                  onChange={e => setNewTc({ ...newTc, address: e.target.value })}
                  placeholder="e.g. 123 Main St, St. Louis, MO"
                  className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">County</label>
                  <input type="text" value={newTc.countyName}
                    onChange={e => setNewTc({ ...newTc, countyName: e.target.value })}
                    placeholder="e.g. St. Louis"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">State</label>
                  <input type="text" value={newTc.state}
                    onChange={e => setNewTc({ ...newTc, state: e.target.value })}
                    placeholder="e.g. MO"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Notes</label>
                <textarea value={newTc.notes}
                  onChange={e => setNewTc({ ...newTc, notes: e.target.value })}
                  rows={2}
                  placeholder="Turnaround time, fees, relationship notes…"
                  className="w-full resize-y rounded-2xl border border-black/10 p-3 outline-none focus:border-[#1A3C34]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5">
                  Cancel
                </button>
                <button type="submit"
                  className="rounded-2xl bg-[#F5A623] px-6 py-2 text-sm font-bold text-[#1A3C34] shadow hover:brightness-95">
                  Add Title Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
