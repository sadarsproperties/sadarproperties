import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { useAuth } from '../hooks/useAuth'
import AppLayout from '../components/AppLayout'
import { api } from '../api/client'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useStore()
  const { user } = useAuth()
  const [health, setHealth] = useState<{ ok: boolean; db?: { connected: boolean; latencyMs?: number; error?: string } } | null>(null)

  useEffect(() => {
    fetch('/api/health', { credentials: 'include' })
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }))
  }, [])

  const stats = useMemo(() => {
    const props = data.properties.length
    const sellers = data.sellers.length
    const buyers = data.buyers.length + data.investors.length
    // Rough revenue proxy from assignment fees on properties
    const revenue = data.properties.reduce((sum, p) => sum + (p.assignmentFee || 0), 0)
    return { props, sellers, buyers, revenue }
  }, [data])

  const recent = useMemo(() => {
    return [...data.properties]
      .map(p => ({
        ...p,
        computedScore: p.dealScore ?? calculateScore(p) // fallback client score
      }))
      .sort((a, b) => (b.computedScore || 0) - (a.computedScore || 0))
      .slice(0, 8)
  }, [data.properties])

  function calculateScore(p: any) {
    if (!p.arv || !p.repairCosts || p.arv <= 0) return 0;
    const mao = p.arv * 0.7 - p.repairCosts - (p.assignmentFee || 10000);
    if (mao <= 0) return 1;
    const profitRatio = (p.assignmentFee || 10000) / mao;
    return Math.max(1, Math.min(100, Math.round(profitRatio * 200 + ((p.arv - p.price) / p.arv) * 40)));
  }

  return (
    <AppLayout title="Dashboard">
      {/* Header greeting */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[1px] text-[#8A8A8A]">Good morning</div>
          <div className="text-3xl font-extrabold tracking-tight text-[#1A3C34]">{user?.name || 'There'} 👋</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#1A3C34] hover:bg-black/5 active:bg-black/10"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => navigate('/lead-capture')}
            className="flex items-center gap-2 rounded-2xl bg-[#F5A623] px-5 py-2.5 text-sm font-bold text-[#1A3C34] shadow-sm hover:brightness-95"
          >
            + New Lead
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Active Leads', value: stats.props, sub: 'Properties tracked', color: '#1A3C34' },
          { label: 'Sellers', value: stats.sellers, sub: 'Motivated contacts', color: '#1A3C34' },
          { label: 'Buyer Network', value: stats.buyers, sub: 'Cash + Investors', color: '#0BA887' },
          { label: 'Pipeline Fees', value: '$' + (stats.revenue / 1000).toFixed(0) + 'k', sub: 'Total assignment', color: '#F5A623' },
        ].map((s, i) => (
          <div key={i} className="rounded-3xl border border-black/5 bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">{s.label}</div>
            <div className="mt-2 text-4xl font-extrabold tracking-[-1.5px]" style={{ color: s.color }}>{s.value}</div>
            <div className="mt-0.5 text-sm text-[#6B7280]">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* DB / System Health */}
      <div className="mb-6 rounded-3xl border border-black/5 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">System Status</div>
            <div className="mt-1 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${health?.ok && health?.db?.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="font-semibold text-sm">
                {health?.ok && health?.db?.connected ? 'PostgreSQL Connected' : 'Database Issue'}
              </span>
              {health?.db?.latencyMs != null && (
                <span className="text-xs text-[#6B7280]">({health.db.latencyMs}ms)</span>
              )}
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="text-xs px-3 py-1 rounded-xl border border-black/10 hover:bg-black/5">Refresh</button>
        </div>
        {health?.db?.error && (
          <div className="mt-2 text-xs text-red-600">{health.db.error}</div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-[1px] text-[#8A8A8A]">Quick Actions</div>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Capture New Lead', desc: 'Manual or import', to: '/lead-capture', icon: '🔎' },
          { label: 'Deal Analyzer', desc: 'MAO & numbers', to: '/deal-analyzer', icon: '📐' },
          { label: 'Manage Buyers', desc: 'Network & buy boxes', to: '/buyers', icon: '👥' },
          { label: 'Load Sample Data', desc: 'Seed the database', to: null, icon: '🌱', action: 'seed' },
        ].map((a, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (a.action === 'seed') {
                api.seed(true).then(() => refresh())
              } else if (a.to) {
                navigate(a.to)
              }
            }}
            className="group rounded-3xl border border-black/5 bg-white p-4 text-left transition hover:border-black/10 hover:shadow-sm"
          >
            <div className="text-2xl">{a.icon}</div>
            <div className="mt-3 font-bold text-[#1A3C34]">{a.label}</div>
            <div className="text-sm text-[#6B7280]">{a.desc}</div>
          </button>
        ))}
      </div>

      {/* Recent Leads + Data status */}
      <div className="flex items-center justify-between pb-2">
        <div className="text-xs font-bold uppercase tracking-[1px] text-[#8A8A8A]">Recent Properties</div>
        <button onClick={() => navigate('/lead-capture')} className="text-sm font-semibold text-[#1A3C34] hover:underline">Add more →</button>
      </div>

      {loading && <div className="py-8 text-center text-sm text-[#6B7280]">Loading data from server…</div>}
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error} — <button className="underline" onClick={refresh}>try again</button>
        </div>
      )}

      {!loading && recent.length === 0 && (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white p-8 text-center">
          <div className="text-4xl">📭</div>
          <div className="mt-3 font-semibold">No properties yet</div>
          <p className="mt-1 text-sm text-[#6B7280]">Click “Load Sample Data” above or add your first lead.</p>
          <button
            onClick={() => api.seed().then(() => refresh())}
            className="mt-4 rounded-2xl bg-[#1A3C34] px-6 py-2 text-sm font-bold text-white"
          >
            Load Sample Data
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((p) => {
          const score = p.computedScore ?? p.dealScore ?? 0;
          const scoreColor = score >= 75 ? '#10B981' : score >= 50 ? '#F5A623' : '#EF4444';
          const matchCount = p.topMatches?.length || 0;
          const hasBuyer = matchCount > 0;

          return (
            <div
              key={p.id}
              className="group rounded-3xl border border-black/5 bg-white p-5 transition hover:-translate-y-px hover:border-black/10 hover:shadow"
            >
              <div className="flex items-start justify-between">
                <div onClick={() => navigate('/deal-analyzer')} className="cursor-pointer flex-1">
                  <div className="font-bold text-[#1A3C34]">{p.address}</div>
                  <div className="text-sm text-[#6B7280]">{p.city}{p.state ? `, ${p.state}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="rounded-xl bg-[#F5A623]/10 px-3 py-1 text-xs font-bold text-[#B87A0A]">{p.propertyType}</div>
                  {p.status && <div className="mt-1 text-[10px] uppercase tracking-wider text-[#6B7280]">{p.status.replace('_',' ')}</div>}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#8A8A8A]">Ask </span>
                  <span className="font-extrabold">${p.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ color: scoreColor }} className="text-sm font-extrabold">Score: {score}</div>
                  <div className={`text-xs px-2 py-0.5 rounded-full ${hasBuyer ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {hasBuyer ? `${matchCount} buyer${matchCount>1?'s':''}` : 'No buyer yet'}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={async (e) => { e.stopPropagation(); await api.autoMatchProperty(p.id); refresh(); }}
                  className="flex-1 text-xs rounded-2xl border border-[#1A3C34] py-1.5 font-semibold hover:bg-[#1A3C34] hover:text-white"
                >
                  {hasBuyer ? 'Refresh Matches' : 'Auto-Find Buyers'}
                </button>
                <button onClick={() => navigate('/deal-analyzer')} className="flex-1 text-xs rounded-2xl bg-[#1A3C34] text-white py-1.5 font-semibold">Analyze</button>
              </div>

              {p.topMatches && p.topMatches.length > 0 && (
                <div className="mt-2 text-[10px] text-[#6B7280]">
                  Top: {p.topMatches.slice(0,2).map(m => m.name).join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Data management shortcut */}
      <div className="mt-10 rounded-3xl border border-black/5 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Full Data Workspace</div>
            <div className="text-sm text-[#6B7280]">Edit sellers, buyers, investors and properties with live sync to PostgreSQL.</div>
          </div>
          <button
            onClick={() => alert('The full editable tables live in the Buyers page + you can use CSV import on Lead Capture. Extend as needed!')}
            className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Open Data Tables
          </button>
        </div>
      </div>
    </AppLayout>
  )
}

