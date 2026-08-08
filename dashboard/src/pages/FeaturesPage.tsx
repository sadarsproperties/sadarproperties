import { useNavigate } from 'react-router-dom'
import MarketingNav from '../components/MarketingNav'
import Footer from '../components/Footer'

const WORKFLOW = [
  { icon: 'fa-magnifying-glass-location', title: 'Source', desc: 'Capture motivated seller leads from every channel — manual, driving for dollars, or CSV.' },
  { icon: 'fa-calculator', title: 'Analyze', desc: 'Run the numbers in seconds: MAO, 70% rule, repairs, equity spread, and buyer fit.' },
  { icon: 'fa-users', title: 'Distribute', desc: 'Match every deal to cash buyers and investors by buy box, then send in one click.' },
  { icon: 'fa-file-signature', title: 'Close', desc: 'Generate deal sheets, export to PDF/Excel or Google Drive, and track assignment.' },
]

const FEATURES = [
  {
    icon: 'fa-magnifying-glass-location',
    title: 'Lead Capture',
    desc: 'Every way you source deals, in one inbox.',
    points: [
      'Manual entry with automatic enrichment from property address',
      'Bulk CSV import for entire lists in minutes',
      'Driving-for-dollars friendly mobile workflow',
    ],
  },
  {
    icon: 'fa-calculator',
    title: 'Deal Analyzer',
    desc: 'Know your numbers before you make the call.',
    points: [
      'Instant Maximum Allowable Offer (MAO) and 70% rule',
      'Repair estimates and equity spread calculation',
      'Automatic matching to buyers whose buy box fits',
    ],
  },
  {
    icon: 'fa-users',
    title: 'Buyer Network',
    desc: 'Your cash buyers and investors, organized.',
    points: [
      'Profiles with buy boxes, budgets, and preferred cities',
      'Separate investor segmentation with custom criteria',
      'One-click deal distribution across the whole network',
    ],
  },
  {
    icon: 'fa-columns',
    title: 'CRM Pipeline',
    desc: 'Track every property, seller, buyer, and deal.',
    points: [
      'Full pipeline with statuses, notes, and follow-ups',
      'Sellers, buyers, and deals linked in one place',
      'Send deals to buyers and log the results',
    ],
  },
  {
    icon: 'fa-map',
    title: 'Market Analytics',
    desc: 'See where your business is strongest.',
    points: [
      'County and city-level breakdowns per area',
      'Sellers, buyers, investors, realtors, and title companies per market',
      'Add counties and cities as you expand',
    ],
  },
  {
    icon: 'fa-building-columns',
    title: 'Network Directory',
    desc: 'The professionals who close your deals.',
    points: [
      'Realtor and title company directories per market',
      'Contact details and notes in one searchable place',
      'Exportable lists for outreach and reporting',
    ],
  },
]

const INTEGRATIONS = [
  { icon: 'fa-google', title: 'Google Sign-In', desc: 'Secure, instant login with your Google account.' },
  { icon: 'fa-address-book', title: 'Contacts Sync', desc: 'Import and sync cash buyers from Google Contacts.' },
  { icon: 'fa-cloud-arrow-up', title: 'Google Drive', desc: 'Save deal sheets (PDF/Excel) straight to your Drive.' },
  { icon: 'fa-shield-halved', title: 'Private by Design', desc: 'Your data is never sold or shared. Ever.' },
]

export default function FeaturesPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F9F6F1]">
      <MarketingNav solid />

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'radial-gradient(800px 400px at 80% 0%, rgba(245,166,35,0.15), transparent 55%), linear-gradient(135deg, #0e2420 0%, #0a1a16 60%, #12352c 100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 md:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-medium tracking-[2px] text-[#F5A623]">
              THE PLATFORM
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-[-2.5px] text-white md:text-6xl">
              Everything you need to wholesale smarter.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Sadar Properties is the complete wholesaling CRM — source motivated sellers, analyze deals instantly,
              and distribute them to the right cash buyers, all from one place.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/signup')}
                className="group flex h-14 items-center justify-center rounded-2xl bg-[#F5A623] px-10 font-bold text-[#1A3C34] shadow-lg shadow-amber-900/30 transition active:scale-[0.985]"
              >
                Get Started — Free
                <span className="ml-2 inline-block transition group-hover:translate-x-0.5">→</span>
              </button>
              <button
                onClick={() => navigate('/markets')}
                className="h-14 rounded-2xl border border-white/25 px-8 font-semibold text-white/90 hover:bg-white/5"
              >
                See our markets
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Workflow ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[2px] text-[#F5A623]">How it works</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#1A3C34] md:text-5xl">
            From lead to closed deal.
          </h2>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW.map((w, i) => (
            <div key={w.title} className="relative rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
              <span className="absolute right-6 top-6 text-5xl font-extrabold text-black/[0.06]">0{i + 1}</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5A623]/15 text-xl text-[#F5A623]">
                <i className={`fa-solid ${w.icon}`} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-[#1A3C34]">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section className="border-y border-black/5 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[2px] text-[#F5A623]">Features</span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#1A3C34] md:text-5xl">
              Built for every step of the deal.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-black/5 bg-[#F9F6F1] p-8 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A3C34] text-xl text-[#F5A623]">
                  <i className={`fa-solid ${f.icon}`} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#1A3C34]">{f.title}</h3>
                <p className="mt-1 text-sm font-medium text-[#F5A623]">{f.desc}</p>
                <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[#6B7280]">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5">
                      <i className="fa-solid fa-circle-check mt-1 text-[10px] text-[#1A3C34]" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[2px] text-[#F5A623]">Integrations</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#1A3C34] md:text-5xl">
            Works where you already work.
          </h2>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {INTEGRATIONS.map((i) => (
            <div key={i.title} className="rounded-3xl border border-black/5 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A3C34]/5 text-xl text-[#1A3C34]">
                <i className={`fa-solid ${i.icon}`} />
              </div>
              <h3 className="mt-4 font-bold text-[#1A3C34]">{i.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">{i.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#0e2420] px-8 py-16 text-center md:py-20">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(700px 300px at 50% -20%, rgba(245,166,35,0.18), transparent 60%)' }}
          />
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Ready to close your next deal?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
              Join Sadar Properties free and start sourcing, analyzing, and distributing deals today.
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-[#F5A623] px-10 font-bold text-[#1A3C34] shadow-lg shadow-amber-900/30 transition hover:brightness-105 active:scale-[0.985]"
            >
              Get Started — Free
            </button>
          </div>
        </div>
      </section>

      <Footer dark />
    </div>
  )
}
