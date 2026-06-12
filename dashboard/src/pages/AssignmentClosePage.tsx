import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import AppLayout from '../components/AppLayout'

export default function AssignmentClosePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const propertyId = params.get('propertyId')
  const { data } = useStore()

  const property = useMemo(() => data.properties.find(p => p.id === propertyId), [data.properties, propertyId])

  // Find the top match (buyer who got the deal)
  const topMatch = property?.topMatches?.[0]

  if (!property) {
    return (
      <AppLayout title="Deal Closed" showBack onBack={() => navigate('/dashboard')}>
        <div className="mx-auto max-w-xl text-center py-16">
          <div className="text-4xl mb-4">📋</div>
          <div className="font-semibold text-lg">No deal selected</div>
          <p className="mt-2 text-sm text-[#6B7280]">Select a property from the Pipeline to view close details.</p>
          <button onClick={() => navigate('/pipeline')} className="mt-4 rounded-2xl bg-[#1A3C34] px-6 py-2 text-sm font-bold text-white">
            Go to Pipeline
          </button>
        </div>
      </AppLayout>
    )
  }

  const fee = property.assignmentFee || 10000
  const location = [property.city, property.state].filter(Boolean).join(', ')

  return (
    <AppLayout title="Deal Closed" showBack onBack={() => navigate('/dashboard')}>
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">🎉</div>
        <h2 className="text-4xl font-extrabold tracking-tight">Assignment Closed!</h2>
        <p className="mt-2 text-lg text-[#6B7280]">Congratulations. Your deal has been assigned and the fee collected.</p>

        <div className="mx-auto mt-8 max-w-sm rounded-3xl bg-white p-6 text-left shadow-sm">
          <div className="text-sm font-semibold text-[#8A8A8A]">{property.address}, {location}</div>
          <div className="mt-1 text-5xl font-extrabold text-[#F5A623]">${fee.toLocaleString()}</div>
          <div className="text-sm text-[#6B7280]">Assignment fee collected</div>

          <div className="my-4 h-px bg-black/10" />

          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div className="text-[#6B7280]">Assigned To</div>
            <div className="font-semibold">{topMatch?.name || '—'}</div>
            <div className="text-[#6B7280]">Property Type</div>
            <div className="font-semibold">{property.propertyType}</div>
            <div className="text-[#6B7280]">Asking Price</div>
            <div className="font-semibold">${property.price.toLocaleString()}</div>
            {property.arv != null && (
              <>
                <div className="text-[#6B7280]">ARV</div>
                <div className="font-semibold">${property.arv.toLocaleString()}</div>
              </>
            )}
            <div className="text-[#6B7280]">Status</div>
            <div className="font-semibold capitalize">{(property.status || 'closed').replace('_', ' ')}</div>
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
