import { useState, useEffect } from 'react';
import { API_BASE } from '../api/client';
import AppLayout from '../components/AppLayout';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'sources' | 'integrations' | 'prefs'>('sources');

  // Data Sources Preferences
  const [zillowActive, setZillowActive] = useState(true);
  const [zillowUrl, setZillowUrl] = useState('');
  const [craigslistActive, setCraigslistActive] = useState(true);
  const [craigslistUrl, setCraigslistUrl] = useState('');
  const [facebookActive, setFacebookActive] = useState(false);
  const [facebookUrl, setFacebookUrl] = useState('');
  const [propStreamActive, setPropStreamActive] = useState(true);
  const [propStreamUrl, setPropStreamUrl] = useState('');
  const [batchLeadsActive, setBatchLeadsActive] = useState(false);
  const [batchLeadsUrl, setBatchLeadsUrl] = useState('');
  const [fsboActive, setFsboActive] = useState(false);
  const [fsboUrl, setFsboUrl] = useState('');
  const [auctionActive, setAuctionActive] = useState(false);
  const [auctionUrl, setAuctionUrl] = useState('');
  const [subjectToActive, setSubjectToActive] = useState(false);
  const [subjectToUrl, setSubjectToUrl] = useState('');
  const [realtorsActive, setRealtorsActive] = useState(false);
  const [realtorsUrl, setRealtorsUrl] = useState('');
  const [titleCompaniesActive, setTitleCompaniesActive] = useState(false);
  const [titleCompaniesUrl, setTitleCompaniesUrl] = useState('');
  const [refreshInterval, setRefreshInterval] = useState('24h');

  // Triggering state
  const [triggering, setTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState('');

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
    setZillowUrl(localStorage.getItem('pref_zillow_url') || '');
    setCraigslistActive(localStorage.getItem('pref_craigslist_active') !== 'false');
    setCraigslistUrl(localStorage.getItem('pref_craigslist_url') || '');
    setFacebookActive(localStorage.getItem('pref_facebook_active') === 'true');
    setFacebookUrl(localStorage.getItem('pref_facebook_url') || '');
    setPropStreamActive(localStorage.getItem('pref_propstream_active') !== 'false');
    setPropStreamUrl(localStorage.getItem('pref_propstream_url') || '');
    setBatchLeadsActive(localStorage.getItem('pref_batchleads_active') === 'true');
    setBatchLeadsUrl(localStorage.getItem('pref_batchleads_url') || '');
    setFsboActive(localStorage.getItem('pref_fsbo_active') === 'true');
    setFsboUrl(localStorage.getItem('pref_fsbo_url') || '');
    setAuctionActive(localStorage.getItem('pref_auction_active') === 'true');
    setAuctionUrl(localStorage.getItem('pref_auction_url') || '');
    setSubjectToActive(localStorage.getItem('pref_subjectto_active') === 'true');
    setSubjectToUrl(localStorage.getItem('pref_subjectto_url') || '');
    setRealtorsActive(localStorage.getItem('pref_realtors_active') === 'true');
    setRealtorsUrl(localStorage.getItem('pref_realtors_url') || '');
    setTitleCompaniesActive(localStorage.getItem('pref_titlecompanies_active') === 'true');
    setTitleCompaniesUrl(localStorage.getItem('pref_titlecompanies_url') || '');
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
    localStorage.setItem('pref_zillow_url', zillowUrl);
    localStorage.setItem('pref_craigslist_active', String(craigslistActive));
    localStorage.setItem('pref_craigslist_url', craigslistUrl);
    localStorage.setItem('pref_facebook_active', String(facebookActive));
    localStorage.setItem('pref_facebook_url', facebookUrl);
    localStorage.setItem('pref_propstream_active', String(propStreamActive));
    localStorage.setItem('pref_propstream_url', propStreamUrl);
    localStorage.setItem('pref_batchleads_active', String(batchLeadsActive));
    localStorage.setItem('pref_batchleads_url', batchLeadsUrl);
    localStorage.setItem('pref_fsbo_active', String(fsboActive));
    localStorage.setItem('pref_fsbo_url', fsboUrl);
    localStorage.setItem('pref_auction_active', String(auctionActive));
    localStorage.setItem('pref_auction_url', auctionUrl);
    localStorage.setItem('pref_subjectto_active', String(subjectToActive));
    localStorage.setItem('pref_subjectto_url', subjectToUrl);
    localStorage.setItem('pref_realtors_active', String(realtorsActive));
    localStorage.setItem('pref_realtors_url', realtorsUrl);
    localStorage.setItem('pref_titlecompanies_active', String(titleCompaniesActive));
    localStorage.setItem('pref_titlecompanies_url', titleCompaniesUrl);
    localStorage.setItem('pref_refresh_interval', refreshInterval);

    localStorage.setItem('pref_ai_mode', aiMode);
    localStorage.setItem('pref_email_alerts', String(enableEmailAlerts));

    localStorage.setItem('profile_name', userName);
    localStorage.setItem('profile_email', userEmail);
    localStorage.setItem('profile_timezone', timeZone);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  async function handleTriggerScrapes() {
    setTriggering(true);
    setTriggerStatus('');
    const feeds: Record<string, string> = {};
    if (zillowActive) feeds['Zillow'] = zillowUrl || 'https://www.zillow.com/homes/for_sale/';
    if (craigslistActive) feeds['Craigslist'] = craigslistUrl || 'https://newyork.craigslist.org/search/apt';
    if (facebookActive) feeds['Facebook'] = facebookUrl || 'https://www.facebook.com/marketplace/nyc/propertyrentals';
    if (propStreamActive) feeds['PropStream'] = propStreamUrl || 'https://www.propstream.com/listings';
    if (batchLeadsActive) feeds['BatchLeads'] = batchLeadsUrl || 'https://www.batchleads.io/properties';
    if (fsboActive) feeds['FSBO'] = fsboUrl || 'https://fsbo.com/listings';
    if (auctionActive) feeds['Auction'] = auctionUrl || 'https://www.auction.com/listings';
    if (subjectToActive) feeds['Subject To'] = subjectToUrl || 'https://subjectto.com/listings';
    if (realtorsActive) feeds['Realtors'] = realtorsUrl || 'https://www.realtor.com/realtor-directory';
    if (titleCompaniesActive) feeds['Title Companies'] = titleCompaniesUrl || 'https://www.yellowpages.com/search?q=title+companies';

    try {
      const response = await fetch(`${API_BASE}/settings/trigger-scrapes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feeds })
      });
      const data = await response.json();
      if (response.ok) {
        setTriggerStatus('✓ ' + (data.message || 'Scrapes successfully triggered!'));
      } else {
        setTriggerStatus('✕ Error: ' + (data.error || 'Failed to trigger scans.'));
      }
    } catch (err: any) {
      setTriggerStatus('✕ Error: ' + (err.message || 'Network error.'));
    } finally {
      setTriggering(false);
    }
  }

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
                  <div className="p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="flex items-center justify-between">
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
                    {zillowActive && (
                      <div className="mt-2 border-t border-black/5 pt-2">
                        <label className="block text-[9px] font-bold text-[#8A8A8A] uppercase">Target Search URL / Location</label>
                        <input
                          type="text"
                          value={zillowUrl}
                          onChange={e => setZillowUrl(e.target.value)}
                          placeholder="e.g., https://www.zillow.com/homes/for_sale/Austin-TX/"
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1A3C34]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="flex items-center justify-between">
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
                    {craigslistActive && (
                      <div className="mt-2 border-t border-black/5 pt-2">
                        <label className="block text-[9px] font-bold text-[#8A8A8A] uppercase">Target Craigslist URL</label>
                        <input
                          type="text"
                          value={craigslistUrl}
                          onChange={e => setCraigslistUrl(e.target.value)}
                          placeholder="e.g., https://austin.craigslist.org/search/hhh"
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1A3C34]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="flex items-center justify-between">
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
                    {facebookActive && (
                      <div className="mt-2 border-t border-black/5 pt-2">
                        <label className="block text-[9px] font-bold text-[#8A8A8A] uppercase">Target Facebook Group / URL</label>
                        <input
                          type="text"
                          value={facebookUrl}
                          onChange={e => setFacebookUrl(e.target.value)}
                          placeholder="e.g., https://www.facebook.com/marketplace/nyc/propertyrentals"
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1A3C34]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="flex items-center justify-between">
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
                    {propStreamActive && (
                      <div className="mt-2 border-t border-black/5 pt-2">
                        <label className="block text-[9px] font-bold text-[#8A8A8A] uppercase">Target PropStream URL</label>
                        <input
                          type="text"
                          value={propStreamUrl}
                          onChange={e => setPropStreamUrl(e.target.value)}
                          placeholder="e.g., https://www.propstream.com/listings"
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1A3C34]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="flex items-center justify-between">
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
                    {batchLeadsActive && (
                      <div className="mt-2 border-t border-black/5 pt-2">
                        <label className="block text-[9px] font-bold text-[#8A8A8A] uppercase">Target BatchLeads URL / Endpoint</label>
                        <input
                          type="text"
                          value={batchLeadsUrl}
                          onChange={e => setBatchLeadsUrl(e.target.value)}
                          placeholder="e.g., https://www.batchleads.io/properties"
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1A3C34]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#1A3C34]">FSBO Feed</p>
                        <p className="text-[10px] text-slate-450">Scan For-Sale-By-Owner listings for direct-seller deals.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={fsboActive}
                        onChange={e => setFsboActive(e.target.checked)}
                        className="h-4 w-4 accent-[#1A3C34] rounded"
                      />
                    </div>
                    {fsboActive && (
                      <div className="mt-2 border-t border-black/5 pt-2">
                        <label className="block text-[9px] font-bold text-[#8A8A8A] uppercase">Target FSBO URL</label>
                        <input
                          type="text"
                          value={fsboUrl}
                          onChange={e => setFsboUrl(e.target.value)}
                          placeholder="e.g., https://fsbo.com/listings"
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1A3C34]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#1A3C34]">Auction Feed</p>
                        <p className="text-[10px] text-slate-450">Scan auction marketplaces for bank-owned and distressed lots.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={auctionActive}
                        onChange={e => setAuctionActive(e.target.checked)}
                        className="h-4 w-4 accent-[#1A3C34] rounded"
                      />
                    </div>
                    {auctionActive && (
                      <div className="mt-2 border-t border-black/5 pt-2">
                        <label className="block text-[9px] font-bold text-[#8A8A8A] uppercase">Target Auction URL</label>
                        <input
                          type="text"
                          value={auctionUrl}
                          onChange={e => setAuctionUrl(e.target.value)}
                          placeholder="e.g., https://www.auction.com/listings"
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1A3C34]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#1A3C34]">Subject-To Feed</p>
                        <p className="text-[10px] text-slate-450">Track subject-to / creative-finance seller leads.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={subjectToActive}
                        onChange={e => setSubjectToActive(e.target.checked)}
                        className="h-4 w-4 accent-[#1A3C34] rounded"
                      />
                    </div>
                    {subjectToActive && (
                      <div className="mt-2 border-t border-black/5 pt-2">
                        <label className="block text-[9px] font-bold text-[#8A8A8A] uppercase">Target Subject-To URL</label>
                        <input
                          type="text"
                          value={subjectToUrl}
                          onChange={e => setSubjectToUrl(e.target.value)}
                          placeholder="e.g., https://subjectto.com/listings"
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1A3C34]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#1A3C34]">Realtors Feed</p>
                        <p className="text-[10px] text-slate-450">Scan and import area realtors to your CRM network.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={realtorsActive}
                        onChange={e => setRealtorsActive(e.target.checked)}
                        className="h-4 w-4 accent-[#1A3C34] rounded"
                      />
                    </div>
                    {realtorsActive && (
                      <div className="mt-2 border-t border-black/5 pt-2">
                        <label className="block text-[9px] font-bold text-[#8A8A8A] uppercase">Target Realtor Directory URL</label>
                        <input
                          type="text"
                          value={realtorsUrl}
                          onChange={e => setRealtorsUrl(e.target.value)}
                          placeholder="e.g., https://www.realtor.com/realtor-directory"
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1A3C34]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-black/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#1A3C34]">Title Companies Feed</p>
                        <p className="text-[10px] text-slate-450">Scan and import local closing agents/title companies.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={titleCompaniesActive}
                        onChange={e => setTitleCompaniesActive(e.target.checked)}
                        className="h-4 w-4 accent-[#1A3C34] rounded"
                      />
                    </div>
                    {titleCompaniesActive && (
                      <div className="mt-2 border-t border-black/5 pt-2">
                        <label className="block text-[9px] font-bold text-[#8A8A8A] uppercase">Target Title Companies Directory</label>
                        <input
                          type="text"
                          value={titleCompaniesUrl}
                          onChange={e => setTitleCompaniesUrl(e.target.value)}
                          placeholder="e.g., https://www.yellowpages.com/search?q=title+companies"
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1A3C34]"
                        />
                      </div>
                    )}
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

                  {/* Manual trigger section */}
                  <div className="border-t border-black/5 pt-4 mt-6">
                    <h4 className="text-xs font-bold text-[#1A3C34] uppercase mb-1">Manual Action</h4>
                    <p className="text-[10px] text-slate-450 mb-3">Staggered background scans run daily, but you can run them immediately in the background here.</p>
                    <button
                      type="button"
                      disabled={triggering}
                      onClick={handleTriggerScrapes}
                      className="w-full py-3 px-4 rounded-2xl bg-[#F5A623] text-[#1A3C34] text-xs font-bold shadow hover:brightness-95 transition disabled:opacity-60"
                    >
                      {triggering ? 'Triggering Scans...' : '⚡ Run Active Scrapes Now'}
                    </button>
                    {triggerStatus && (
                      <p className={`mt-2 text-xs font-semibold ${triggerStatus.startsWith('✕') ? 'text-red-650' : 'text-emerald-650'}`}>
                        {triggerStatus}
                      </p>
                    )}
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
