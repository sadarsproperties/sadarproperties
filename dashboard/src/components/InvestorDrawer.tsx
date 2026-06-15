import { useState, useEffect } from 'react';
import { PROPERTY_TYPES, type Investor, type PropertyType } from '../types';

interface InvestorDrawerProps {
  investor: Investor;
  onClose: () => void;
  onUpdate: (investor: Investor) => void;
}

const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none';

export function InvestorDrawer({ investor, onClose, onUpdate }: InvestorDrawerProps) {
  // Contact details
  const [investorName, setInvestorName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Source & extraction
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [aiExtracted, setAiExtracted] = useState(false);

  // Social & platforms
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [biggerPocketsUrl, setBiggerPocketsUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [connectedInvestorsUrl, setConnectedInvestorsUrl] = useState('');
  const [loopnetUrl, setLoopnetUrl] = useState('');
  const [crexiUrl, setCrexiUrl] = useState('');

  // Property databases & comps
  const [zillowUrl, setZillowUrl] = useState('');
  const [redfinUrl, setRedfinUrl] = useState('');
  const [realtorUrl, setRealtorUrl] = useState('');
  const [propstreamUrl, setPropstreamUrl] = useState('');
  const [batchleadsUrl, setBatchleadsUrl] = useState('');

  // Buy box criteria
  const [buyBoxRaw, setBuyBoxRaw] = useState('');
  const [preferredStates, setPreferredStates] = useState('');
  const [preferredCities, setPreferredCities] = useState('');
  const [desiredPropertyTypes, setDesiredPropertyTypes] = useState<PropertyType[]>([]);
  const [maxBudget, setMaxBudget] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [unitRangeMin, setUnitRangeMin] = useState('');
  const [unitRangeMax, setUnitRangeMax] = useState('');
  const [investmentStrategy, setInvestmentStrategy] = useState('');

  // Populate state when investor changes
  useEffect(() => {
    setInvestorName(investor.investorName || '');
    setCompanyName(investor.companyName || '');
    setPhone(investor.phone || '');
    setEmail(investor.email || '');

    setSourcePlatform(investor.sourcePlatform || 'Manual');
    setAiExtracted(!!investor.aiExtracted);

    setLinkedInUrl(investor.linkedInUrl || '');
    setBiggerPocketsUrl(investor.biggerPocketsUrl || '');
    setFacebookUrl(investor.facebookUrl || '');
    setTwitterUrl(investor.twitterUrl || '');
    setInstagramUrl(investor.instagramUrl || '');
    setConnectedInvestorsUrl(investor.connectedInvestorsUrl || '');
    setLoopnetUrl(investor.loopnetUrl || '');
    setCrexiUrl(investor.crexiUrl || '');

    setZillowUrl(investor.zillowUrl || '');
    setRedfinUrl(investor.redfinUrl || '');
    setRealtorUrl(investor.realtorUrl || '');
    setPropstreamUrl(investor.propstreamUrl || '');
    setBatchleadsUrl(investor.batchleadsUrl || '');

    setBuyBoxRaw(investor.buyBoxRaw || '');
    setPreferredStates((investor.buyBox?.preferredStates || []).join(', '));
    setPreferredCities((investor.buyBox?.preferredCities || []).join(', '));
    setDesiredPropertyTypes(investor.buyBox?.desiredPropertyTypes || []);
    setMaxBudget(investor.buyBox?.maxBudget != null ? investor.buyBox.maxBudget.toString() : '');
    setBudgetMin(investor.budgetMin != null ? investor.budgetMin.toString() : '');
    setBudgetMax(investor.budgetMax != null ? investor.budgetMax.toString() : '');
    setUnitRangeMin(investor.unitRangeMin != null ? investor.unitRangeMin.toString() : '');
    setUnitRangeMax(investor.unitRangeMax != null ? investor.unitRangeMax.toString() : '');
    setInvestmentStrategy(investor.investmentStrategy || '');
  }, [investor]);

  const handleSave = () => {
    const updatedInvestor: Investor = {
      ...investor,
      investorName,
      companyName,
      phone,
      email,
      sourcePlatform,
      aiExtracted,
      linkedInUrl,
      biggerPocketsUrl,
      facebookUrl,
      twitterUrl,
      instagramUrl,
      connectedInvestorsUrl,
      loopnetUrl,
      crexiUrl,
      zillowUrl,
      redfinUrl,
      realtorUrl,
      propstreamUrl,
      batchleadsUrl,
      buyBoxRaw,
      unitRangeMin: unitRangeMin ? parseInt(unitRangeMin, 10) || null : null,
      unitRangeMax: unitRangeMax ? parseInt(unitRangeMax, 10) || null : null,
      budgetMin: budgetMin ? parseFloat(budgetMin) || null : null,
      budgetMax: budgetMax ? parseFloat(budgetMax) || null : null,
      investmentStrategy,
      buyBox: {
        preferredStates: preferredStates ? preferredStates.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : [],
        preferredCities: preferredCities ? preferredCities.split(',').map((c) => c.trim()).filter(Boolean) : [],
        desiredPropertyTypes,
        maxBudget: maxBudget ? parseFloat(maxBudget) || null : null,
      },
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedInvestor);
    onClose();
  };

  const togglePropertyType = (type: PropertyType) => {
    if (desiredPropertyTypes.includes(type)) {
      setDesiredPropertyTypes(desiredPropertyTypes.filter((t) => t !== type));
    } else {
      setDesiredPropertyTypes([...desiredPropertyTypes, type]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-sky-400 font-bold">Investor Profile Lead</p>
            <h2 className="text-xl font-extrabold text-slate-100">{investorName || 'New Investor'}</h2>
            {companyName && <p className="text-sm text-slate-400">{companyName}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-900 hover:text-slate-100"
          >
            Close
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300">
          {/* Section 1: Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 border-b border-slate-800 pb-1">Contact Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input type="text" value={investorName} onChange={(e) => setInvestorName(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Company Name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
              </div>
            </div>
          </div>

          {/* Section 2: Discovery & Lead Source Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-1">Discovery Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Source Platform</label>
                <select
                  value={sourcePlatform}
                  onChange={(e) => setSourcePlatform(e.target.value)}
                  className={fieldClass}
                >
                  <option value="Manual">Manual</option>
                  <option value="BiggerPockets">BiggerPockets</option>
                  <option value="Connected Investors">Connected Investors</option>
                  <option value="Facebook Investor Groups">Facebook Investor Groups</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Investor Websites">Investor Websites</option>
                  <option value="LoopNet">LoopNet</option>
                  <option value="Crexi">Crexi</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="aiExtracted"
                  checked={aiExtracted}
                  onChange={(e) => setAiExtracted(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                />
                <label htmlFor="aiExtracted" className="text-xs font-semibold text-slate-400 cursor-pointer">
                  AI Extracted Lead
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Social Media & Forum Platforms */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#10B981] border-b border-slate-800 pb-1">Social Profiles & Forums</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">LinkedIn Profile URL</label>
                <input type="text" value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} className={fieldClass} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">BiggerPockets Profile URL</label>
                <input type="text" value={biggerPocketsUrl} onChange={(e) => setBiggerPocketsUrl(e.target.value)} className={fieldClass} placeholder="https://biggerpockets.com/users/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Connected Investors URL</label>
                <input type="text" value={connectedInvestorsUrl} onChange={(e) => setConnectedInvestorsUrl(e.target.value)} className={fieldClass} placeholder="https://connectedinvestors.com/member/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Facebook Profile/Group URL</label>
                <input type="text" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} className={fieldClass} placeholder="https://facebook.com/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">LoopNet Profile URL</label>
                <input type="text" value={loopnetUrl} onChange={(e) => setLoopnetUrl(e.target.value)} className={fieldClass} placeholder="https://loopnet.com/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Crexi Profile URL</label>
                <input type="text" value={crexiUrl} onChange={(e) => setCrexiUrl(e.target.value)} className={fieldClass} placeholder="https://crexi.com/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Twitter / X URL</label>
                <input type="text" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} className={fieldClass} placeholder="https://x.com/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Instagram URL</label>
                <input type="text" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} className={fieldClass} placeholder="https://instagram.com/..." />
              </div>
            </div>
          </div>

          {/* Section 4: Property Databases & Comps URLs */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-1">Property Databases & Comps</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Zillow Profile/List Link</label>
                <input type="text" value={zillowUrl} onChange={(e) => setZillowUrl(e.target.value)} className={fieldClass} placeholder="https://www.zillow.com/profile/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Redfin Profile/List Link</label>
                <input type="text" value={redfinUrl} onChange={(e) => setRedfinUrl(e.target.value)} className={fieldClass} placeholder="https://www.redfin.com/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Realtor.com Link</label>
                <input type="text" value={realtorUrl} onChange={(e) => setRealtorUrl(e.target.value)} className={fieldClass} placeholder="https://www.realtor.com/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">PropStream Link/Search URL</label>
                <input type="text" value={propstreamUrl} onChange={(e) => setPropstreamUrl(e.target.value)} className={fieldClass} placeholder="PropStream link..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">BatchLeads Link/Search URL</label>
                <input type="text" value={batchleadsUrl} onChange={(e) => setBatchleadsUrl(e.target.value)} className={fieldClass} placeholder="BatchLeads link..." />
              </div>
            </div>
          </div>

          {/* Section 5: Buy Box Criteria */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 border-b border-slate-800 pb-1">Buy Box Criteria</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Raw Buy Box Text</label>
                <textarea
                  value={buyBoxRaw}
                  onChange={(e) => setBuyBoxRaw(e.target.value)}
                  className={`${fieldClass} h-24 resize-none`}
                  placeholder="Paste raw email, text or social media buy box description..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Min Budget ($)</label>
                <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Max Budget ($)</label>
                <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className={fieldClass} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Preferred States (comma-separated)</label>
                <input type="text" value={preferredStates} onChange={(e) => setPreferredStates(e.target.value)} className={fieldClass} placeholder="e.g. MO, IL, TX" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Preferred Cities (comma-separated)</label>
                <input type="text" value={preferredCities} onChange={(e) => setPreferredCities(e.target.value)} className={fieldClass} placeholder="e.g. St. Louis, Chicago" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Min Units (Multifamily)</label>
                <input type="number" value={unitRangeMin} onChange={(e) => setUnitRangeMin(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Max Units (Multifamily)</label>
                <input type="number" value={unitRangeMax} onChange={(e) => setUnitRangeMax(e.target.value)} className={fieldClass} />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Investment Strategy</label>
                <input
                  type="text"
                  value={investmentStrategy}
                  onChange={(e) => setInvestmentStrategy(e.target.value)}
                  className={fieldClass}
                  placeholder="e.g. Fix & Flip, Buy & Hold, BRRRR"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Preferred Property Types</label>
                <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-800 rounded-lg p-3 bg-slate-950">
                  {PROPERTY_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={desiredPropertyTypes.includes(type)}
                        onChange={() => togglePropertyType(type)}
                        className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 bg-slate-950 p-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-900 hover:text-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-2xl bg-amber-500 px-6 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400 transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
