import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import HomePage from './pages/HomePage'
import FeaturesPage from './pages/FeaturesPage'
import MarketsPage from './pages/MarketsPage'
import OnboardingPage from './pages/OnboardingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import PropertiesPage from './pages/PropertiesPage'
import BuyersListPage from './pages/BuyersListPage'
import DealAnalyzerPage from './pages/DealAnalyzerPage'
import AssignmentClosePage from './pages/AssignmentClosePage'
import LeadCapturePage from './pages/LeadCapturePage'
import SellersListPage from './pages/SellersListPage'
import SendDealPage from './pages/SendDealPage'
import PipelinePage from './pages/PipelinePage'
import SettingsPage from './pages/SettingsPage'
import RealtorsPage from './pages/RealtorsPage'
import TitleCompaniesPage from './pages/TitleCompaniesPage'
import AreasPage from './pages/AreasPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import SupportPage from './pages/SupportPage'

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
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/properties" element={<ProtectedRoute><PropertiesPage /></ProtectedRoute>} />
        <Route path="/buyers" element={<ProtectedRoute><BuyersListPage /></ProtectedRoute>} />
        <Route path="/deal-analyzer" element={<ProtectedRoute><DealAnalyzerPage /></ProtectedRoute>} />
        <Route path="/assignment-close" element={<ProtectedRoute><AssignmentClosePage /></ProtectedRoute>} />
        <Route path="/lead-capture" element={<ProtectedRoute><LeadCapturePage /></ProtectedRoute>} />
        <Route path="/sellers" element={<ProtectedRoute><SellersListPage /></ProtectedRoute>} />
        <Route path="/send-deal" element={<ProtectedRoute><SendDealPage /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
        <Route path="/areas" element={<ProtectedRoute><AreasPage /></ProtectedRoute>} />
        <Route path="/realtors" element={<ProtectedRoute><RealtorsPage /></ProtectedRoute>} />
        <Route path="/title-companies" element={<ProtectedRoute><TitleCompaniesPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        
        {/* Public Utility pages */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Routes>
    </BrowserRouter>
  )
}
