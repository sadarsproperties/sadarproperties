import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SellersTable } from '../components/ContactTables'
import { api } from '../api/client'
import type { Seller } from '../types'
import AppLayout from '../components/AppLayout'
import { ExportMenu } from '../components/ExportMenu'

export default function SellersListPage() {
  const navigate = useNavigate()
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)

  // Filters state
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [zipOrState, setZipOrState] = useState('')
  const [ownershipType, setOwnershipType] = useState<'all' | 'Individual' | 'LLC/Entity'>('all')
  const [equityMin, setEquityMin] = useState('')
  const [equityMax, setEquityMax] = useState('')
  const [yearsMin, setYearsMin] = useState('')
  const [yearsMax, setYearsMax] = useState('')
  const [skipTracedFilter, setSkipTracedFilter] = useState<'all' | 'traced' | 'untraced'>('all')

  // Add Seller Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSeller, setNewSeller] = useState({
    ownerName: '',
    phone: '',
    email: '',
    mailingAddress: '',
    ownershipType: 'Individual' as 'Individual' | 'LLC/Entity',
    entityName: '',
    equityEstimate: '',
    ownershipYears: '',
    skipTraced: false,
    contactNotes: ''
  })

  async function fetchSellers() {
    setLoading(true)
    try {
      // Build query string params matching the backend filters
      const params: Record<string, string> = {}
      if (ownerName.trim()) params.ownerName = ownerName.trim()
      if (phone.trim()) params.phone = phone.trim()
      if (email.trim()) params.email = email.trim()
      if (zipOrState.trim()) {
        const clean = zipOrState.trim()
        if (/^\d+$/.test(clean)) {
          params.zip = clean
        } else {
          params.state = clean
        }
      }
      if (ownershipType !== 'all') params.ownershipType = ownershipType
      if (equityMin.trim()) params.equityMin = equityMin.trim()
      if (equityMax.trim()) params.equityMax = equityMax.trim()
      if (yearsMin.trim()) params.yearsMin = yearsMin.trim()
      if (yearsMax.trim()) params.yearsMax = yearsMax.trim()

      const data = await api.getSellers(params)
      
      // Perform frontend-only filters (like skip-trace status filter)
      let filtered = data
      if (skipTracedFilter === 'traced') {
        filtered = filtered.filter(s => s.skipTraced)
      } else if (skipTracedFilter === 'untraced') {
        filtered = filtered.filter(s => !s.skipTraced)
      }

      setSellers(filtered)
    } catch (e: any) {
      console.error('Failed to load sellers:', e)
    } finally {
      setLoading(false)
    }
  }

  // Reload when search filters or pagination parameters modify
  useEffect(() => {
    fetchSellers()
  }, [
    ownerName,
    phone,
    email,
    zipOrState,
    ownershipType,
    equityMin,
    equityMax,
    yearsMin,
    yearsMax,
    skipTracedFilter
  ])

  async function handleUpdateSeller(seller: Seller) {
    try {
      await api.updateSeller(seller.id, seller)
      setSellers(prev => prev.map(s => s.id === seller.id ? seller : s))
    } catch (e) {
      alert('Failed to update seller.')
    }
  }

  async function handleDeleteSeller(id: string) {
    if (!confirm('Are you sure you want to delete this seller?')) return
    try {
      await api.deleteSeller(id)
      setSellers(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      alert('Failed to delete seller.')
    }
  }

  async function handleAddSellerSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newSeller.ownerName.trim()) {
      alert('Owner name is required.')
      return
    }

    try {
      const payload = {
        ownerName: newSeller.ownerName.trim(),
        phone: newSeller.phone.trim(),
        email: newSeller.email.trim(),
        mailingAddress: newSeller.mailingAddress.trim(),
        ownershipType: newSeller.ownershipType,
        entityName: newSeller.entityName.trim(),
        equityEstimate: newSeller.equityEstimate ? parseFloat(newSeller.equityEstimate) : null,
        ownershipYears: newSeller.ownershipYears ? parseInt(newSeller.ownershipYears, 10) : null,
        skipTraced: newSeller.skipTraced,
        contactNotes: newSeller.contactNotes.trim(),
      }

      await api.createSeller(payload)
      setShowAddModal(false)
      // Reset form
      setNewSeller({
        ownerName: '',
        phone: '',
        email: '',
        mailingAddress: '',
        ownershipType: 'Individual',
        entityName: '',
        equityEstimate: '',
        ownershipYears: '',
        skipTraced: false,
        contactNotes: ''
      })
      fetchSellers()
    } catch (err) {
      alert('Failed to create seller.')
    }
  }

  // Compute stat metrics for the cards
  const totalCount = sellers.length
  const llcCount = sellers.filter(s => s.ownershipType === 'LLC/Entity').length
  const skipTracedCount = sellers.filter(s => s.skipTraced).length

  return (
    <AppLayout title="Seller Intelligence Directory">
      {/* Header Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Total Owners</div>
          <div className="mt-1 text-3xl font-extrabold text-[#1A3C34]">{totalCount}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">LLC / Corporate Entities</div>
          <div className="mt-1 text-3xl font-extrabold text-[#F5A623]">{llcCount}</div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Skip Traced</div>
          <div className="mt-1 text-3xl font-extrabold text-[#0BA887]">{skipTracedCount}</div>
        </div>
      </div>

      {/* Main Filter Control Grid */}
      <div className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-lg font-bold text-[#1A3C34]">Search & Filter Criteria</div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-2xl bg-[#1A3C34] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1A3C34]/95 active:scale-[0.98]"
            >
              + Add Seller
            </button>
            <ExportMenu rows={sellers as any} filename="seller-intelligence-export" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {/* Row 1 */}
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Owner Name</label>
            <input
              type="text"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              placeholder="e.g. Robert"
              className="w-full rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 555-0144"
              className="w-full rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Email Address</label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. maria.lopez"
              className="w-full rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Mailing State or ZIP</label>
            <input
              type="text"
              value={zipOrState}
              onChange={e => setZipOrState(e.target.value)}
              placeholder="e.g. MO or 63106"
              className="w-full rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
            />
          </div>

          {/* Row 2 */}
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Ownership Type</label>
            <select
              value={ownershipType}
              onChange={e => setOwnershipType(e.target.value as any)}
              className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 outline-none focus:border-[#1A3C34]"
            >
              <option value="all">All Ownership Types</option>
              <option value="Individual">Individual</option>
              <option value="LLC/Entity">LLC/Corporate Entity</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Equity Estimate Range ($)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={equityMin}
                onChange={e => setEquityMin(e.target.value)}
                placeholder="Min"
                className="w-1/2 rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
              />
              <input
                type="number"
                value={equityMax}
                onChange={e => setEquityMax(e.target.value)}
                placeholder="Max"
                className="w-1/2 rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Years Owned Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={yearsMin}
                onChange={e => setYearsMin(e.target.value)}
                placeholder="Min"
                className="w-1/2 rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
              />
              <input
                type="number"
                value={yearsMax}
                onChange={e => setYearsMax(e.target.value)}
                placeholder="Max"
                className="w-1/2 rounded-2xl border border-black/10 px-3 py-2.5 outline-none focus:border-[#1A3C34]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Skip Tracing Status</label>
            <select
              value={skipTracedFilter}
              onChange={e => setSkipTracedFilter(e.target.value as any)}
              className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 outline-none focus:border-[#1A3C34]"
            >
              <option value="all">All Sellers</option>
              <option value="traced">Traced Only</option>
              <option value="untraced">Not Traced Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sellers List Table */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[#6B7280]">Loading owners data…</div>
      ) : (
        <SellersTable
          sellers={sellers}
          onUpdate={handleUpdateSeller}
          onDelete={handleDeleteSeller}
        />
      )}

      {/* Add Seller Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-black/5 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#1A3C34]">Add New Seller</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#8A8A8A] hover:text-black">✕</button>
            </div>
            <form onSubmit={handleAddSellerSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newSeller.ownerName}
                    onChange={e => setNewSeller({...newSeller, ownerName: e.target.value})}
                    placeholder="e.g. Marcus Aurelius"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Mailing Address</label>
                  <input
                    type="text"
                    value={newSeller.mailingAddress}
                    onChange={e => setNewSeller({...newSeller, mailingAddress: e.target.value})}
                    placeholder="e.g. 100 Colosseum Dr, Rome, GA"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newSeller.phone}
                    onChange={e => setNewSeller({...newSeller, phone: e.target.value})}
                    placeholder="e.g. (555) 123-4567"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newSeller.email}
                    onChange={e => setNewSeller({...newSeller, email: e.target.value})}
                    placeholder="e.g. marcus@empire.com"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Ownership Type</label>
                  <select
                    value={newSeller.ownershipType}
                    onChange={e => setNewSeller({...newSeller, ownershipType: e.target.value as any})}
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#1A3C34]"
                  >
                    <option value="Individual">Individual</option>
                    <option value="LLC/Entity">LLC/Corporate Entity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Company / Entity Name</label>
                  <input
                    type="text"
                    value={newSeller.entityName}
                    onChange={e => setNewSeller({...newSeller, entityName: e.target.value})}
                    placeholder="e.g. Aurelius Flip LLC"
                    disabled={newSeller.ownershipType !== 'LLC/Entity'}
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34] disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Equity Estimate ($)</label>
                  <input
                    type="number"
                    value={newSeller.equityEstimate}
                    onChange={e => setNewSeller({...newSeller, equityEstimate: e.target.value})}
                    placeholder="85000"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Ownership Years</label>
                  <input
                    type="number"
                    value={newSeller.ownershipYears}
                    onChange={e => setNewSeller({...newSeller, ownershipYears: e.target.value})}
                    placeholder="7"
                    className="w-full rounded-2xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]"
                  />
                </div>
                <div className="flex flex-col justify-end pb-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#2C2C2C] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSeller.skipTraced}
                      onChange={e => setNewSeller({...newSeller, skipTraced: e.target.checked})}
                      className="h-5 w-5 rounded border-black/10 text-[#1A3C34] focus:ring-[#1A3C34]"
                    />
                    Skip Traced
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Internal Outreach / Contact Notes</label>
                <textarea
                  value={newSeller.contactNotes}
                  onChange={e => setNewSeller({...newSeller, contactNotes: e.target.value})}
                  rows={2}
                  placeholder="Motivation, conversation outcome, next outreach date..."
                  className="w-full resize-y rounded-2xl border border-black/10 p-3 outline-none focus:border-[#1A3C34]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-[#F5A623] px-6 py-2 text-sm font-bold text-[#1A3C34] shadow hover:brightness-95"
                >
                  Add Seller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
