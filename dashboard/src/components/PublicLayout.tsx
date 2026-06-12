import { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Footer from './Footer';
import { useAuth } from '../hooks/useAuth';

interface PublicLayoutProps {
  children: ReactNode;
  title: string;
}

export default function PublicLayout({ children, title }: PublicLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F9F6F1] flex flex-col justify-between">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/onboarding" className="flex items-center gap-2.5">
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

            <div>
              {user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="rounded-2xl bg-[#1A3C34] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
                >
                  Go to Dashboard
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-[#1A3C34] hover:bg-black/5 transition"
                >
                  Log in
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8 md:p-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1A3C34] mb-8">{title}</h1>
          <div className="prose prose-slate max-w-none text-[#2C2C2C] leading-relaxed space-y-6">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
