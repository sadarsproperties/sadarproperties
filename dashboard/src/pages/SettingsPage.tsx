import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'sources' | 'integrations' | 'prefs'>('sources');

  // Data Sources Preferences
  const [zillowActive, setZillowActive] = useState(true);
  const [craigslistActive, setCraigslistActive] = useState(true);
  const [facebookActive, setFacebookActive] = useState(false);
  const [propStreamActive, setPropStreamActive] = useState(true);
  const [batchLeadsActive, setBatchLeadsActive] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState('24h');

  // Integrations Settings
  const [aiMode, setAiMode] = useState('standard');
  const [enableEmailAlerts, setEnableEmailAlerts] = useState(true);

  // User Profile Preferences
  const [userName, setUserName] = useState("Peter O'Connor");
  const [userEmail, setUserEmail] = useState('peter@sadarproperties.com');
  const [timeZone, setTimeZone] = useState('America/New_York');

  // Success indicator
  const [saved, setSaved] = useState(false);

  // Load configuration from local storage
  useEffect(() => {
    setZillowActive(localStorage.getItem('pref_zillow_active') !== 'false');
    setCraigslistActive(localStorage.getItem('pref_craigslist_active') !== 'false');
    setFacebookActive(localStorage.getItem('pref_facebook_active') === 'true');
    setPropStreamActive(localStorage.getItem('pref_propstream_active') !== 'false');
    setBatchLeadsActive(localStorage.getItem('pref_batchleads_active') === 'true');
    setRefreshInterval(localStorage.getItem('pref_refresh_interval') || '24h');

    setAiMode(localStorage.getItem('pref_ai_mode') || 'standard');
    setEnableEmailAlerts(localStorage.getItem('pref_email_alerts') !== 'false');

    setUserName(localStorage.getItem('profile_name') || "Peter O'Connor");
    setUserEmail(localStorage.getItem('profile_email') || 'peter@sadarproperties.com');
    setTimeZone(localStorage.getItem('profile_timezone') || 'America/New_York');
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('pref_zillow_active', String(zillowActive));
    localStorage.setItem('pref_craigslist_active', String(craigslistActive));
    localStorage.setItem('pref_facebook_active', String(facebookActive));
    localStorage.setItem('pref_propstream_active', String(propStreamActive));
    localStorage.setItem('pref_batchleads_active', String(batchLeadsActive));
    localStorage.setItem('pref_refresh_interval', refreshInterval);

    localStorage.setItem('pref_ai_mode', aiMode);
    localStorage.setItem('pref_email_alerts', String(enableEmailAlerts));

    localStorage.setItem('profile_name', userName);
    localStorage.setItem('profile_email', userEmail);
    localStorage.setItem('profile_timezone', timeZone);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AppLayout title="Settings">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Navigation Menu */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="rounded-3xl border border-black/5 bg-white p-3 shadow-sm flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            <button
              onClick={() => setActiveSection('sources')}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition duration-150 w-full shrink-0 ${
                activeSection === 'sources'
                  ? 'bg-[#1A3C34]/10 text-[#1A3C34]'
                  : 'text-slate-550 hover:bg-black/5'
              }`}
            >
              🕸️ Data Sources
            </button>
            <button
              onClick={() => setActiveSection('integrations')}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition duration-150 w-full shrink-0 ${
                activeSection === 'integrations'
                  ? 'bg-[#1A3C34]/10 text-[#1A3C34]'
                  : 'text-slate-550 hover:bg-black/5'
              }`}
            >
              🔌 Integrations
            </button>
            <button
              onClick={() => setActiveSection('prefs')}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition duration-150 w-full shrink-0 ${
                activeSection === 'prefs'
                  ? 'bg-[#1A3C34]/10 text-[#1A3C34]'
                  : 'text-slate-550 hover:bg-black/5'
              }`}
            >
              👤 User Preferences
            </button>
          </div>
        </div>

        {/* Right Content Panels */}
        <div className="flex-1">
          <form onSubmit={handleSave} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            {saved && (
              <div className="mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 p-4 text-xs font-bold text-emerald-700 flex justify-between items-center">
                <span>✓ Configuration updated successfully.</span>
                <button type="button" onClick={() => setSaved(false)}>✕</button>
              </div>
            )}

            {/* DATA SOURCES SECTION */}
            {activeSection === 'sources' && (
              <div>
                <h3 className="text-base font-bold text-[#1A3C34] mb-1">Data Feed Channels</h3>
                <p className="text-xs text-slate-550 mb-6">Choose platforms to monitor for wholesale leads and schedule ingest cycles.</p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div>
                      <p className="text-xs font-bold text-[#1A3C34]">Zillow Feed</p>
                      <p className="text-[10px] text-slate-450">Scan for active single-family properties.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={zillowActive}
                      onChange={e => setZillowActive(e.target.checked)}
                      className="h-4 w-4 accent-[#1A3C34] rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div>
                      <p className="text-xs font-bold text-[#1A3C34]">Craigslist Feed</p>
                      <p className="text-[10px] text-slate-450">Scan for direct-by-owner motivated listings.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={craigslistActive}
                      onChange={e => setCraigslistActive(e.target.checked)}
                      className="h-4 w-4 accent-[#1A3C34] rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div>
                      <p className="text-xs font-bold text-[#1A3C34]">Facebook Marketplace</p>
                      <p className="text-[10px] text-slate-450">Scan local groups for off-market wholesale deals.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={facebookActive}
                      onChange={e => setFacebookActive(e.target.checked)}
                      className="h-4 w-4 accent-[#1A3C34] rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div>
                      <p className="text-xs font-bold text-[#1A3C34]">PropStream Feed</p>
                      <p className="text-[10px] text-slate-450">Import pre-foreclosures and absentee data lists.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={propStreamActive}
                      onChange={e => setPropStreamActive(e.target.checked)}
                      className="h-4 w-4 accent-[#1A3C34] rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div>
                      <p className="text-xs font-bold text-[#1A3C34]">BatchLeads Integration</p>
                      <p className="text-[10px] text-slate-450">Automatically import phone and contact skip-traces.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={batchLeadsActive}
                      onChange={e => setBatchLeadsActive(e.target.checked)}
                      className="h-4 w-4 accent-[#1A3C34] rounded"
                    />
                  </div>

                  <div className="border-t border-black/5 pt-4">
                    <label className="block text-xs font-bold text-slate-550 uppercase mb-1.5">Refresh Frequency</label>
                    <select
                      value={refreshInterval}
                      onChange={e => setRefreshInterval(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                    >
                      <option value="12h">Twice Daily (Every 12 hours)</option>
                      <option value="24h">Daily (Every 24 hours)</option>
                      <option value="48h">Every 2 Days (Every 48 hours)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* INTEGRATIONS SECTION */}
            {activeSection === 'integrations' && (
              <div>
                <h3 className="text-base font-bold text-[#1A3C34] mb-1">External Integrations</h3>
                <p className="text-xs text-slate-550 mb-6">Manage settings for automated platforms and communication tools.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-550 uppercase mb-1.5">AI Buy Box Extraction Engine</label>
                    <select
                      value={aiMode}
                      onChange={e => setAiMode(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                    >
                      <option value="fast">Fast AI Extraction Mode (Low Latency)</option>
                      <option value="standard">Standard Balanced Extraction Mode</option>
                      <option value="deep">Deep Analysis Extraction Mode (Maximum Accuracy)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-black/5 mt-4">
                    <div>
                      <p className="text-xs font-bold text-[#1A3C34]">Automated Email Notifications</p>
                      <p className="text-[10px] text-slate-450">Alert buyer contacts instantly when properties match their criteria.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableEmailAlerts}
                      onChange={e => setEnableEmailAlerts(e.target.checked)}
                      className="h-4 w-4 accent-[#1A3C34] rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* USER PREFERENCES SECTION */}
            {activeSection === 'prefs' && (
              <div>
                <h3 className="text-base font-bold text-[#1A3C34] mb-1">User Profile & Prefs</h3>
                <p className="text-xs text-slate-550 mb-6">Customize contact information and regional settings.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-550 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-550 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={e => setUserEmail(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-550 uppercase mb-1">Dashboard Timezone</label>
                    <select
                      value={timeZone}
                      onChange={e => setTimeZone(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm text-[#1A3C34] focus:outline-none"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="mt-8 border-t border-black/5 pt-4 flex justify-end">
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
