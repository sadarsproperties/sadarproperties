import { useState, useEffect } from 'react';
import { BUYER_TYPES, PROPERTY_TYPES, type Buyer, type PropertyType } from '../types';

interface BuyerDrawerProps {
  buyer: Buyer;
  onClose: () => void;
  onUpdate: (buyer: Buyer) => void;
}

const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none';

export function BuyerDrawer({ buyer, onClose, onUpdate }: BuyerDrawerProps) {
  // Contact details
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [buyerType, setBuyerType] = useState<Buyer['buyerType']>('Cash Buyer');

  // Property databases & comps
  const [zillowUrl, setZillowUrl] = useState('');
  const [redfinUrl, setRedfinUrl] = useState('');
  const [realtorUrl, setRealtorUrl] = useState('');
  const [propstreamUrl, setPropstreamUrl] = useState('');
  const [batchleadsUrl, setBatchleadsUrl] = useState('');

  // Buy box
  const [preferredStates, setPreferredStates] = useState('');
  const [preferredCities, setPreferredCities] = useState('');
  const [desiredPropertyTypes, setDesiredPropertyTypes] = useState<PropertyType[]>([]);
  const [maxBudget, setMaxBudget] = useState('');

  // Multifamily & budget ranges
  const [minUnits, setMinUnits] = useState('');
  const [maxUnits, setMaxUnits] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [investmentStrategy, setInvestmentStrategy] = useState('');

  // Relationship notes & activity
  const [notes, setNotes] = useState('');
  const [lastContact, setLastContact] = useState('');
  const [dealsClosed, setDealsClosed] = useState('');

  // Populate state when buyer changes
  useEffect(() => {
    setFullName(buyer.fullName || '');
    setCompanyName(buyer.companyName || '');
    setPhone(buyer.phone || '');
    setEmail(buyer.email || '');
    setWebsite(buyer.website || '');
    setBuyerType(buyer.buyerType || 'Cash Buyer');

    setZillowUrl(buyer.zillowUrl || '');
    setRedfinUrl(buyer.redfinUrl || '');
    setRealtorUrl(buyer.realtorUrl || '');
    setPropstreamUrl(buyer.propstreamUrl || '');
    setBatchleadsUrl(buyer.batchleadsUrl || '');

    setPreferredStates((buyer.buyBox?.preferredStates || []).join(', '));
    setPreferredCities((buyer.buyBox?.preferredCities || []).join(', '));
    setDesiredPropertyTypes(buyer.buyBox?.desiredPropertyTypes || []);
    setMaxBudget(buyer.buyBox?.maxBudget != null ? buyer.buyBox.maxBudget.toString() : '');

    setMinUnits(buyer.minUnits != null ? buyer.minUnits.toString() : '');
    setMaxUnits(buyer.maxUnits != null ? buyer.maxUnits.toString() : '');
    setBudgetMin(buyer.budgetMin != null ? buyer.budgetMin.toString() : '');
    setBudgetMax(buyer.budgetMax != null ? buyer.budgetMax.toString() : '');
    setInvestmentStrategy(buyer.investmentStrategy || '');

    setNotes(buyer.notes || '');
    setLastContact(buyer.lastContact || '');
    setDealsClosed(buyer.dealsClosed != null ? buyer.dealsClosed.toString() : '0');
  }, [buyer]);

  const handleSave = () => {
    const updatedBuyer: Buyer = {
      ...buyer,
      fullName,
      companyName,
      phone,
      email,
      website,
      buyerType,
      zillowUrl,
      redfinUrl,
      realtorUrl,
      propstreamUrl,
      batchleadsUrl,
      buyBox: {
        preferredStates: preferredStates ? preferredStates.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : [],
        preferredCities: preferredCities ? preferredCities.split(',').map((c) => c.trim()).filter(Boolean) : [],
        desiredPropertyTypes,
        maxBudget: maxBudget ? parseFloat(maxBudget) || null : null,
      },
      minUnits: minUnits ? parseInt(minUnits, 10) || null : null,
      maxUnits: maxUnits ? parseInt(maxUnits, 10) || null : null,
      budgetMin: budgetMin ? parseFloat(budgetMin) || null : null,
      budgetMax: budgetMax ? parseFloat(budgetMax) || null : null,
      investmentStrategy,
      notes,
      lastContact: lastContact || null,
      dealsClosed: dealsClosed ? parseInt(dealsClosed, 10) || 0 : 0,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedBuyer);
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
            <p className="text-xs uppercase tracking-wide text-amber-500 font-bold">Buyer Profile Lead</p>
            <h2 className="text-xl font-extrabold text-slate-100">{fullName || 'New Buyer'}</h2>
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
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} />
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
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Website</label>
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className={fieldClass} placeholder="e.g. www.acmeholding.com" />
              </div>
            </div>
          </div>

          {/* Section 2: Property Databases & Comps URLs */}
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

          {/* Section 3: Buy Box Criteria */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 border-b border-slate-800 pb-1">Buy Box Criteria</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Buyer Type</label>
                <select
                  value={buyerType}
                  onChange={(e) => setBuyerType(e.target.value as Buyer['buyerType'])}
                  className={fieldClass}
                >
                  {BUYER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Max Budget ($)</label>
                <input type="number" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Preferred States (comma-separated)</label>
                <input type="text" value={preferredStates} onChange={(e) => setPreferredStates(e.target.value)} className={fieldClass} placeholder="e.g. MO, IL, TX" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Preferred Cities (comma-separated)</label>
                <input type="text" value={preferredCities} onChange={(e) => setPreferredCities(e.target.value)} className={fieldClass} placeholder="e.g. St. Louis, Kansas City" />
              </div>
              
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Min Budget ($)</label>
                  <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Max Budget Range ($)</label>
                  <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Min Units (for Multifamily)</label>
                  <input type="number" value={minUnits} onChange={(e) => setMinUnits(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Max Units (for Multifamily)</label>
                  <input type="number" value={maxUnits} onChange={(e) => setMaxUnits(e.target.value)} className={fieldClass} />
                </div>
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
            </div>
          </div>

          {/* Section 4: Relationship Notes & Outreach */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 border-b border-slate-800 pb-1">Outreach & Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Last Contact Date</label>
                <input type="date" value={lastContact} onChange={(e) => setLastContact(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Deals Closed Together</label>
                <input type="number" value={dealsClosed} onChange={(e) => setDealsClosed(e.target.value)} className={fieldClass} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Relationship Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${fieldClass} h-24 resize-none`}
                  placeholder="Enter custom relationship details, notes on past conversations, or key buyer preferences..."
                />
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
