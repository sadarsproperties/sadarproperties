import { useNavigate, Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Logo from '../components/Logo'

export default function OnboardingPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#0e2420] text-white flex flex-col justify-between">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Logo size={44} dark />
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
            Sadar Properties
          </h1>
          <h2 className="mx-auto max-w-4xl text-4xl font-extrabold leading-none tracking-[-1.5px] mt-4 text-[#F5A623]">
            Close More Deals. Faster.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            The complete real estate wholesaling CRM to source motivated sellers, analyze deals instantly, and connect with cash buyers. We integrate with Google services to securely log you in, sync your contacts, and save deal sheets to your Drive.
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

        {/* Google OAuth & Purpose Section */}
        <div className="mt-20 rounded-3xl border border-white/10 bg-white/5 p-8 max-w-3xl mx-auto text-left">
          <h3 className="text-2xl font-bold text-[#F5A623] mb-4">About Sadar Properties & Google Integration</h3>
          <p className="text-sm leading-relaxed text-white/80 mb-4">
            Sadar Properties is a specialized CRM and wholesaling tool designed to help real estate professionals organize their pipelines, calculate deal metrics (Maximum Allowable Offer, estimated repairs), and manage buyer relationships.
          </p>
          <div className="text-sm leading-relaxed text-white/80">
            <strong>Why we request Google OAuth permissions:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/70">
              <li><strong>Secure Authentication:</strong> You can log in instantly and securely using your Google account.</li>
              <li><strong>Contacts Synchronization:</strong> Import and sync your cash buyers directly into Sadar Properties from your Google Contacts.</li>
              <li><strong>Export to Google Drive:</strong> Generate PDF/Excel deal sheets and save them directly to your Google Drive to share with prospective buyers.</li>
            </ul>
          </div>
          <p className="text-xs text-white/50 mt-4">
            Sadar Properties is fully committed to user privacy. We do not sell or share any data retrieved from Google APIs. For more information, please see our <Link to="/privacy" className="text-[#F5A623] hover:underline">Privacy Policy</Link> and <Link to="/terms" className="text-[#F5A623] hover:underline">Terms of Service</Link>.
          </p>
        </div>
      </div>

      <Footer dark />
    </div>
  )
}
