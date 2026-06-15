import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useAuth } from '../hooks/useAuth';
import AppLayout from '../components/AppLayout';
import { api, API_BASE } from '../api/client';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useStore();
  const { user } = useAuth();
  const [health, setHealth] = useState<{ ok: boolean; db?: { connected: boolean; latencyMs?: number; error?: string } } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  // 1. Calculations for the 7 required widgets
  const stats = useMemo(() => {
    const totalProps = data.properties.length;

    // New today
    const propsToday = data.properties.filter((p) => {
      if (!p.createdAt) return false;
      return new Date(p.createdAt).toDateString() === new Date().toDateString();
    }).length;

    // Hot Deals (Score >= 80)
    const hotDeals = data.properties.filter((p) => (p.dealScore ?? 0) >= 80).length;

    // Leads contacted this week (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const contactedThisWeek =
      data.properties.filter((p) => p.lastContactDate && new Date(p.lastContactDate) >= oneWeekAgo).length +
      data.sellers.filter((s) => s.lastContactDate && new Date(s.lastContactDate) >= oneWeekAgo).length;

    // Follow-ups due today
    const followUpsToday = data.properties.filter((p) => {
      if (!p.followUpDate) return false;
      return new Date(p.followUpDate).toDateString() === new Date().toDateString();
    }).length;

    // Total buyers in database (Buyers + Investors)
    const totalBuyers = data.buyers.length + data.investors.length;

    // Deals closed this month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const closedThisMonth = data.properties.filter((p) => {
      if (p.status?.toLowerCase() !== 'closed') return false;
      const d = p.updatedAt ? new Date(p.updatedAt) : new Date();
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    return {
      totalProps,
      propsToday,
      hotDeals,
      contactedThisWeek,
      followUpsToday,
      totalBuyers,
      closedThisMonth,
    };
  }, [data]);

  // 2. Dynamic Activity Feed from data
  const activityFeed = useMemo(() => {
    const list: Array<{ id: string; title: string; date: Date; icon: string; color: string }> = [];

    data.properties.forEach((p) => {
      list.push({
        id: `prop-${p.id}`,
        title: `Property Lead: ${p.address} (${p.status || 'New'})`,
        date: p.createdAt ? new Date(p.createdAt) : new Date(),
        icon: '🏠',
        color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/15',
      });
    });

    data.sellers.forEach((s) => {
      list.push({
        id: `sel-${s.id}`,
        title: `Motivated Seller: ${s.ownerName} added`,
        date: s.createdAt ? new Date(s.createdAt) : new Date(),
        icon: '👤',
        color: 'bg-amber-500/10 text-amber-700 border-amber-500/15',
      });
    });

    data.buyers.forEach((b) => {
      list.push({
        id: `buy-${b.id}`,
        title: `Cash Buyer: ${b.fullName} registered`,
        date: b.createdAt ? new Date(b.createdAt) : new Date(),
        icon: '👥',
        color: 'bg-blue-500/10 text-blue-700 border-blue-500/15',
      });
    });

    data.investors.forEach((i) => {
      list.push({
        id: `inv-${i.id}`,
        title: `Investor buy box: ${i.investorName} added`,
        date: i.createdAt ? new Date(i.createdAt) : new Date(),
        icon: '💼',
        color: 'bg-purple-500/10 text-purple-700 border-purple-500/15',
      });
    });

    // Sort by date descending and grab top 5
    return list.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [data]);

  // Client-side recent properties sorted by score
  const recent = useMemo(() => {
    return [...data.properties]
      .sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0))
      .slice(0, 6);
  }, [data.properties]);

  return (
    <AppLayout title="Dashboard">
      {/* 1. Header greeting */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="text-xs font-bold uppercase tracking-[1px] text-[#8A8A8A]">System Overview</div>
          <div className="text-2xl font-black tracking-tight text-[#1A3C34]">{user?.name || 'There'} 👋</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-[#1A3C34] hover:bg-black/5 transition"
          >
            ↻ Refresh Data
          </button>
          <button
            onClick={() => navigate('/lead-capture')}
            className="flex items-center gap-2 rounded-2xl bg-[#1A3C34] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1A3C34]/95 transition"
          >
            + New Property Lead
          </button>
        </div>
      </div>

      {/* 2. Stats Grid Widgets */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Properties', value: stats.totalProps, sub: `${stats.propsToday} new today`, color: 'text-[#1A3C34]' },
          { label: 'Hot Deals (80+)', value: stats.hotDeals, sub: 'High margin margin', color: 'text-amber-600' },
          { label: 'Contacted (Week)', value: stats.contactedThisWeek, sub: 'Seller callbacks', color: 'text-sky-600' },
          { label: 'Follow-ups Today', value: stats.followUpsToday, sub: 'Due callbacks', color: 'text-rose-600' },
          { label: 'Buyer Network', value: stats.totalBuyers, sub: 'Cash + Investors', color: 'text-emerald-600' },
          { label: 'Closed (Month)', value: stats.closedThisMonth, sub: 'Deals finalized', color: 'text-indigo-600' },
        ].map((s, i) => (
          <div key={i} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A]">{s.label}</div>
            <div>
              <div className={`mt-2 text-3xl font-extrabold tracking-tight ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. DB / System Health & Quick Actions */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Connection status banner */}
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A]">Database Engine Health</div>
            <div className="mt-3 flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${health?.ok && health?.db?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="font-bold text-sm text-[#1A3C34]">
                {health?.ok && health?.db?.connected ? 'PostgreSQL Active' : 'Connecting to host...'}
              </span>
              {health?.db?.latencyMs != null && (
                <span className="text-xs text-[#6B7280]">({health.db.latencyMs}ms latency)</span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Connected to local wholesaling persistence schemas.</p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="mt-4 text-xs font-bold text-left hover:underline text-[#1A3C34]"
          >
            Manage Data Connections →
          </button>
        </div>

        {/* Quick action grid shortcuts */}
        <div className="lg:col-span-2 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-3">Quick Navigation Shortcuts</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Capture Lead', desc: 'Add properties', to: '/lead-capture', icon: '🔎' },
              { label: 'Analyzer', desc: 'Check margins', to: '/deal-analyzer', icon: '📐' },
              { label: 'CRM Pipeline', desc: 'Track stages', to: '/pipeline', icon: '📊' },
              { label: 'Settings', desc: 'Keys & Scraping', to: '/settings', icon: '⚙' },
            ].map((a, idx) => (
              <button
                key={idx}
                onClick={() => navigate(a.to)}
                className="rounded-2xl border border-black/5 bg-[#F9F6F1] p-3 text-left transition hover:bg-black/5"
              >
                <div className="text-xl">{a.icon}</div>
                <div className="mt-2 text-xs font-bold text-[#1A3C34]">{a.label}</div>
                <p className="text-[10px] text-[#8A8A8A] leading-tight mt-0.5">{a.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Recent Properties & Recent Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left side: Recent properties */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8A8A8A]">Hot Deal Profiles</div>
            <button onClick={() => navigate('/properties')} className="text-xs font-bold text-[#1A3C34] hover:underline">View All Leads →</button>
          </div>

          {loading && <div className="py-8 text-center text-sm text-[#6B7280]">Loading data from server…</div>}
          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error} — <button className="underline" onClick={refresh}>try again</button>
            </div>
          )}

          {!loading && recent.length === 0 && (
            <div className="rounded-3xl border border-dashed border-black/10 bg-white p-8 text-center">
              <div className="text-3xl">📭</div>
              <div className="mt-3 text-sm font-bold">No properties yet</div>
              <p className="mt-1 text-xs text-[#6B7280]">Add a lead or scan Zillow to populate.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {recent.map((p) => {
              const score = p.dealScore ?? 0;
              const scoreColor = score >= 80 ? 'text-emerald-600 bg-emerald-500/10' : score >= 50 ? 'text-amber-600 bg-amber-500/10' : 'text-rose-600 bg-rose-500/10';
              const matchCount = p.topMatches?.length || 0;
              const hasBuyer = matchCount > 0;

              return (
                <div
                  key={p.id}
                  className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm transition hover:border-black/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-bold text-[#1A3C34] text-xs truncate max-w-[150px]">{p.address}</div>
                        <div className="text-[10px] text-slate-500">{p.city}, {p.state}</div>
                      </div>
                      <span className="rounded-xl bg-[#1A3C34]/5 px-2 py-0.5 text-[10px] font-bold text-[#1A3C34] border border-black/5 shrink-0">
                        {p.propertyType}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2">
                      <div>
                        <span className="text-[10px] text-[#8A8A8A] block">ASKING PRICE</span>
                        <span className="font-black text-sm text-[#1A3C34]">${p.price.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-[#8A8A8A]">DEAL SCORE</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreColor}`}>
                          {score}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-black/5 pt-2">
                    <button
                      onClick={async () => {
                        await api.autoMatchProperty(p.id);
                        refresh();
                      }}
                      className="flex-1 text-[10px] rounded-xl border border-[#1A3C34]/15 py-1.5 font-bold hover:bg-slate-50 transition text-[#1A3C34]"
                    >
                      {hasBuyer ? `🔄 Matches (${matchCount})` : '🎯 Find Buyers'}
                    </button>
                    <button
                      onClick={() => navigate('/deal-analyzer')}
                      className="flex-1 text-[10px] rounded-xl bg-[#1A3C34] text-white py-1.5 font-bold hover:bg-[#1A3C34]/95 transition"
                    >
                      Analyze
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side: Activity Feed widget */}
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#8A8A8A]">Recent Activity Feed</div>
          <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm space-y-4">
            {activityFeed.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold py-4 text-center">No system events logged yet.</p>
            ) : (
              activityFeed.map((activity) => (
                <div key={activity.id} className="flex gap-3 text-xs leading-normal">
                  <span className={`h-8 w-8 rounded-xl flex items-center justify-center border text-base shrink-0 ${activity.color}`}>
                    {activity.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#1A3C34] truncate">{activity.title}</p>
                    <span className="text-[10px] text-slate-450">
                      {activity.date.toLocaleDateString()} at {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
