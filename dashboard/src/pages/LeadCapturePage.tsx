import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import AppLayout from '../components/AppLayout'
import { PROPERTY_TYPES, LEAD_CATEGORIES } from '../types'

const INGESTION_SOURCES = [
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
  'FSBO (For Sale By Owner)',
  'Auction.com',
  'Subject-To',
  'Manual'
]

function formatPhone(v: string) {
  const digits = v.replace(/\D/g, '')
  if (digits.length >= 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`
  if (digits.length > 6) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  if (digits.length > 3) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
  return digits
}

function formatNumberInput(v: string) {
  const digits = v.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString()
}

export default function LeadCapturePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'manual'|'scan'>('manual')

  // Core Fields
  const [addr, setAddr] = useState('')
  const [city, setCity] = useState('')
  const [county, setCounty] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [propertyType, setPropertyType] = useState<string>(PROPERTY_TYPES[0])
  const [selectedLeadCats, setSelectedLeadCats] = useState<string[]>([])
  
  // Financials
  const [askingPrice, setAskingPrice] = useState('')
  const [arv, setArv] = useState('')
  const [repairCosts, setRepairCosts] = useState('')
  const [fee, setFee] = useState('10,000')

  // Specs
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [sqft, setSqft] = useState('')
  const [lotSize, setLotSize] = useState('')
  const [yearBuilt, setYearBuilt] = useState('')

  // Ingestion Source
  const [source, setSource] = useState('Manual')
  const [sourceUrl, setSourceUrl] = useState('')

  // Contact / Seller
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const fields = [addr, city, state, zip, askingPrice, name, phone]
  const filled = fields.filter(f => f && f !== '').length
  const pct = Math.round((filled / Math.max(1, fields.length)) * 100)

  // Toggle Lead Category Selection
  function handleToggleLeadCategory(cat: string) {
    setSelectedLeadCats(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

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

      const parsedPrice = askingPrice ? parseInt(askingPrice.replace(/[^0-9]/g, ''), 10) || 0 : 0
      const parsedArv = arv ? parseInt(arv.replace(/[^0-9]/g, ''), 10) || null : null
      const parsedRepairs = repairCosts ? parseInt(repairCosts.replace(/[^0-9]/g, ''), 10) || null : null
      const parsedFee = fee ? parseInt(fee.replace(/[^0-9]/g, ''), 10) || 10000 : 10000

      const payload = {
        address: addr.trim(),
        city: city.trim(),
        county: county.trim(),
        state: state.trim().toUpperCase().slice(0, 2),
        zip: zip.trim(),
        zipCode: zip.trim(),
        propertyType: propertyType as any,
        leadCategories: selectedLeadCats as any[],
        price: parsedPrice,
        askingPrice: parsedPrice,
        arv: parsedArv,
        repairCosts: parsedRepairs,
        assignmentFee: parsedFee,
        sellerId,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) || null : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) || null : null,
        sqft: sqft ? parseInt(sqft.replace(/[^0-9]/g, ''), 10) || null : null,
        lotSize: lotSize ? parseFloat(lotSize) || null : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) || null : null,
        source,
        sourceUrl: sourceUrl.trim(),
        notes: notes.trim(),
      }

      await api.createProperty(payload)

      setSavedMsg('Lead successfully created!')
      
      // Reset State
      setAddr(''); setCity(''); setCounty(''); setState(''); setZip(''); setAskingPrice(''); setArv(''); setRepairCosts(''); setFee('10,000')
      setBedrooms(''); setBathrooms(''); setSqft(''); setLotSize(''); setYearBuilt('')
      setName(''); setPhone(''); setNotes(''); setSelectedLeadCats([]); setSourceUrl('')

      setTimeout(() => {
        setSavedMsg('')
        navigate('/properties')
      }, 900)
    } catch (e: any) {
      alert('Failed to save lead: ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="Add Property Lead" showBack onBack={() => navigate('/properties')}>
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
          {/* Address & Primary Details */}
          <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Property Location</div>
            <input 
              value={addr} 
              onChange={e => setAddr(e.target.value)} 
              placeholder="Street Address" 
              className="mb-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-lg font-semibold outline-none placeholder:text-[#B0B0B0] focus:border-[#1A3C34]" 
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#1A3C34]" />
              <input value={county} onChange={e => setCounty(e.target.value)} placeholder="County" className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#1A3C34]" />
              <input value={state} onChange={e => setState(e.target.value)} placeholder="State (e.g. TX)" className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#1A3C34]" maxLength={2} />
              <input value={zip} onChange={e => setZip(e.target.value)} placeholder="ZIP Code" className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#1A3C34]" />
              <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#1A3C34]">
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Lead Categories */}
          <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Lead Categories (Select multiple)</div>
            <div className="flex flex-wrap gap-2">
              {LEAD_CATEGORIES.map(cat => {
                const selected = selectedLeadCats.includes(cat)
                return (
                  <button 
                    key={cat} 
                    type="button"
                    onClick={() => handleToggleLeadCategory(cat)} 
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selected 
                        ? 'border-[#F5A623] bg-[#F5A623]/10 text-[#B87A0A]' 
                        : 'border-black/10 bg-white hover:bg-black/5 text-[#2C2C2C]'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Financials */}
          <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Financials</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="text-xs text-[#8A8A8A]">Asking Price</label>
                <div className="flex items-center border-b border-black/10 py-1.5">
                  <span className="mr-1 text-lg font-bold text-[#1A3C34]">$</span>
                  <input value={askingPrice} onChange={e => setAskingPrice(formatNumberInput(e.target.value))} placeholder="250,000" inputMode="numeric" className="w-full bg-transparent text-xl font-extrabold outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A]">Est. ARV</label>
                <div className="flex items-center border-b border-black/10 py-1.5">
                  <span className="mr-1 text-lg font-bold text-[#1A3C34]">$</span>
                  <input value={arv} onChange={e => setArv(formatNumberInput(e.target.value))} placeholder="350,000" inputMode="numeric" className="w-full bg-transparent text-xl font-extrabold outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A]">Estimated Repairs</label>
                <div className="flex items-center border-b border-black/10 py-1.5">
                  <span className="mr-1 text-lg font-bold text-[#1A3C34]">$</span>
                  <input value={repairCosts} onChange={e => setRepairCosts(formatNumberInput(e.target.value))} placeholder="45,000" inputMode="numeric" className="w-full bg-transparent text-xl font-extrabold outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A]">Assignment Fee</label>
                <div className="flex items-center border-b border-black/10 py-1.5">
                  <span className="mr-1 text-lg font-bold text-[#1A3C34]">$</span>
                  <input value={fee} onChange={e => setFee(formatNumberInput(e.target.value))} placeholder="10,000" inputMode="numeric" className="w-full bg-transparent text-xl font-extrabold outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Specs & Dimensions */}
          <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Specs & Dimensions</div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div>
                <label className="text-xs text-[#8A8A8A]">Bedrooms</label>
                <input value={bedrooms} onChange={e => setBedrooms(e.target.value)} type="number" placeholder="3" className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A]">Bathrooms</label>
                <input value={bathrooms} onChange={e => setBathrooms(e.target.value)} type="number" step="0.5" placeholder="2.5" className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A]">Sq Footage</label>
                <input value={sqft} onChange={e => setSqft(formatNumberInput(e.target.value))} placeholder="1,850" className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A]">Lot Size (Acres)</label>
                <input value={lotSize} onChange={e => setLotSize(e.target.value)} type="number" step="0.1" placeholder="0.25" className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A]">Year Built</label>
                <input value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} type="number" placeholder="1995" className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
              </div>
            </div>
          </div>

          {/* Ingestion & Source Info */}
          <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Data Source Details</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-[#8A8A8A]">Ingestion Source</label>
                <select value={source} onChange={e => setSource(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#1A3C34]">
                  {INGESTION_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#8A8A8A]">Original Listing URL</label>
                <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://www.zillow.com/homedetails/..." className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:border-[#1A3C34]" />
              </div>
            </div>
          </div>

          {/* Seller / Contact */}
          <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Seller Details</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Seller Full Name" className="w-full rounded-xl border border-black/10 px-4 py-2 outline-none focus:border-[#1A3C34]" />
              <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(555) 123-4567" inputMode="tel" className="w-full rounded-xl border border-black/10 px-4 py-2 outline-none focus:border-[#1A3C34]" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Internal Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Motivation, owner's situation, access instructions..." className="w-full resize-y rounded-3xl border border-black/10 p-4 outline-none focus:border-[#1A3C34]" />
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-black/15 bg-white p-10 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl border-2 border-dashed border-[#1A3C34]/30" />
          <div className="font-semibold text-lg text-[#1A3C34]">Scan / Camera Capture Coming Soon</div>
          <p className="mt-1 text-sm text-[#6B7280]">Please use the manual entry form for now.</p>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/95 pb-4 pt-3 backdrop-blur md:static md:mt-6 md:rounded-3xl md:border md:p-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4">
          <button onClick={() => navigate('/properties')} className="h-14 w-14 rounded-2xl border border-black/10">←</button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#F5A623] font-bold text-[#1A3C34] shadow disabled:opacity-60 hover:brightness-95 transition"
          >
            {saving ? 'Saving…' : savedMsg ? savedMsg : 'Save Property Lead'}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
