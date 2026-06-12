import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import marcusImg from '../assets/marcus_professional_headshot.jpg';
import Footer from './Footer';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'fa-house' },
  { to: '/pipeline', label: 'Pipeline', icon: 'fa-columns' },
  { to: '/lead-capture', label: 'Leads', icon: 'fa-magnifying-glass-dollar' },
  { to: '/deal-analyzer', label: 'Analyzer', icon: 'fa-calculator' },
  { to: '/buyers', label: 'Buyers', icon: 'fa-users' },
];

export default function AppLayout({ children, title, showBack, onBack }: AppLayoutProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || (path === '/dashboard' && location.pathname === '/');

  return (
    <div className="min-h-screen bg-[#F9F6F1]">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              {showBack && (
                <button
                  onClick={onBack}
                  className="mr-1 flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-[#1A3C34] hover:bg-black/5"
                  aria-label="Go back"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              )}
              <Link to="/dashboard" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5A623] shadow-sm">
                  <svg width="18" height="16" viewBox="0 0 24 22" fill="none">
                    <path d="M12 2L2 9V20C2 20.55 2.45 21 3 21H9V15H15V21H21C21.55 21 22 20.55 22 20V9L12 2Z" fill="#1A3C34" />
                  </svg>
                </div>
                <div className="text-xl font-extrabold tracking-tight text-[#1A3C34]">
                  Wholesale<span className="text-[#F5A623]">IQ</span>
                </div>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    isActive(item.to)
                      ? 'bg-[#1A3C34] text-white'
                      : 'text-[#2C2C2C] hover:bg-black/5'
                  }`}
                >
                  <i className={`fas ${item.icon} text-base`} />
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1.5 text-sm sm:flex">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-[#5A6672]">Connected</span>
              </div>

              <UserMenu />

              {/* Mobile hamburger */}
              <div className="md:hidden">
                <details className="relative">
                  <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-black/10 text-[#1A3C34] hover:bg-black/5">
                    <i className="fas fa-bars" />
                  </summary>
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-black/10 bg-white py-2 shadow-xl">
                    {navItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#2C2C2C] hover:bg-[#F9F6F1]"
                      >
                        <i className={`fas ${item.icon} w-4`} />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Title (optional) */}
      {title && (
        <div className="border-b border-black/5 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1A3C34]">{title}</h1>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
        {children}
      </main>

      {/* Premium Footer */}
      <Footer />

      {/* Bottom nav for mobile (simple) */}
      <nav className="sticky bottom-0 z-40 border-t border-black/10 bg-white md:hidden">
        <div className="flex items-stretch justify-around px-1 py-1.5 text-xs">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 ${isActive(item.to) ? 'text-[#1A3C34]' : 'text-[#8A8A8A]'}`}
            >
              <i className={`fas ${item.icon} text-lg`} />
              <span className="font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <Link to="/login" className="text-sm font-semibold px-4 py-2 rounded-2xl border border-black/10 hover:bg-black/5">
        Log in
      </Link>
    );
  }

  const avatar = user.avatarUrl || 'https://i.pravatar.cc/36?img=47';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-2xl border border-black/10 pl-1.5 pr-3 py-1.5 hover:bg-black/5"
      >
        <img src={avatar} alt="" className="h-8 w-8 rounded-xl object-cover border border-black/10" />
        <span className="hidden sm:block text-sm font-semibold text-[#1A3C34] max-w-[110px] truncate">{user.name}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-black/10 bg-white shadow-xl py-1 z-50 text-sm">
          <div className="px-4 py-2 border-b border-black/10">
            <div className="font-semibold text-[#1A3C34]">{user.name}</div>
            <div className="text-[#6B7280] text-xs truncate">{user.email}</div>
          </div>
          <button
            onClick={async () => { await logout(); setOpen(false); window.location.href = '/login'; }}
            className="w-full text-left px-4 py-2.5 hover:bg-[#F9F6F1] text-red-600 font-medium"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

