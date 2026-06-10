import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

export default function AssignmentClosePage() {
  const navigate = useNavigate()

  return (
    <AppLayout title="Deal Closed" showBack onBack={() => navigate('/dashboard')}>
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">🎉</div>
        <h2 className="text-4xl font-extrabold tracking-tight">Assignment Closed!</h2>
        <p className="mt-2 text-lg text-[#6B7280]">Congratulations. Your deal has been assigned and the fee collected.</p>

        <div className="mx-auto mt-8 max-w-sm rounded-3xl bg-white p-6 text-left shadow-sm">
          <div className="text-sm font-semibold text-[#8A8A8A]">2847 Maplewood Drive, Columbus OH</div>
          <div className="mt-1 text-5xl font-extrabold text-[#F5A623]">$14,500</div>
          <div className="text-sm text-[#6B7280]">Assignment fee collected</div>

          <div className="my-4 h-px bg-black/10" />

          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div className="text-[#6B7280]">Cash Buyer</div><div className="font-semibold">Marcus Rivera</div>
            <div className="text-[#6B7280]">Contract Price</div><div className="font-semibold">$142,000</div>
            <div className="text-[#6B7280]">Close Date</div><div className="font-semibold">June 18, 2025</div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => navigate('/dashboard')} className="rounded-2xl bg-[#1A3C34] px-8 py-3 font-bold text-white">Back to Dashboard</button>
          <button onClick={() => navigate('/buyers')} className="rounded-2xl border border-black/10 px-8 py-3 font-bold">View Buyers</button>
        </div>
      </div>
    </AppLayout>
  )
}
