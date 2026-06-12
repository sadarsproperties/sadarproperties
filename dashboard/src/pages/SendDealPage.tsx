import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { api } from '../api/client'
import AppLayout from '../components/AppLayout'

export default function SendDealPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const propertyId = params.get('propertyId')
  const { data, refresh } = useStore()

  const property = useMemo(() => data.properties.find(p => p.id === propertyId), [data.properties, propertyId])
  const matches = useMemo(() => property?.topMatches || [], [property])

  const [selected, setSelected] = useState<Set<string>>(new Set(matches.map(m => m.id)))
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; errors?: Array<{ name: string; reason: string }> } | null>(null)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === matches.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(matches.map(m => m.id)))
    }
  }

  async function handleSend() {
    if (!property || selected.size === 0) return
    setSending(true)
    try {
      const selectedMatches = matches.filter(m => selected.has(m.id))
      const res = await api.notifyMatches(property.id, selectedMatches)
      setResult(res)
      await refresh()
    } catch (e: any) {
      alert('Failed to send: ' + (e?.message || e))
    } finally {
      setSending(false)
    }
  }

  if (!property) {
    return (
      <AppLayout title="Send Deal" showBack onBack={() => navigate('/dashboard')}>
        <div className="mx-auto max-w-lg text-center py-16">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="font-semibold text-lg">No property selected</div>
          <p className="mt-2 text-sm text-[#6B7280]">Go to the Pipeline or Dashboard and select a property to send.</p>
          <button onClick={() => navigate('/pipeline')} className="mt-4 rounded-2xl bg-[#1A3C34] px-6 py-2 text-sm font-bold text-white">
            Go to Pipeline
          </button>
        </div>
      </AppLayout>
    )
  }

  const price = property.price ? '$' + (property.price / 1000).toFixed(0) + 'k' : '—'
  const arv = property.arv ? '$' + (property.arv / 1000).toFixed(0) + 'k' : '—'
  const repairs = property.repairCosts ? '$' + (property.repairCosts / 1000).toFixed(0) + 'k' : '—'
  const location = [property.city, property.state].filter(Boolean).join(', ')

  if (result) {
    return (
      <AppLayout title="Emails Sent" showBack onBack={() => navigate('/pipeline')}>
        <div className="mx-auto max-w-lg text-center py-12">
          <div className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">✉️</div>
          <h2 className="text-3xl font-extrabold text-[#1A3C34]">{result.sent} Email{result.sent !== 1 ? 's' : ''} Sent</h2>
          <p className="mt-2 text-[#6B7280]">Deal notifications for <strong>{property.address}</strong> were sent via Resend.</p>

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm">
              <div className="font-semibold text-amber-800 mb-1">{result.errors.length} failed:</div>
              {result.errors.map((err, i) => (
                <div key={i} className="text-amber-700">{err.name}: {err.reason}</div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => navigate('/pipeline')} className="rounded-2xl bg-[#1A3C34] px-8 py-3 font-bold text-white">Back to Pipeline</button>
            <button onClick={() => navigate('/dashboard')} className="rounded-2xl border border-black/10 px-8 py-3 font-bold">Dashboard</button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Send Deal" showBack onBack={() => navigate(-1 as any)}>
      <div className="mx-auto max-w-lg">
        <div className="rounded-3xl border border-black/5 bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#F5A623]">{property.propertyType} • {location}</div>
          <div className="mt-1 text-2xl font-extrabold">{property.address}</div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {[{l:'Asking',v:price},{l:'ARV',v:arv},{l:'Repairs',v:repairs}].map((s,i) => (
              <div key={i} className="rounded-2xl bg-[#1A3C34] p-3 text-white">
                <div className="text-[10px] text-white/50">{s.l}</div>
                <div className="text-xl font-extrabold">{s.v}</div>
              </div>
            ))}
          </div>

          <div className="my-5 h-px bg-black/10" />

          {matches.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold">No matched buyers yet</div>
              <p className="text-sm text-[#6B7280] mt-1">Run Auto-Match on this property first.</p>
              <button
                onClick={async () => { await api.autoMatchProperty(property.id); await refresh() }}
                className="mt-3 rounded-2xl bg-[#1A3C34] px-5 py-2 text-sm font-bold text-white"
              >
                Auto-Match Buyers
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="font-semibold">Select buyers to notify</div>
                <button onClick={toggleAll} className="text-sm text-[#1A3C34] underline">
                  {selected.size === matches.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleSelect(m.id)}
                    className={`w-full flex items-center justify-between rounded-2xl border p-3 text-left transition ${selected.has(m.id) ? 'border-emerald-300 bg-emerald-50/50' : 'border-black/10'}`}
                  >
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-[#6B7280]">{m.companyName || m.type} {m.email ? `• ${m.email}` : ''}</div>
                    </div>
                    <div className={`text-sm font-semibold ${selected.has(m.id) ? 'text-emerald-600' : 'text-[#9CA3AF]'}`}>
                      {selected.has(m.id) ? 'Selected' : ''}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <button
                  disabled={sending || selected.size === 0}
                  onClick={handleSend}
                  className="w-full rounded-2xl bg-[#F5A623] py-4 text-lg font-extrabold text-[#1A3C34] disabled:opacity-70"
                >
                  {sending ? 'Sending emails…' : `Send to ${selected.size} buyer${selected.size !== 1 ? 's' : ''} via Email`}
                </button>
                <div className="mt-2 text-center text-xs text-[#6B7280]">Emails sent via Resend with full deal details.</div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
