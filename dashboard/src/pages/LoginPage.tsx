import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Footer from '../components/Footer'
import Logo from '../components/Logo'
import { API_BASE } from '../api/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError('')
    try {
      await login(email.trim(), password)
      navigate('/dashboard')
    } catch (err: any) {
      setLocalError(err.message || 'Login failed')
    }
  }

  function handleGoogle() {
    window.location.href = `${API_BASE}/auth/google`
  }

  function handleFacebook() {
    window.location.href = `${API_BASE}/auth/facebook`
  }

  return (
    <div className="min-h-screen bg-[#F9F6F1] flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link to="/onboarding">
              <Logo size={44} />
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1A3C34]">Welcome back</h1>
            <p className="text-[#6B7280] mt-1">Sign in to continue to your pipeline.</p>

            {/* Social logins */}
            <div className="mt-6 grid grid-cols-1 gap-3">
              <button
                onClick={handleGoogle}
                className="flex items-center justify-center gap-3 w-full h-12 rounded-2xl border border-black/10 bg-white font-semibold hover:bg-black/5 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.34z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22 1.81-1.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <button
                onClick={handleFacebook}
                className="flex items-center justify-center gap-3 w-full h-12 rounded-2xl bg-[#1877F2] text-white font-semibold hover:brightness-95 transition"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12a10 10 0 10-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.1 0-1.5.7-1.5 1.4v1.7h2.8l-.4 2.9h-2.4v7A10 10 0 0022 12z"/></svg>
                Continue with Facebook
              </button>
            </div>

            <div className="my-6 flex items-center gap-3 text-xs text-[#8A8A8A]">
              <div className="flex-1 h-px bg-black/10" /> or <div className="flex-1 h-px bg-black/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#1A3C34]"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#1A3C34]"
                  placeholder="••••••••"
                />
              </div>

              {(error || localError) && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error || localError}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-[#1A3C34] text-white font-bold disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-sm text-[#6B7280] mt-6">
              Don’t have an account?{' '}
              <Link to="/signup" className="font-semibold text-[#1A3C34] hover:underline">Create one</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
