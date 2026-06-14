import { Link } from 'react-router-dom';
import Logo from './Logo';

interface FooterProps {
  dark?: boolean;
}

export default function Footer({ dark = false }: FooterProps) {
  const bgClass = dark ? 'bg-[#1A3C34] text-white border-white/10' : 'bg-white text-[#2C2C2C] border-black/5';
  const textMutedClass = dark ? 'text-white/60' : 'text-[#6B7280]';
  const textMutedHoverClass = dark ? 'hover:text-white' : 'hover:text-[#1A3C34]';
  const borderClass = dark ? 'border-white/10' : 'border-black/5';

  return (
    <footer className={`border-t ${bgClass} py-12 transition-all`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Main Grid */}
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 pb-8 border-b border-inherit">
          {/* Brand Col */}
          <div className="space-y-4">
            <Logo dark={dark} size={32} />
            <p className={`text-sm leading-relaxed ${textMutedClass}`}>
              The premium platform for real estate wholesaling and property investment. Analyze, match, and notify buyers effortlessly.
            </p>
          </div>

          {/* Platform Col */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5A623] mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm font-semibold">
              <li>
                <Link to="/lead-capture" className={`${textMutedClass} ${textMutedHoverClass} transition`}>
                  Lead Capture
                </Link>
              </li>
              <li>
                <Link to="/deal-analyzer" className={`${textMutedClass} ${textMutedHoverClass} transition`}>
                  Deal Analyzer
                </Link>
              </li>
              <li>
                <Link to="/buyers" className={`${textMutedClass} ${textMutedHoverClass} transition`}>
                  Buyers Network
                </Link>
              </li>
              <li>
                <Link to="/pipeline" className={`${textMutedClass} ${textMutedHoverClass} transition`}>
                  Deal Pipeline
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Col */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5A623] mb-4">Resources</h4>
            <ul className="space-y-2.5 text-sm font-semibold">
              <li className="flex items-center gap-2">
                <span className={`${textMutedClass}`}>Security & Encryption</span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">Live</span>
              </li>
              <li>
                <span className={`${textMutedClass} cursor-not-allowed`}>Help Center</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={`${textMutedClass}`}>Database Status</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#F5A623] mb-4">Contact & Support</h4>
            <ul className="space-y-2.5 text-sm font-semibold">
              <li>
                <Link to="/support" className={`${textMutedClass} ${textMutedHoverClass} transition`}>
                  Help & Support
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={`${textMutedClass} ${textMutedHoverClass} transition`}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className={`${textMutedClass} ${textMutedHoverClass} transition`}>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs font-semibold">
          <p className={textMutedClass}>
            &copy; {new Date().getFullYear()} Sadar Properties. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className={`${textMutedClass} ${textMutedHoverClass} transition cursor-pointer`}>
              <i className="fab fa-facebook text-lg" />
            </span>
            <span className={`${textMutedClass} ${textMutedHoverClass} transition cursor-pointer`}>
              <i className="fab fa-twitter text-lg" />
            </span>
            <span className={`${textMutedClass} ${textMutedHoverClass} transition cursor-pointer`}>
              <i className="fab fa-linkedin text-lg" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
