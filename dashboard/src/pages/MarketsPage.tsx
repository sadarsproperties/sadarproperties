import { useNavigate } from 'react-router-dom'
import MarketingNav from '../components/MarketingNav'
import Footer from '../components/Footer'
import clevelandImg from '../assets/aerial_suburban_house_cleveland_map_view.jpg'
import detroitImg from '../assets/aerial_suburban_house_detroit_map_view.jpg'
import indianapolisImg from '../assets/aerial_suburban_house_indianapolis_map_view.jpg'

const FEATURED = [
  {
    img: clevelandImg,
    name: 'Cleveland, OH',
    tagline: 'High-volume wholesaling with an active cash-buyer community.',
    points: ['Strong inventory turnover', 'Deep after-repair value (ARV) spreads', 'Dense network of local investors'],
  },
  {
    img: detroitImg,
    name: 'Detroit, MI',
    tagline: 'Big volume, big margins, and plenty of motivated sellers.',
    points: ['Some of the widest MAO spreads in the Midwest', 'Active flipping and rental demand', 'Large pool of cash buyers'],
  },
  {
    img: indianapolisImg,
    name: 'Indianapolis, IN',
    tagline: 'Steady appreciation with consistent, dealable inventory.',
    points: ['Balanced supply and demand', 'Reliable rental cash flow for investors', 'Growing wholesaler community'],
  },
]

const FOOTPRINT = [
  { city: 'Houston', state: 'TX' },
  { city: 'Atlanta', state: 'GA' },
  { city: 'Dallas', state: 'TX' },
  { city: 'Austin', state: 'TX' },
  { city: 'San Antonio', state: 'TX' },
  { city: 'Charlotte', state: 'NC' },
  { city: 'Raleigh', state: 'NC' },
  { city: 'Orlando', state: 'FL' },
  { city: 'Tampa', state: 'FL' },
  { city: 'Miami', state: 'FL' },
  { city: 'Columbus', state: 'OH' },
  { city: 'Cleveland', state: 'OH' },
  { city: 'Indianapolis', state: 'IN' },
  { city: 'Detroit', state: 'MI' },
  { city: 'Memphis', state: 'TN' },
  { city: 'Nashville', state: 'TN' },
  { city: 'Kansas City', state: 'MO' },
  { city: 'St. Louis', state: 'MO' },
  { city: 'Chicago', state: 'IL' },
]

const TRACKED = [
  { icon: 'fa-house', label: 'Properties', desc: 'Tracked deals and listings per county.' },
  { icon: 'fa-user-tie', label: 'Sellers', desc: 'Motivated-seller pipeline by area.' },
  { icon: 'fa-users', label: 'Buyers & Investors', desc: 'Cash-buyer demand per market.' },
  { icon: 'fa-handshake', label: 'Realtors & Title Cos', desc: 'Local closing partners on record.' },
]

export default function MarketsPage() {
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
              MARKET COVERAGE
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-[-2.5px] text-white md:text-6xl">
              Wholesale-friendly markets, covered deep.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Sadar Properties tracks sellers, buyers, investors, realtors, and title companies county by county —
              so you know exactly where your next deal is hiding.
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
                onClick={() => navigate('/features')}
                className="h-14 rounded-2xl border border-white/25 px-8 font-semibold text-white/90 hover:bg-white/5"
              >
                Explore features
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured markets ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[2px] text-[#F5A623]">Core markets</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#1A3C34] md:text-5xl">
            Where we operate today.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {FEATURED.map((m) => (
            <div
              key={m.name}
              className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative">
                <img src={m.img} alt={m.name} className="h-40 w-full object-cover" loading="lazy" decoding="async" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e2420]/80 via-transparent to-transparent" />
                <h3 className="absolute bottom-3 left-5 text-2xl font-extrabold text-white">{m.name}</h3>
              </div>
              <div className="p-6">
                <p className="text-sm leading-relaxed text-[#6B7280]">{m.tagline}</p>
                <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[#2C2C2C]">
                  {m.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5">
                      <i className="fa-solid fa-circle-check mt-1 text-[10px] text-[#F5A623]" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full footprint ── */}
      <section className="border-y border-black/5 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[2px] text-[#F5A623]">Footprint</span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#1A3C34] md:text-5xl">
              Recognized across 19 metros.
            </h2>
            <p className="mt-4 text-lg text-[#6B7280]">
              Addresses, sellers, and buyers in these markets are automatically recognized and organized as you work.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {FOOTPRINT.map((m) => (
              <span
                key={`${m.city}-${m.state}`}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#F9F6F1] px-5 py-2.5 text-sm font-semibold text-[#1A3C34]"
              >
                <i className="fa-solid fa-location-dot text-[#F5A623]" />
                {m.city}, {m.state}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Per-market analytics ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[2px] text-[#F5A623]">Market analytics</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#1A3C34] md:text-5xl">
            Per-county intel, at a glance.
          </h2>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRACKED.map((t) => (
            <div key={t.label} className="rounded-3xl border border-black/5 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A3C34]/5 text-xl text-[#1A3C34]">
                <i className={`fa-solid ${t.icon}`} />
              </div>
              <h3 className="mt-4 font-bold text-[#1A3C34]">{t.label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">{t.desc}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-[#6B7280]">
          Add counties and cities as you expand, and watch each market's seller, buyer, investor, realtor, and title
          company counts update automatically.
        </p>
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
              Start covering your market today.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
              Join Sadar Properties free and begin tracking your county's sellers, buyers, and deals.
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
