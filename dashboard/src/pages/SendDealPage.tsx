import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

export default function SendDealPage() {
  const navigate = useNavigate()
  const [count, setCount] = useState(3)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function handleSend() {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setSent(true)
      setTimeout(() => navigate('/assignment-close'), 900)
    }, 1100)
  }

  return (
    <AppLayout title="Send Deal" showBack onBack={() => navigate('/deal-analyzer')}>
      <div className="mx-auto max-w-lg">
        <div className="rounded-3xl border border-black/5 bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#F5A623]">OFF MARKET • HOUSTON</div>
          <div className="mt-1 text-2xl font-extrabold">3847 Elmwood Drive, Houston TX</div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {[{l:'Asking',v:'$124k'},{l:'ARV',v:'$210k'},{l:'Repairs',v:'$34k'}].map((s,i) => (
              <div key={i} className="rounded-2xl bg-[#1A3C34] p-3 text-white">
                <div className="text-[10px] text-white/50">{s.l}</div>
                <div className="text-xl font-extrabold">{s.v}</div>
              </div>
            ))}
          </div>

          <div className="my-5 h-px bg-black/10" />

          <div className="flex items-center justify-between">
            <div className="font-semibold">Select buyers to notify</div>
            <button onClick={() => setCount(c => Math.max(1, 5 - c))} className="text-sm text-[#1A3C34] underline">Toggle selection</button>
          </div>

          <div className="mt-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-black/10 p-3">
                <div>Buyer #{i+1} — Houston cash buyer</div>
                <div className="text-emerald-600 text-sm font-semibold">{i < count ? 'Selected' : ''}</div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <button
              disabled={sending || sent}
              onClick={handleSend}
              className="w-full rounded-2xl bg-[#F5A623] py-4 text-lg font-extrabold text-[#1A3C34] disabled:opacity-70"
            >
              {sending ? 'Sending…' : sent ? 'Sent! Opening close screen…' : `Send to ${count} buyers via SMS + Email`}
            </button>
            <div className="mt-2 text-center text-xs text-[#6B7280]">Real distribution would call Twilio / SendGrid in production.</div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
