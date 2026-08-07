import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'
import clevelandImg from '../assets/aerial_suburban_house_cleveland_map_view.jpg'
import detroitImg from '../assets/aerial_suburban_house_detroit_map_view.jpg'
import indianapolisImg from '../assets/aerial_suburban_house_indianapolis_map_view.jpg'

interface HeroSlide {
  eyebrow: string
  title: string
  text: string
  gradient: string
}

const SLIDES: HeroSlide[] = [
  {
    eyebrow: 'REAL ESTATE WHOLESALING',
    title: 'Close More Deals. Faster.',
    text: 'The complete wholesaling CRM to source motivated sellers, analyze deals instantly, and connect with cash buyers.',
    gradient: 'radial-gradient(900px 500px at 78% 18%, rgba(245,166,35,0.16), transparent 55%), linear-gradient(135deg, #0e2420 0%, #0a1a16 55%, #12352c 100%)',
  },
  {
    eyebrow: 'SMART DEAL ANALYSIS',
    title: 'Know Your Numbers Instantly.',
    text: 'Instant Maximum Allowable Offer, the 70% rule, repair estimates, equity spread, and automatic buyer matching on every deal.',
    gradient: 'radial-gradient(900px 500px at 78% 18%, rgba(245,166,35,0.12), transparent 55%), linear-gradient(135deg, #122f27 0%, #0a1a16 55%, #0d241f 100%)',
  },
  {
    eyebrow: 'CASH BUYER NETWORK',
    title: 'Match Deals to Buyers Automatically.',
    text: 'Organized cash buyers and investors with buy boxes, plus one-click deal distribution across your entire network.',
    gradient: 'radial-gradient(900px 500px at 78% 18%, rgba(245,166,35,0.14), transparent 55%), linear-gradient(135deg, #10352a 0%, #0a1a16 55%, #122b24 100%)',
  },
]

const MARQUEE_ITEMS: { icon: string; label: string }[] = [
  { icon: 'fa-location-dot', label: 'Cleveland, OH' },
  { icon: 'fa-handshake', label: 'Wholesaling' },
  { icon: 'fa-location-dot', label: 'Detroit, MI' },
  { icon: 'fa-calculator', label: 'Deal Analysis' },
  { icon: 'fa-location-dot', label: 'Indianapolis, IN' },
  { icon: 'fa-users', label: 'Buyer Network' },
  { icon: 'fa-magnifying-glass-location', label: 'Lead Capture' },
  { icon: 'fa-diagram-project', label: 'Pipeline' },
]

const FEATURES = [
  { icon: 'fa-magnifying-glass-location', title: 'Capture Leads', desc: 'Manual entry, driving for dollars, or bulk CSV import. Auto-enrich from address.' },
  { icon: 'fa-calculator', title: 'Deal Analyzer', desc: 'Instant MAO, 70% rule, repair estimates, equity spread, and buyer matching.' },
  { icon: 'fa-users', title: 'Buyer Network', desc: 'Organized cash buyers + investors with buy boxes. One-click deal distribution.' },
]

const MARKETS = [
  { img: clevelandImg, name: 'Cleveland, OH' },
  { img: detroitImg, name: 'Detroit, MI' },
  { img: indianapolisImg, name: 'Indianapolis, IN' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [])

  const go = (i: number) => setIndex((i + SLIDES.length) % SLIDES.length)

  return (
    <div className="min-h-screen bg-[#F9F6F1]">
      {/* ── Nav (over hero) ── */}
      <nav className="absolute inset-x-0 top-0 z-50 bg-gradient-to-b from-black/45 to-transparent">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" aria-label="Sadar Properties home">
            <Logo size={38} dark />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="#features"
              className="hidden rounded-2xl px-4 py-2 text-sm font-semibold text-white/85 hover:text-white sm:block"
            >
              Features
            </Link>
            <Link
              to="#markets"
              className="hidden rounded-2xl px-4 py-2 text-sm font-semibold text-white/85 hover:text-white sm:block"
            >
              Markets
            </Link>
            <button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="rounded-2xl border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              {user ? 'Dashboard' : 'Log in'}
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="rounded-2xl bg-[#F5A623] px-4 py-2 text-sm font-bold text-[#1A3C34] shadow-lg shadow-amber-900/30 hover:brightness-105"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero slider (chef-academy style) ── */}
      <section className="relative overflow-hidden" style={{ minHeight: 'min(92vh, 780px)' }}>
        <div
          className="flex h-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className="relative flex w-full flex-shrink-0 items-center"
              style={{ minHeight: 'min(92vh, 780px)', background: slide.gradient }}
            >
              {/* subtle grid texture */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
                  backgroundSize: '56px 56px',
                }}
              />
              <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-28 pb-16 sm:px-6">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-medium tracking-[2px] text-[#F5A623]">
                    {slide.eyebrow}
                  </span>
                  <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-[-2.5px] text-white md:text-6xl lg:text-7xl">
                    {slide.title}
                  </h1>
                  <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">{slide.text}</p>
                  <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => navigate('/signup')}
                      className="group flex h-14 items-center justify-center rounded-2xl bg-[#F5A623] px-10 font-bold text-[#1A3C34] shadow-lg shadow-amber-900/30 transition active:scale-[0.985]"
                    >
                      Get Started — Free
                      <span className="ml-2 inline-block transition group-hover:translate-x-0.5">→</span>
                    </button>
                    <button
                      onClick={() => navigate('/login')}
                      className="h-14 rounded-2xl border border-white/25 px-8 font-semibold text-white/90 hover:bg-white/5"
                    >
                      Log in
                    </button>
                  </div>
                  <p className="mt-5 text-xs text-white/50">No credit card required • Start closing deals today</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Market preview cluster (right, desktop) */}
        <div className="pointer-events-none absolute bottom-10 right-6 z-10 hidden w-52 xl:block">
          {MARKETS.map((m, i) => (
            <div
              key={m.name}
              className="pointer-events-auto absolute right-0 w-44 overflow-hidden rounded-2xl bg-[#0e2420] shadow-2xl ring-1 ring-white/15"
              style={{ bottom: i * 96, transform: `rotate(${i === 1 ? 1.5 : -1.5}deg)` }}
            >
              <img src={m.img} alt={m.name} className="h-24 w-full object-cover" loading="lazy" decoding="async" />
              <div className="bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">{m.name}</div>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-7 bg-[#F5A623]' : 'w-2 bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>

        {/* Prev / Next */}
        <button
          onClick={() => go(index - 1)}
          aria-label="Previous slide"
          className="absolute left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-white/80 backdrop-blur hover:bg-white/10 md:flex"
        >
          <i className="fa-solid fa-chevron-left" />
        </button>
        <button
          onClick={() => go(index + 1)}
          aria-label="Next slide"
          className="absolute right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-white/80 backdrop-blur hover:bg-white/10 md:flex"
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      </section>

      {/* ── Marquee ticker ── */}
      <section id="markets" className="overflow-hidden border-y border-black/5 bg-[#F5A623] py-3.5" aria-label="Markets and services">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center" aria-hidden={copy === 1}>
              {MARQUEE_ITEMS.map((item, i) => (
                <span
                  key={`${copy}-${i}`}
                  className="flex items-center gap-2.5 px-6 text-sm font-bold uppercase tracking-wide text-[#1A3C34]"
                >
                  <i className={`fa-solid ${item.icon} text-[#0e2420]/60`} />
                  {item.label}
                  <i className="fa-solid fa-circle ml-6 text-[#0e2420]/25 text-[5px]" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[2px] text-[#F5A623]">Everything you need</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#1A3C34] md:text-5xl">
            Built for wholesalers who want to move fast.
          </h2>
          <p className="mt-4 text-lg text-[#6B7280]">
            Source leads, analyze deals, and put them in front of the right buyers — all in one place.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl border border-black/5 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A3C34]/5 text-xl text-[#1A3C34]">
                <i className={`fa-solid ${f.icon}`} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-[#1A3C34]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#0e2420] px-8 py-16 text-center md:py-20">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(700px 300px at 50% -20%, rgba(245,166,35,0.18), transparent 60%)',
            }}
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
