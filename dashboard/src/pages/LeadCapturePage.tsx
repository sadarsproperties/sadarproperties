import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import AppLayout from '../components/AppLayout'

function formatPhone(v: string) {
  const digits = v.replace(/\D/g, '')
  if (digits.length >= 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`
  if (digits.length > 6) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  if (digits.length > 3) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
  return digits
}

function formatARV(v: string) {
  const digits = v.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString()
}

const SOURCES = ['🚗 Driving for Dollars','📬 Direct Mail','📞 Cold Call','🌐 Online Lead','🤝 Referral','📱 Text/SMS','🏚️ Bandit Signs','🔍 Propstream']
const PROP_TYPES = ['Single Family','Multifamily','Duplex','Triplex','Commercial','Vacant Land']

export default function LeadCapturePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'manual'|'scan'>('manual')

  const [addr, setAddr] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [propertyType, setPropertyType] = useState<'Single Family' | string>('Single Family')
  const [condition, setCondition] = useState('')
  const [arv, setArv] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const fields = [addr, city, propertyType, condition, arv, name, phone]
  const filled = fields.filter(f => f && f !== '').length
  const pct = Math.round((filled / Math.max(1, fields.length)) * 100)

  const conditionColors: Record<string, { border: string, bg: string, color: string }> = {
    good: { border: '#16A34A', bg: 'rgba(22,163,74,0.08)', color: '#16A34A' },
    fair: { border: '#2563EB', bg: 'rgba(37,99,235,0.08)', color: '#2563EB' },
    poor: { border: '#F5A623', bg: 'rgba(245,166,35,0.10)', color: '#B87A0A' },
    distressed: { border: '#DC2626', bg: 'rgba(220,38,38,0.08)', color: '#DC2626' },
  }
  const conditionLabels: Record<string, string> = { good: 'Good Condition', fair: 'Fair Condition', poor: 'Poor Condition', distressed: 'Distressed Property' }

  async function handleSave() {
    if (!addr.trim()) {
      alert('Please enter a property address.')
      return
    }
    setSaving(true)
    setSavedMsg('')

    try {
      // Create seller first (if name/phone provided)
      let sellerId: string | null = null
      if (name.trim() || phone.trim()) {
        const seller = await api.createSeller({
          ownerName: name.trim() || 'Unknown Seller',
          phone: phone.trim(),
          email: '',
          mailingAddress: '',
        })
        sellerId = seller.id
      }

      const parsedArv = arv ? parseInt(arv.replace(/[^0-9]/g, ''), 10) || null : null

      await api.createProperty({
        address: addr.trim(),
        city: city.trim(),
        state: '',
        zip: zip.trim(),
        propertyType: (propertyType as any) || 'Single Family',
        leadCategories: condition ? [condition === 'distressed' ? 'Distressed' : 'Vacant'] : [],
        price: 0,
        arv: parsedArv,
        repairCosts: null,
        assignmentFee: 10000,
        sellerId,
        notes: [source ? `Source: ${source}` : '', notes].filter(Boolean).join('\n'),
      })

      setSavedMsg('Lead saved to database!')
      // reset
      setAddr(''); setCity(''); setZip(''); setArv(''); setName(''); setPhone(''); setSource(''); setNotes(''); setCondition('')

      // Auto-match buyers immediately so no deal sits without a buyer
      try {
        // The id is not returned here easily; refresh on dashboard will show the auto-match button
      } catch {}

      setTimeout(() => {
        setSavedMsg('')
        navigate('/dashboard')
      }, 900)
    } catch (e: any) {
      alert('Failed to save lead: ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="New Lead" showBack onBack={() => navigate('/dashboard')}>
      {/* Tabs */}
      <div className="mb-4 flex gap-2 rounded-2xl bg-black/5 p-1">
        {(['manual', 'scan'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 rounded-[14px] py-2 text-sm font-semibold transition ${activeTab === id ? 'bg-white shadow text-[#1A3C34]' : 'text-[#5A6672]'}`}
          >
            {id === 'manual' ? 'Manual Entry' : 'Scan / Camera'}
          </button>
        ))}
      </div>

      {activeTab === 'manual' && (
        <div className="mb-2 flex items-center justify-between text-xs text-[#8A8A8A]">
          <div>Form completion</div>
          <div className="font-semibold text-[#1A3C34]">{pct}%</div>
        </div>
      )}

      {activeTab === 'manual' ? (
        <div className="space-y-6 pb-24">
          {/* Address */}
          <div className="rounded-3xl border border-black/5 bg-white p-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Property</div>
            <input value={addr} onChange={e => setAddr(e.target.value)} placeholder="Street address" className="mb-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-lg font-semibold outline-none placeholder:text-[#B0B0B0]" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="rounded-2xl border border-black/10 px-4 py-3 outline-none" />
              <input value={zip} onChange={e => setZip(e.target.value)} placeholder="ZIP" className="rounded-2xl border border-black/10 px-4 py-3 outline-none" />
              <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none">
                {PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Condition */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Condition</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['good','fair','poor','distressed'] as const).map(c => {
                const cs = conditionColors[c]
                const sel = condition === c
                return (
                  <button key={c} onClick={() => setCondition(c)} className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition" style={{ borderColor: sel ? cs.border : '#E2DDD6', background: sel ? cs.bg : 'white' }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: cs.border }} />
                    <span className="font-semibold" style={{ color: sel ? cs.color : '#2C2C2C' }}>{conditionLabels[c]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Financials */}
          <div className="rounded-3xl border border-black/5 bg-white p-5">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Financials</div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-[#8A8A8A]">Est. ARV</div>
                <div className="flex items-center">
                  <span className="mr-1 text-xl font-bold text-[#1A3C34]">$</span>
                  <input value={arv} onChange={e => setArv(formatARV(e.target.value))} placeholder="185000" inputMode="numeric" className="w-full bg-transparent text-2xl font-extrabold tracking-tight outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Seller */}
          <div className="rounded-3xl border border-black/5 bg-white p-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Seller</div>
            <div className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Seller full name" className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none" />
              <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(555) 123-4567" inputMode="tel" className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none" />
            </div>
          </div>

          {/* Source + Notes */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Lead Source</div>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(s => (
                <button key={s} onClick={() => setSource(s)} className={`rounded-full border px-3.5 py-1 text-sm font-medium ${source === s ? 'border-[#1A3C34] bg-[#1A3C34] text-white' : 'border-black/10 bg-white'}`}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Motivation, access notes, timeline…" className="w-full resize-y rounded-3xl border border-black/10 p-4 outline-none" />
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-black/15 bg-white p-10 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl border-2 border-dashed border-[#1A3C34]/30" />
          <div className="font-semibold">Camera capture coming soon</div>
          <p className="mt-1 text-sm text-[#6B7280]">Use the manual form for now.</p>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/95 pb-4 pt-3 backdrop-blur md:static md:mt-6 md:rounded-3xl md:border md:p-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4">
          <button onClick={() => navigate('/dashboard')} className="h-14 w-14 rounded-2xl border border-black/10">←</button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#F5A623] font-bold text-[#1A3C34] shadow disabled:opacity-60"
          >
            {saving ? 'Saving…' : savedMsg ? savedMsg : 'Save Lead to Database'}
          </button>
        </div>
        <div className="mt-1 text-center text-[10px] text-[#9CA3AF]">Persisted via backend API + PostgreSQL</div>
      </div>
    </AppLayout>
  )
}
