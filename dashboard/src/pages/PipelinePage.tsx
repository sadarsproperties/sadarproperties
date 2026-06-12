import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { api } from '../api/client'
import { calculateMetrics } from '../utils/calculations'
import AppLayout from '../components/AppLayout'
import type { Property } from '../types'

const STATUSES = [
  { key: 'new', label: 'New Leads', color: '#6B7280' },
  { key: 'analyzed', label: 'Analyzed', color: '#3B82F6' },
  { key: 'matched', label: 'Buyer Matched', color: '#10B981' },
  { key: 'offer_sent', label: 'Offer Sent', color: '#F5A623' },
  { key: 'under_contract', label: 'Under Contract', color: '#8B5CF6' },
  { key: 'assigned', label: 'Assigned', color: '#EF4444' },
  { key: 'closed', label: 'Closed', color: '#059669' },
] as const

type StatusKey = typeof STATUSES[number]['key']

export default function PipelinePage() {
  const navigate = useNavigate()
  const { data, refresh, loading } = useStore()
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)

  const propertiesByStatus = useMemo(() => {
    const grouped: Record<StatusKey, Property[]> = {
      new: [], analyzed: [], matched: [], offer_sent: [], under_contract: [], assigned: [], closed: []
    }
    data.properties.forEach(p => {
      const s = (p.status || 'new') as StatusKey
      if (grouped[s]) grouped[s].push(p)
      else grouped.new.push(p)
    })
    return grouped
  }, [data.properties])

  async function moveStatus(id: string, newStatus: StatusKey) {
    try {
      // Optimistic update
      await api.updateProperty(id, { status: newStatus } as any)
      if (newStatus === 'matched') {
        await api.autoMatchProperty(id)
      }
      await refresh()
    } catch (e) {
      alert('Failed to update status')
    }
  }

  async function notifyMatches(p: Property) {
    if (!p.topMatches?.length) {
      alert('No matches to notify yet. Run Auto-Match first.')
      return
    }
    setNotifyingId(p.id)
    try {
      const data = await api.notifyMatches(p.id, p.topMatches)
      const errorMsg = data.errors?.length ? `\n${data.errors.length} failed to send.` : ''
      alert(`Emails sent to ${data.sent} buyers/investors via Resend.${errorMsg}`)
      await api.updateProperty(p.id, { status: 'offer_sent', notes: (p.notes || '') + `\n[NOTIFIED ${new Date().toISOString()}]` } as any)
      await refresh()
    } catch (e) {
      alert('Email notification failed: ' + (e instanceof Error ? e.message : e))
    } finally {
      setNotifyingId(null)
    }
  }

  function onDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function onDrop(e: React.DragEvent, status: StatusKey) {
    e.preventDefault()
    if (draggedId) {
      await moveStatus(draggedId, status)
      setDraggedId(null)
    }
  }

  return (
    <AppLayout title="Pipeline / Kanban">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-[#6B7280]">Drag cards between stages or use the move buttons. No deal sits unmatched — use Auto-Match + Notify.</div>
        <button onClick={() => navigate('/lead-capture')} className="rounded-2xl bg-[#F5A623] px-4 py-2 text-sm font-bold text-[#1A3C34]">+ New Lead</button>
      </div>

      {loading && <div>Loading pipeline...</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 min-h-[70vh]">
        {STATUSES.map(col => {
          const items = propertiesByStatus[col.key] || []
          return (
            <div
              key={col.key}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.key)}
              className="rounded-3xl border border-black/5 bg-white flex flex-col min-h-[400px]"
            >
              <div className="p-3 border-b flex items-center justify-between" style={{ background: col.color + '15' }}>
                <div className="font-bold text-sm" style={{ color: col.color }}>{col.label}</div>
                <div className="text-xs px-2 py-0.5 rounded bg-white/70">{items.length}</div>
              </div>

              <div className="p-2 flex-1 overflow-auto space-y-2">
                {items.length === 0 && <div className="text-xs text-center text-[#9CA3AF] py-8">Drop leads here</div>}
                {items.map(p => {
                  const daysSince = p.createdAt ? Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000*3600*24)) : 10;
                  const enhanced = calculateMetrics(p, { matchCount: p.topMatches?.length || 0, daysSinceAdded: daysSince });
                  const score = enhanced.dealScore ?? p.dealScore ?? 0
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, p.id)}
                      className="bg-[#F9F6F1] rounded-2xl p-3 text-sm border border-black/5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="font-semibold text-[#1A3C34] truncate">{p.address}</div>
                      <div className="text-xs text-[#6B7280]">{p.city}, {p.state} • ${p.price.toLocaleString()}</div>

                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="font-mono" style={{ color: score > 70 ? '#10B981' : '#F5A623' }}>Score {score}</span>
                        <span className="text-[#6B7280]">• {p.topMatches?.length || 0} matches</span>
                      </div>

                      {p.topMatches && p.topMatches.length > 0 && (
                        <div className="mt-1 text-[10px] text-emerald-700 truncate">Top: {p.topMatches[0].name}</div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-1">
                        <button onClick={() => navigate('/deal-analyzer')} className="text-[10px] px-2 py-0.5 rounded bg-white border">Analyze</button>
                        <button
                          onClick={() => moveStatus(p.id, STATUSES[(STATUSES.findIndex(s => s.key === (p.status || 'new')) + 1) % STATUSES.length].key)}
                          className="text-[10px] px-2 py-0.5 rounded bg-white border"
                        >Next Stage</button>
                        {(p.status === 'matched' || (p.topMatches?.length || 0) > 0) && (
                          <>
                            <button
                              disabled={notifyingId === p.id}
                              onClick={() => notifyMatches(p)}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#1A3C34] text-white"
                            >
                              {notifyingId === p.id ? 'Sending...' : 'Send Email'}
                            </button>
                            <button
                              onClick={() => navigate(`/send-deal?propertyId=${p.id}`)}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#F5A623] text-[#1A3C34] font-semibold"
                            >
                              Send Deal
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 text-xs text-[#6B7280]">
        Drag deals between pipeline stages. Use Auto-Match to find buyers, then Send Email to notify them via Resend.
      </div>
    </AppLayout>
  )
}
