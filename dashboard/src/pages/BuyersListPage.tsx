import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { BuyersTable } from '../components/ContactTables'
import { api } from '../api/client'
import type { Buyer } from '../types'
import AppLayout from '../components/AppLayout'

export default function BuyersListPage() {
  const navigate = useNavigate()
  const { data, refresh, loading } = useStore()
  const [filter, setFilter] = useState<'all' | Buyer['buyerType']>('all')

  // AI Buy Box Extractor state
  const [extractInput, setExtractInput] = useState('')
  const [extractUrl, setExtractUrl] = useState('')
  const [extractResult, setExtractResult] = useState<any>(null)
  const [extracting, setExtracting] = useState(false)

  async function runExtraction() {
    if (!extractInput && !extractUrl) return
    setExtracting(true)
    try {
      const res = await api.extractBuyBox({ text: extractInput, url: extractUrl || undefined })
      setExtractResult(res)
    } catch (e: any) {
      alert('Extraction failed: ' + (e.message || e))
    } finally {
      setExtracting(false)
    }
  }

  async function applyToNewBuyer() {
    if (!extractResult) return
    const name = prompt('Buyer / Investor name?') || 'AI Extracted Buyer'
    try {
      await api.createBuyer({
        fullName: name,
        companyName: 'Extracted via AI',
        phone: '',
        email: '',
        buyerType: 'Cash Buyer',
        buyBox: {
          preferredStates: extractResult.preferredStates || [],
          preferredCities: extractResult.preferredCities || [],
          desiredPropertyTypes: extractResult.desiredPropertyTypes || [],
          maxBudget: extractResult.maxBudget,
        },
      })
      alert('Buyer created from AI extraction!')
      setExtractResult(null)
      setExtractInput('')
      setExtractUrl('')
      refresh()
    } catch (e) {
      alert('Failed to create buyer')
    }
  }

  const filtered = filter === 'all'
    ? data.buyers
    : data.buyers.filter(b => b.buyerType === filter)

  async function handleUpdate(buyer: Buyer) {
    await api.updateBuyer(buyer.id, buyer)
    await refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this buyer?')) return
    await api.deleteBuyer(id)
    await refresh()
  }

  async function addSampleBuyer() {
    await api.createBuyer({
      fullName: 'New Cash Buyer',
      companyName: 'Example Holdings LLC',
      phone: '(555) 000-1234',
      email: 'buyer@example.com',
      buyerType: 'Cash Buyer',
      buyBox: { preferredStates: ['TX', 'GA'], preferredCities: [], desiredPropertyTypes: ['Single Family'], maxBudget: 180000 },
    })
    await refresh()
  }

  return (
    <AppLayout title="Cash Buyers & Investors" showBack onBack={() => navigate('/dashboard')}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'Cash Buyer', 'Fix & Flip', 'Buy & Hold', 'Multifamily Buyer', 'Commercial Buyer'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${filter === f ? 'border-[#1A3C34] bg-[#1A3C34] text-white' : 'border-black/10 bg-white hover:bg-black/5'}`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={addSampleBuyer} className="rounded-2xl bg-[#1A3C34] px-4 py-2 text-sm font-bold text-white">+ Add Buyer</button>
          <button onClick={() => refresh()} className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold">Refresh</button>
        </div>
      </div>

      {/* AI-Powered Buy Box Extraction */}
      <div className="mb-6 rounded-3xl border border-black/5 bg-white p-5">
        <div className="font-semibold mb-2 flex items-center gap-2">🤖 AI Buy Box Extractor <span className="text-xs text-emerald-600">(from LinkedIn / websites / emails)</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={extractUrl} onChange={e=>setExtractUrl(e.target.value)} placeholder="https://linkedin.com/in/investor or website" className="rounded-2xl border px-4 py-2 text-sm" />
          <input value={extractInput} onChange={e=>setExtractInput(e.target.value)} placeholder="Or paste email / profile text here..." className="rounded-2xl border px-4 py-2 text-sm" />
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={runExtraction} disabled={extracting} className="rounded-2xl bg-[#1A3C34] text-white px-5 py-2 text-sm font-semibold disabled:opacity-60">
            {extracting ? 'Extracting...' : 'Extract Buy Box with AI'}
          </button>
          {extractResult && (
            <button onClick={applyToNewBuyer} className="rounded-2xl border px-4 py-2 text-sm">Create Buyer/Investor from this</button>
          )}
        </div>
        {extractResult && (
          <div className="mt-3 text-xs bg-[#F9F6F1] p-3 rounded-2xl">
            <div><strong>States:</strong> {(extractResult.preferredStates||[]).join(', ') || '—'}</div>
            <div><strong>Cities:</strong> {(extractResult.preferredCities||[]).join(', ') || '—'}</div>
            <div><strong>Types:</strong> {(extractResult.desiredPropertyTypes||[]).join(', ') || '—'}</div>
            <div><strong>Max Budget:</strong> {extractResult.maxBudget ? '$' + extractResult.maxBudget.toLocaleString() : '—'}</div>
            {extractResult.notes && <div className="mt-1 text-[#6B7280]">{extractResult.notes}</div>}
          </div>
        )}
      </div>

      {loading && <div className="py-6 text-sm text-[#6B7280]">Loading buyers…</div>}

      <div className="rounded-3xl bg-white p-1 shadow-sm">
        <BuyersTable buyers={filtered} onUpdate={handleUpdate} onDelete={handleDelete} />
      </div>

      <div className="mt-6 text-xs text-[#6B7280]">
        Edits save live to the backend PostgreSQL database. You can also import CSV buyers via the data tools.
      </div>

      {/* Investors section */}
      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold uppercase tracking-widest text-[#8A8A8A]">Investors ({data.investors.length})</div>
        </div>
        <div className="rounded-3xl bg-white p-1 shadow-sm">
          {/* For simplicity reuse the table style; investors table exists */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Max Budget</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.investors.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No investors yet. Seed data or add via API.</td></tr>
                )}
                {data.investors.map(inv => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{inv.investorName}</td>
                    <td className="px-4 py-2">{inv.companyName}</td>
                    <td className="px-4 py-2">{inv.phone}</td>
                    <td className="px-4 py-2">{inv.buyBox.maxBudget ? '$' + inv.buyBox.maxBudget.toLocaleString() : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={async () => { if (confirm('Delete investor?')) { await api.deleteInvestor(inv.id); refresh() } }} className="text-xs text-rose-500">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
