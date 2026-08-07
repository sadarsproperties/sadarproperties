import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../hooks/useStore';
import Footer from './Footer';
import Logo from './Logo';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'fa-house' },
  { to: '/properties', label: 'Properties', icon: 'fa-building' },
  { to: '/sellers', label: 'Sellers', icon: 'fa-user-tie' },
  { to: '/buyers', label: 'Buyers', icon: 'fa-users' },
  { to: '/buyers#investors', label: 'Investors', icon: 'fa-briefcase' },
  { to: '/areas', label: 'Areas', icon: 'fa-map' },
  { to: '/realtors', label: 'Realtors', icon: 'fa-user-tie' },
  { to: '/title-companies', label: 'Title Cos', icon: 'fa-building-columns' },
  { to: '/pipeline', label: 'CRM Pipeline', icon: 'fa-columns' },
  { to: '/deal-analyzer', label: 'Deal Analyzer', icon: 'fa-calculator' },
  { to: '/settings', label: 'Settings', icon: 'fa-gear' },
];

export default function AppLayout({ children, title, showBack, onBack }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path.includes('#')) {
      const [pathname, hash] = path.split('#');
      return location.pathname === pathname && location.hash === `#${hash}`;
    }
    return location.pathname === path || (path === '/dashboard' && location.pathname === '/');
  };

  // Close search results dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Universal Search calculations
  const query = searchQuery.trim().toLowerCase();

  const matchingProperties = query
    ? data.properties
        .filter(
          (p) =>
            (p.address || '').toLowerCase().includes(query) ||
            (p.city || '').toLowerCase().includes(query) ||
            (p.state || '').toLowerCase().includes(query) ||
            (p.zip || '').toLowerCase().includes(query)
        )
        .slice(0, 3)
    : [];

  const matchingSellers = query
    ? data.sellers
        .filter(
          (s) =>
            (s.ownerName || '').toLowerCase().includes(query) ||
            (s.phone || '').toLowerCase().includes(query) ||
            (s.email || '').toLowerCase().includes(query) ||
            (s.mailingAddress || '').toLowerCase().includes(query)
        )
        .slice(0, 3)
    : [];

  const matchingBuyers = query
    ? data.buyers
        .filter(
          (b) =>
            (b.fullName || '').toLowerCase().includes(query) ||
            (b.companyName || '').toLowerCase().includes(query) ||
            (b.phone || '').toLowerCase().includes(query) ||
            (b.email || '').toLowerCase().includes(query)
        )
        .slice(0, 3)
    : [];

  const matchingInvestors = query
    ? data.investors
        .filter(
          (i) =>
            (i.investorName || '').toLowerCase().includes(query) ||
            (i.companyName || '').toLowerCase().includes(query) ||
            (i.phone || '').toLowerCase().includes(query) ||
            (i.email || '').toLowerCase().includes(query)
        )
        .slice(0, 3)
    : [];

  const hasResults =
    matchingProperties.length > 0 ||
    matchingSellers.length > 0 ||
    matchingBuyers.length > 0 ||
    matchingInvestors.length > 0;

  const handleSearchResultClick = (path: string) => {
    setSearchQuery('');
    setShowSearchResults(false);
    navigate(path);
  };

  return (
    <div className="flex min-h-screen bg-[#F9F6F1]">
      {/* 1. DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-black/5 h-screen sticky top-0 shrink-0 z-40">
        {/* Brand header */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-black/5">
          <Logo size={28} />
          <span className="text-[#1A3C34] text-lg font-black tracking-tight">REWIP CRM</span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition duration-150 ${
                  active
                    ? 'bg-[#1A3C34] text-white shadow-md shadow-[#1A3C34]/10'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-[#1A3C34]'
                }`}
              >
                <i className={`fas ${item.icon} text-sm`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer profile & connection badge */}
        <div className="p-4 border-t border-black/5 space-y-3">
          <div className="flex items-center gap-2 rounded-2xl bg-[#F9F6F1] px-3 py-2 text-xs font-semibold text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Database Connection Live</span>
          </div>
          {user && (
            <div className="flex items-center gap-2 px-2">
              <img
                src={user.avatarUrl || 'https://i.pravatar.cc/32?img=47'}
                alt=""
                className="h-8 w-8 rounded-xl object-cover border border-black/10"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#1A3C34] truncate">{user.name}</p>
                <p className="text-[10px] text-slate-450 truncate">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN APP CONTAINER */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-6 sticky top-0 z-50">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            {showBack && (
              <button
                onClick={onBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 text-[#1A3C34] hover:bg-black/5 transition"
                aria-label="Go back"
              >
                <i className="fas fa-arrow-left text-sm" />
              </button>
            )}

            {/* Universal Search Bar */}
            <div ref={searchRef} className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <i className="fas fa-search text-xs" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Universal search: Address, Buyer, Seller..."
                className="w-full rounded-2xl border border-black/5 bg-[#F9F6F1] py-2 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#1A3C34] transition duration-150"
              />

              {/* Float Dropdown for search results */}
              {showSearchResults && searchQuery && (
                <div className="absolute top-11 left-0 z-50 w-full max-h-96 overflow-y-auto rounded-2xl border border-black/10 bg-white p-3 shadow-2xl space-y-3">
                  {!hasResults && (
                    <div className="py-4 text-center text-xs text-slate-400 font-semibold">
                      No matching records found for "{searchQuery}"
                    </div>
                  )}

                  {/* Properties Results */}
                  {matchingProperties.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-black/5 mb-1.5 flex justify-between">
                        <span>Properties</span>
                        <button
                          onClick={() => handleSearchResultClick(`/properties?q=${searchQuery}`)}
                          className="hover:text-[#1A3C34] lowercase"
                        >
                          View all
                        </button>
                      </div>
                      <div className="space-y-1">
                        {matchingProperties.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSearchResultClick(`/properties?q=${p.address}`)}
                            className="w-full text-left px-2 py-1.5 rounded-xl hover:bg-[#F9F6F1] transition flex justify-between items-center"
                          >
                            <span className="text-xs font-bold text-[#1A3C34] truncate">{p.address}</span>
                            <span className="text-[10px] text-slate-400 font-bold shrink-0">
                              {p.askingPrice || p.price ? `$${(p.askingPrice || p.price).toLocaleString()}` : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sellers Results */}
                  {matchingSellers.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-black/5 mb-1.5 flex justify-between">
                        <span>Sellers</span>
                        <button
                          onClick={() => handleSearchResultClick(`/sellers?q=${searchQuery}`)}
                          className="hover:text-[#1A3C34] lowercase"
                        >
                          View all
                        </button>
                      </div>
                      <div className="space-y-1">
                        {matchingSellers.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleSearchResultClick(`/sellers?q=${s.ownerName}`)}
                            className="w-full text-left px-2 py-1.5 rounded-xl hover:bg-[#F9F6F1] transition flex justify-between items-center"
                          >
                            <div>
                              <span className="text-xs font-bold text-[#1A3C34] block">{s.ownerName}</span>
                              <span className="text-[10px] text-slate-400">{s.phone || s.email || 'No contact details'}</span>
                            </div>
                            <span className="text-[10px] bg-[#1A3C34]/10 text-[#1A3C34] px-1.5 py-0.5 rounded font-bold shrink-0">Seller</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Buyers Results */}
                  {matchingBuyers.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-black/5 mb-1.5 flex justify-between">
                        <span>Buyers</span>
                        <button
                          onClick={() => handleSearchResultClick(`/buyers?q=${searchQuery}`)}
                          className="hover:text-[#1A3C34] lowercase"
                        >
                          View all
                        </button>
                      </div>
                      <div className="space-y-1">
                        {matchingBuyers.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => handleSearchResultClick(`/buyers?q=${b.fullName}`)}
                            className="w-full text-left px-2 py-1.5 rounded-xl hover:bg-[#F9F6F1] transition flex justify-between items-center"
                          >
                            <div>
                              <span className="text-xs font-bold text-[#1A3C34] block">{b.fullName}</span>
                              <span className="text-[10px] text-slate-400">{b.companyName || b.email}</span>
                            </div>
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold shrink-0">Buyer</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Investors Results */}
                  {matchingInvestors.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-black/5 mb-1.5 flex justify-between">
                        <span>Investors</span>
                        <button
                          onClick={() => handleSearchResultClick(`/buyers?q=${searchQuery}#investors`)}
                          className="hover:text-[#1A3C34] lowercase"
                        >
                          View all
                        </button>
                      </div>
                      <div className="space-y-1">
                        {matchingInvestors.map((i) => (
                          <button
                            key={i.id}
                            onClick={() => handleSearchResultClick(`/buyers?q=${i.investorName}#investors`)}
                            className="w-full text-left px-2 py-1.5 rounded-xl hover:bg-[#F9F6F1] transition flex justify-between items-center"
                          >
                            <div>
                              <span className="text-xs font-bold text-[#1A3C34] block">{i.investorName}</span>
                              <span className="text-[10px] text-slate-400">{i.companyName || i.email}</span>
                            </div>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold shrink-0">Investor</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop badge */}
            <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1.5 text-xs sm:flex">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-[#1A3C34]">Active Session</span>
            </div>

            {/* User Dropdown */}
            <UserMenu />

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-[#1A3C34] hover:bg-black/5 transition"
              aria-label="Toggle menu"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`} />
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-black/5 bg-white px-4 py-4 space-y-1 shadow-lg">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition duration-150 ${
                    active ? 'bg-[#1A3C34] text-white' : 'text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  <i className={`fas ${item.icon} w-4`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Page Title Panel */}
        {title && (
          <div className="border-b border-black/5 bg-white">
            <div className="mx-auto w-full px-6 py-4">
              <h1 className="text-xl font-black tracking-tight text-[#1A3C34]">{title}</h1>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full px-6 py-6 max-w-7xl mx-auto">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile Sticky Bottom Nav Bar (Supplementary UX) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/10 bg-white md:hidden py-1 shadow-2xl flex items-stretch justify-around text-[10px]">
        {navItems.slice(0, 4).map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 flex-1 ${
                active ? 'text-[#1A3C34] font-bold' : 'text-slate-400'
              }`}
            >
              <i className={`fas ${item.icon} text-base`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <Link to="/login" className="text-xs font-bold px-4 py-2 rounded-2xl border border-black/10 hover:bg-black/5 text-[#1A3C34] transition">
        Log in
      </Link>
    );
  }

  const avatar = user.avatarUrl || 'https://i.pravatar.cc/32?img=47';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-2xl border border-black/10 pl-1.5 pr-2.5 py-1.5 hover:bg-black/5 transition"
      >
        <img src={avatar} alt="" className="h-7 w-7 rounded-xl object-cover border border-black/10" />
        <span className="hidden sm:block text-xs font-bold text-[#1A3C34] max-w-[100px] truncate">{user.name}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-black/10 bg-white shadow-xl py-1 z-50 text-xs">
          <div className="px-4 py-2 border-b border-black/10">
            <div className="font-bold text-[#1A3C34]">{user.name}</div>
            <div className="text-slate-450 text-[10px] truncate">{user.email}</div>
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-4 py-2 hover:bg-[#F9F6F1] font-semibold text-slate-700"
          >
            ⚙ Settings
          </Link>
          <button
            onClick={async () => {
              await logout();
              setOpen(false);
              window.location.href = '/login';
            }}
            className="w-full text-left px-4 py-2 hover:bg-[#F9F6F1] text-red-650 font-bold border-t border-black/5"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
