import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import AppLayout from '../components/AppLayout'

function parseNum(str: string) {
  return parseFloat(String(str).replace(/[,$]/g, '')) || 0
}
function formatNum(n: number) {
  return Math.round(n).toLocaleString('en-US')
}
function formatCurrency(n: number) {
  return '$' + formatNum(n)
}

export default function DealAnalyzerPage() {
  const navigate = useNavigate()
  const [arv, setArv] = useState('185000')
  const [repair, setRepair] = useState(32000)
  const [sqft, setSqft] = useState('1450')
  const [fee, setFee] = useState('10000')

  const [mao, setMao] = useState(87500)
  const [margin, setMargin] = useState(47.3)
  const [repairSqft, setRepairSqft] = useState(22.07)
  const [spread, setSpread] = useState(87500)
  const [arv70, setArv70] = useState(129500)

  const recalculate = useCallback(() => {
    const arvN = parseNum(arv)
    const feeN = parseNum(fee)
    const sqftN = parseNum(sqft)
    const arv70N = arvN * 0.70
    const maoN = arv70N - repair - feeN
    const marginN = arvN > 0 ? (maoN / arvN) * 100 : 0
    const repairSqftN = sqftN > 0 ? repair / sqftN : 0
    const spreadN = arvN - maoN
    setMao(Math.max(0, maoN))
    setMargin(Math.max(0, marginN))
    setRepairSqft(repairSqftN)
    setSpread(spreadN)
    setArv70(Math.max(0, arv70N))
  }, [arv, repair, sqft, fee])

  useEffect(() => { recalculate() }, [recalculate])

  const sliderPct = (repair / 150000) * 100
  const marginColor = margin >= 35 ? '#4DD9C0' : margin >= 20 ? '#F5A623' : '#E05252'

  async function saveAsProperty() {
    try {
      const address = prompt('Property address to save?', '123 Main St') || 'Analyzed Deal'
      const city = prompt('City?', 'Houston') || ''
      await api.createProperty({
        address,
        city,
        state: '',
        zip: '',
        propertyType: 'Single Family',
        leadCategories: ['Distressed'],
        price: Math.round(parseNum(arv) * 0.55),
        arv: parseNum(arv) || null,
        repairCosts: repair || null,
        assignmentFee: parseNum(fee) || 10000,
        sellerId: null,
        notes: `Saved from Deal Analyzer. MAO: ${formatCurrency(mao)}`,
      })
      alert('Saved to database! Check Dashboard.')
      navigate('/dashboard')
    } catch (e: any) {
      alert('Save failed: ' + (e?.message || e))
    }
  }

  return (
    <AppLayout title="Deal Analyzer" showBack onBack={() => navigate('/dashboard')}>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Inputs */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-black/5 bg-white p-6">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Deal Inputs</div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs text-[#8A8A8A]">
                  <div>After Repair Value (ARV)</div>
                  <div className="rounded bg-amber-100 px-2 py-px text-[10px] font-semibold text-amber-700">Key metric</div>
                </div>
                <div className="mt-1 flex items-center text-3xl font-extrabold">
                  <span className="mr-1 text-[#B0C4BD]">$</span>
                  <input value={arv} onChange={e => setArv(e.target.value)} onBlur={() => setArv(formatNum(parseNum(arv)))} className="w-full bg-transparent tracking-[-1px] outline-none" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#8A8A8A]">Repair Estimate</div>
                    <div className="text-[10px] text-[#B0C4BD]">Drag to adjust</div>
                  </div>
                  <div className="text-right text-3xl font-extrabold tabular-nums">${formatNum(repair)}</div>
                </div>
                <input
                  type="range" min="0" max="150000" step="500" value={repair}
                  onChange={e => setRepair(parseInt(e.target.value))}
                  className="repair-slider mt-3 w-full"
                  style={{ background: `linear-gradient(to right, #1A3C34 0%, #1A3C34 ${sliderPct}%, #E8E2DA ${sliderPct}%, #E8E2DA 100%)` }}
                />
                <div className="mt-1 flex justify-between text-[10px] text-[#B0C4BD]"><div>$0</div><div>$75k</div><div>$150k</div></div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-xs font-semibold text-[#8A8A8A]">Sq Footage</div>
                  <div className="flex items-baseline">
                    <input value={sqft} onChange={e => setSqft(e.target.value)} onBlur={() => setSqft(formatNum(parseNum(sqft)))} className="w-full bg-transparent text-2xl font-extrabold outline-none" />
                    <span className="ml-1 text-sm text-[#B0C4BD]">sq ft</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#8A8A8A]">Wholesale Fee</div>
                  <div className="flex items-baseline">
                    <span className="mr-0.5 text-xl font-bold text-[#B0C4BD]">$</span>
                    <input value={fee} onChange={e => setFee(e.target.value)} onBlur={() => setFee(formatNum(parseNum(fee)))} className="w-full bg-transparent text-2xl font-extrabold outline-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button onClick={saveAsProperty} className="mt-3 w-full rounded-2xl border-2 border-[#1A3C34] py-3 text-sm font-bold text-[#1A3C34]">
            Save Analysis as Property Lead
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <div className="rounded-3xl bg-[#1A3C34] p-6 text-white">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/50">
              <div>Auto-Calculated Results</div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#F5A623]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F5A623]" /> LIVE</div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-sm text-white/70">Max Allowable Offer</div>
                <div className="text-[11px] text-white/40">(ARV × 70%) − Repairs − Fee</div>
              </div>
              <div className="text-right text-6xl font-extrabold tabular-nums tracking-[-2px] text-[#F5A623]">{formatNum(mao)}</div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { l: 'Profit Margin', v: margin.toFixed(1) + '%', c: marginColor },
                { l: 'Repair / sqft', v: '$' + repairSqft.toFixed(2), c: 'white' },
                { l: 'Equity Spread', v: '$' + (spread / 1000).toFixed(1) + 'k', c: '#4DD9C0' },
              ].map((m, i) => (
                <div key={i} className="rounded-2xl border border-white/15 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/50">{m.l}</div>
                  <div className="mt-1 text-2xl font-extrabold" style={{ color: m.c }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown */}
          <div className="mt-4 rounded-3xl border border-black/5 bg-white">
            <div className="flex items-center justify-between border-b px-5 py-3 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">
              <div>70% Rule Breakdown</div>
              <div className="rounded-full bg-[#1A3C34]/10 px-3 py-px text-[#1A3C34]">Live</div>
            </div>
            {[
              { label: 'ARV × 70%', val: formatCurrency(arv70) },
              { label: 'Repair Estimate', val: formatCurrency(repair), neg: true },
              { label: 'Wholesale Fee', val: formatCurrency(parseNum(fee)), neg: true },
              { label: 'MAO', val: formatCurrency(mao), highlight: true },
            ].map((row, i) => (
              <div key={i} className={`flex items-center justify-between border-t px-5 py-3 ${row.highlight ? 'bg-amber-50/60 font-semibold' : ''}`}>
                <div>{row.label}</div>
                <div className={row.neg ? 'text-red-600' : ''}>{row.val}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={() => navigate('/send-deal')} className="flex-1 rounded-2xl bg-[#F5A623] py-3 font-bold text-[#1A3C34]">Send to Buyers</button>
            <button onClick={() => navigate('/assignment-close')} className="flex-1 rounded-2xl border-2 border-[#1A3C34] py-3 font-bold">Simulate Close</button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
