import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { api } from '../api/client';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'integrations' | 'sources' | 'profile'>('integrations');

  // Integrations states
  const [deepSeekKey, setDeepSeekKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [resendKey, setResendKey] = useState('');
  const [resendFrom, setResendFrom] = useState('');

  // Sources states
  const [scrapeHeadless, setScrapeHeadless] = useState(true);
  const [fbEmail, setFbEmail] = useState('');
  const [fbPassword, setFbPassword] = useState('');
  const [batchEmail, setBatchEmail] = useState('');
  const [batchPassword, setBatchPassword] = useState('');

  // Profile states
  const [userName, setUserName] = useState('Peter O\'Connor');
  const [userEmail, setUserEmail] = useState('peter@sadarproperties.com');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Success indicator
  const [saved, setSaved] = useState(false);

  // Load configuration from local mock storage or config values
  useEffect(() => {
    // Fill in placeholders or load from localStorage
    setDeepSeekKey(localStorage.getItem('settings_deepseek_key') || 'sk-e0a49806b137****************');
    setGeminiKey(localStorage.getItem('settings_gemini_key') || 'AQ.Ab8RN6JxyZfP****************');
    setOpenAiKey(localStorage.getItem('settings_openai_key') || 'sk-proj-eI8C8NosFEd****************');
    setResendKey(localStorage.getItem('settings_resend_key') || 're_123456789****************');
    setResendFrom(localStorage.getItem('settings_resend_from') || 'Sadar Properties <deals@sadarproperties.com>');

    setFbEmail(localStorage.getItem('settings_fb_email') || 'Propertiesbysardar@gmail.com');
    setFbPassword(localStorage.getItem('settings_fb_password') || '••••••••••••');
    setBatchEmail(localStorage.getItem('settings_batch_email') || 'Propertiesbysardar@gmail.com');
    setBatchPassword(localStorage.getItem('settings_batch_password') || '••••••••••••');

    const profileName = localStorage.getItem('profile_name') || 'Peter O\'Connor';
    const profileEmail = localStorage.getItem('profile_email') || 'peter@sadarproperties.com';
    setUserName(profileName);
    setUserEmail(profileEmail);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('settings_deepseek_key', deepSeekKey);
    localStorage.setItem('settings_gemini_key', geminiKey);
    localStorage.setItem('settings_openai_key', openAiKey);
    localStorage.setItem('settings_resend_key', resendKey);
    localStorage.setItem('settings_resend_from', resendFrom);

    localStorage.setItem('settings_fb_email', fbEmail);
    localStorage.setItem('settings_fb_password', fbPassword);
    localStorage.setItem('settings_batch_email', batchEmail);
    localStorage.setItem('settings_batch_password', batchPassword);

    localStorage.setItem('profile_name', userName);
    localStorage.setItem('profile_email', userEmail);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDb = async () => {
    if (confirm('Are you sure you want to clear the entire database? This will remove all properties, buyers, sellers, and investors. This action is irreversible.')) {
      try {
        await api.clearDb();
        alert('Database cleared successfully! The page will now reload.');
        window.location.reload();
      } catch (err) {
        alert('Failed to clear database');
      }
    }
  };

  return (
    <AppLayout title="Settings">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Side: Navigation Links */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="rounded-3xl border border-black/5 bg-white p-3 shadow-sm flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            <button
              onClick={() => setActiveSection('integrations')}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition duration-150 w-full shrink-0 ${
                activeSection === 'integrations'
                  ? 'bg-[#1A3C34]/10 text-[#1A3C34]'
                  : 'text-slate-550 hover:bg-black/5'
              }`}
            >
              🔌 Integrations & API Keys
            </button>
            <button
              onClick={() => setActiveSection('sources')}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition duration-150 w-full shrink-0 ${
                activeSection === 'sources'
                  ? 'bg-[#1A3C34]/10 text-[#1A3C34]'
                  : 'text-slate-550 hover:bg-black/5'
              }`}
            >
              🕸️ Data Scrapers
            </button>
            <button
              onClick={() => setActiveSection('profile')}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition duration-150 w-full shrink-0 ${
                activeSection === 'profile'
                  ? 'bg-[#1A3C34]/10 text-[#1A3C34]'
                  : 'text-slate-550 hover:bg-black/5'
              }`}
            >
              👤 User Profile
            </button>
          </div>
        </div>

        {/* Right Side: Tab Forms */}
        <div className="flex-1">
          <form onSubmit={handleSave} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            {saved && (
              <div className="mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 p-4 text-xs font-bold text-emerald-700 flex justify-between items-center">
                <span>✓ Configuration saved successfully! Changes are applied.</span>
                <button type="button" onClick={() => setSaved(false)}>✕</button>
              </div>
            )}

            {/* INTEGRATIONS SECTION */}
            {activeSection === 'integrations' && (
              <div>
                <h3 className="text-base font-bold text-[#1A3C34] mb-1">Integrations & LLM Settings</h3>
                <p className="text-xs text-slate-500 mb-6">Manage external API credentials for automated messaging and AI buy box extraction.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">DeepSeek API Key (Primary LLM)</label>
                    <input
                      type="password"
                      value={deepSeekKey}
                      onChange={e => setDeepSeekKey(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none focus:border-[#1A3C34]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Gemini API Key (Fallback)</label>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none focus:border-[#1A3C34]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">OpenAI API Key (Secondary Fallback)</label>
                    <input
                      type="password"
                      value={openAiKey}
                      onChange={e => setOpenAiKey(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none focus:border-[#1A3C34]"
                    />
                  </div>

                  <div className="border-t border-black/5 pt-4">
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Resend API Key (Email Delivery)</label>
                    <input
                      type="password"
                      value={resendKey}
                      onChange={e => setResendKey(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none focus:border-[#1A3C34]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Sender Email Address (Resend Verified Domain)</label>
                    <input
                      type="text"
                      value={resendFrom}
                      onChange={e => setResendFrom(e.target.value)}
                      placeholder="e.g. Deals <deals@yourdomain.com>"
                      className="w-full rounded-2xl border border-black/10 bg-slate-550/5 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none focus:border-[#1A3C34]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SCRAPERS SECTION */}
            {activeSection === 'sources' && (
              <div>
                <h3 className="text-base font-bold text-[#1A3C34] mb-1">Data Scraper Configurations</h3>
                <p className="text-xs text-slate-500 mb-6">Setup automation parameters for discovery scraping across major networks.</p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div>
                      <p className="text-xs font-bold text-[#1A3C34]">Run Browser Headless</p>
                      <p className="text-[10px] text-slate-450">Runs scrapers in background without opening browser window UI.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={scrapeHeadless}
                      onChange={e => setScrapeHeadless(e.target.checked)}
                      className="h-4 w-4 text-[#1A3C34] rounded"
                    />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-450 uppercase mb-2">Facebook Login Details (Auto Group Scanning)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-450 mb-0.5">FB Account Email</label>
                        <input
                          type="text"
                          value={fbEmail}
                          onChange={e => setFbEmail(e.target.value)}
                          className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-450 mb-0.5">FB Password</label>
                        <input
                          type="password"
                          value={fbPassword}
                          onChange={e => setFbPassword(e.target.value)}
                          className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-black/5 pt-4">
                    <h4 className="text-xs font-bold text-slate-450 uppercase mb-2">BatchLeads Login Credentials</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-450 mb-0.5">Account Email</label>
                        <input
                          type="text"
                          value={batchEmail}
                          onChange={e => setBatchEmail(e.target.value)}
                          className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-450 mb-0.5">Account Password</label>
                        <input
                          type="password"
                          value={batchPassword}
                          onChange={e => setBatchPassword(e.target.value)}
                          className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USER PROFILE SECTION */}
            {activeSection === 'profile' && (
              <div>
                <h3 className="text-base font-bold text-[#1A3C34] mb-1">User Profile Preferences</h3>
                <p className="text-xs text-slate-500 mb-6">Edit personal information, change avatars, and perform system actions.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={e => setUserEmail(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Custom Avatar URL (Optional)</label>
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={e => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                    />
                  </div>

                  {/* System Administration actions */}
                  <div className="border-t border-red-100 pt-6 mt-6">
                    <h4 className="text-xs font-bold text-rose-600 uppercase mb-2">Danger Zone</h4>
                    <div className="rounded-2xl border border-red-200 bg-rose-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Clear Database Storage</p>
                        <p className="text-[10px] text-slate-500">Deletes all leads, matches, communications, and logs.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetDb}
                        className="rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
                      >
                        Reset Database
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Footer */}
            <div className="mt-8 border-t border-black/5 pt-4 flex justify-end gap-2">
              <button
                type="submit"
                className="rounded-2xl bg-[#1A3C34] px-6 py-3 text-xs font-bold text-white hover:bg-[#1A3C34]/95 transition"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
