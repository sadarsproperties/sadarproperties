import { Link, NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../hooks/useAuth'

interface MarketingNavProps {
  solid?: boolean
}

const LINKS = [
  { to: '/features', label: 'Features' },
  { to: '/markets', label: 'Markets' },
]

export default function MarketingNav({ solid = false }: MarketingNavProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <nav
      className={
        solid
          ? 'sticky top-0 z-50 border-b border-white/10 bg-[#0e2420]'
          : 'absolute inset-x-0 top-0 z-50 bg-gradient-to-b from-black/45 to-transparent'
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" aria-label="Sadar Properties home">
          <Logo size={38} dark />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `hidden rounded-2xl px-4 py-2 text-sm font-semibold transition sm:block ${
                  isActive ? 'text-[#F5A623]' : 'text-white/85 hover:text-white'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
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
  )
}
