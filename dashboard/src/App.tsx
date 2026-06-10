import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import OnboardingPage from './pages/OnboardingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import BuyersListPage from './pages/BuyersListPage'
import DealAnalyzerPage from './pages/DealAnalyzerPage'
import AssignmentClosePage from './pages/AssignmentClosePage'
import LeadCapturePage from './pages/LeadCapturePage'
import SendDealPage from './pages/SendDealPage'
import PipelinePage from './pages/PipelinePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F9F6F1] text-[#6B7280]">Loading…</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/buyers" element={<ProtectedRoute><BuyersListPage /></ProtectedRoute>} />
        <Route path="/deal-analyzer" element={<ProtectedRoute><DealAnalyzerPage /></ProtectedRoute>} />
        <Route path="/assignment-close" element={<ProtectedRoute><AssignmentClosePage /></ProtectedRoute>} />
        <Route path="/lead-capture" element={<ProtectedRoute><LeadCapturePage /></ProtectedRoute>} />
        <Route path="/send-deal" element={<ProtectedRoute><SendDealPage /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
