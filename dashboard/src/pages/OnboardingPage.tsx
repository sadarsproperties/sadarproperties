import { useNavigate, Link } from 'react-router-dom'
import Footer from '../components/Footer'

export default function OnboardingPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#0e2420] text-white flex flex-col justify-between">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5A623]">
              <svg width="22" height="20" viewBox="0 0 24 22" fill="none">
                <path d="M12 2L2 9V20C2 20.55 2.45 21 3 21H9V15H15V21H21C21.55 21 22 20.55 22 20V9L12 2Z" fill="#1A3C34" />
              </svg>
            </div>
            <div className="text-2xl font-extrabold tracking-tighter">Wholesale<span className="text-[#F5A623]">IQ</span></div>
          </div>
          <button onClick={() => navigate('/dashboard')} className="rounded-2xl border border-white/20 px-5 py-2 text-sm font-semibold hover:bg-white/10">
            Log in
          </button>
        </div>

        {/* Hero */}
        <div className="mt-16 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-medium tracking-[2px] text-white/70">
            REAL ESTATE WHOLESALING
          </div>

          <h1 className="mx-auto max-w-4xl text-6xl font-extrabold leading-none tracking-[-2.5px] md:text-7xl">
            Close More<br />
            <span className="text-[#F5A623]">Deals.</span> Faster.
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg text-white/70">
            The complete platform to source motivated sellers, analyze deals instantly, and connect with verified cash buyers.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate('/signup')}
              className="group flex h-14 w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-[#F5A623] font-bold text-[#1A3C34] shadow-lg shadow-amber-900/30 transition active:scale-[0.985] sm:w-auto sm:px-10"
            >
              Get Started — Free
              <span className="inline-block transition group-hover:translate-x-0.5">→</span>
            </button>
            <Link to="/login" className="h-14 inline-flex items-center justify-center w-full max-w-xs rounded-2xl border border-white/20 font-semibold text-white/90 hover:bg-white/5 sm:w-auto sm:px-8">
              Log in
            </Link>
          </div>
          <div className="mt-4 text-xs text-white/50">No credit card required • Start closing deals today</div>
        </div>

        {/* Feature grid */}
        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { icon: '🔍', title: 'Capture Leads', desc: 'Manual entry, driving for dollars, or bulk CSV import. Auto-enrich from address.' },
            { icon: '📐', title: 'Deal Analyzer', desc: 'Instant MAO, 70% rule, repair estimates, equity spread, and buyer matching.' },
            { icon: '🤝', title: 'Buyer Network', desc: 'Organized cash buyers + investors with buy boxes. One-click deal distribution.' },
          ].map((f, idx) => (
            <div key={idx} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-3xl">{f.icon}</div>
              <div className="mt-4 text-xl font-semibold">{f.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-white/70">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <Footer dark />
    </div>
  )
}
