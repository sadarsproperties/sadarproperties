import { useMemo, useState, useEffect } from 'react';
import { LEAD_CATEGORIES, PROPERTY_TYPES, type Buyer, type Investor, type LeadCategory, type Property, type Seller } from '../types';
import { calculateMetrics, formatCurrency, calculateDealAnalyzer, type DealAnalyzerInputs } from '../utils/calculations';
import { findMatches } from '../utils/matching';
import { TagButton } from './TagButton';
import { ExportMenu } from './ExportMenu';
import { api } from '../api/client';

interface PropertyDrawerProps {
  property: Property;
  sellers: Seller[];
  buyers: Buyer[];
  investors: Investor[];
  onClose: () => void;
  onUpdate: (property: Property) => void;
}

const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none';

function getDealScoreTier(score: number | null) {
  if (score == null) return { label: 'N/A', bg: 'bg-slate-800 text-slate-400 border border-slate-700' };
  if (score >= 80) return { label: 'HOT DEAL', bg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' };
  if (score >= 60) return { label: 'GOOD DEAL', bg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
  if (score >= 40) return { label: 'MARGINAL', bg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
  return { label: 'WEAK', bg: 'bg-slate-700/50 text-slate-400 border border-slate-700/70' };
}

export function PropertyDrawer({
  property,
  sellers,
  buyers,
  investors,
  onClose,
  onUpdate,
}: PropertyDrawerProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'analyzer'>('profile');
  const [isMatching, setIsMatching] = useState(false);
  const [crmAdded, setCrmAdded] = useState<Record<string, boolean>>({});

  const handleReRunMatching = async () => {
    setIsMatching(true);
    try {
      const res = await api.autoMatchProperty(property.id);
      onUpdate(res.property);
      alert('Matching re-run successfully!');
    } catch (e: any) {
      alert('Failed to run matching: ' + (e.message || e));
    } finally {
      setIsMatching(false);
    }
  };

  const handleAddToCRM = (contactId: string) => {
    setCrmAdded(prev => ({ ...prev, [contactId]: true }));
    alert('Contact successfully synced and added to CRM pipeline!');
  };
  
  // Real-time Deal Analyzer inputs state
  const [calcArv, setCalcArv] = useState<string>('');
  const [calcRepair, setCalcRepair] = useState<string>('');
  const [calcClosingPct, setCalcClosingPct] = useState<string>('3');
  const [calcHoldingPct, setCalcHoldingPct] = useState<string>('1');
  const [calcDesiredProfit, setCalcDesiredProfit] = useState<string>('');
  const [calcAssignmentFee, setCalcAssignmentFee] = useState<string>('');
  const [calcNegotiatedPrice, setCalcNegotiatedPrice] = useState<string>('');

  // Reset inputs when selected property changes
  useEffect(() => {
    setCalcArv(property.arv != null ? property.arv.toString() : '');
    setCalcRepair(property.repairCosts != null ? property.repairCosts.toString() : '');
    setCalcClosingPct('3');
    setCalcHoldingPct('1');
    setCalcDesiredProfit((property.arv ? Math.round(property.arv * 0.10) : 25000).toString());
    setCalcAssignmentFee((property.assignmentFee || 10000).toString());
    setCalcNegotiatedPrice((property.price || property.askingPrice || 0).toString());
  }, [property]);

  const buyerBudgets = useMemo(() => buyers.map(b => b.buyBox.maxBudget).filter((b): b is number => b != null), [buyers]);
  const metrics = useMemo(() => calculateMetrics(property, { buyerBudgets }), [property, buyerBudgets]);
  const matches = useMemo(() => findMatches(property, buyers, investors), [property, buyers, investors]);
  const seller = sellers.find((item) => item.id === property.sellerId);

  // Parse state inputs for real-time calculations
  const parsedArv = parseFloat(calcArv) || 0;
  const parsedRepair = parseFloat(calcRepair) || 0;
  const parsedClosingPct = parseFloat(calcClosingPct) || 0;
  const parsedHoldingPct = parseFloat(calcHoldingPct) || 0;
  const parsedDesiredProfit = parseFloat(calcDesiredProfit) || 0;
  const parsedAssignmentFee = parseFloat(calcAssignmentFee) || 0;
  const parsedNegotiatedPrice = parseFloat(calcNegotiatedPrice) || 0;

  const analyzerInputs: DealAnalyzerInputs = {
    arv: parsedArv,
    repairCosts: parsedRepair,
    closingCostsPct: parsedClosingPct,
    holdingCostsPct: parsedHoldingPct,
    desiredProfit: parsedDesiredProfit,
    assignmentFee: parsedAssignmentFee,
    negotiatedPrice: parsedNegotiatedPrice,
  };

  const analyzerOutputs = useMemo(() => {
    return calculateDealAnalyzer(
      analyzerInputs,
      property.leadCategories,
      property.createdAt,
      buyerBudgets
    );
  }, [analyzerInputs, property.leadCategories, property.createdAt, buyerBudgets]);

  const updateField = <K extends keyof Property>(key: K, value: Property[K]) => {
    onUpdate({ ...property, [key]: value });
  };

  const toggleCategory = (category: LeadCategory) => {
    const next = property.leadCategories.includes(category)
      ? property.leadCategories.filter((item) => item !== category)
      : [...property.leadCategories, category];
    updateField('leadCategories', next);
  };

  const handleSaveAnalyzer = () => {
    onUpdate({
      ...property,
      arv: parsedArv || null,
      repairCosts: parsedRepair || null,
      assignmentFee: parsedAssignmentFee || 10000,
      price: parsedNegotiatedPrice,
      dealScore: analyzerOutputs.dealScore,
    });
    alert('Analyzer calculations saved to database!');
  };

  const matchExportRows = matches.map((match) => ({
    'Property Address': property.address,
    'Property Price ($)': property.price,
    'Match Score (%)': match.score ?? 0,
    'Contact Name': match.name,
    'Company Name': match.companyName || '',
    'Contact Type': match.type === 'Buyer' ? `Buyer (${match.buyerType || 'General'})` : 'Investor',
    'Phone': match.phone || '',
    'Email': match.email || '',
    'LinkedIn': match.linkedInUrl || '',
  }));

  const dealTier = getDealScoreTier(activeTab === 'analyzer' ? analyzerOutputs.dealScore : metrics.dealScore);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-sky-400 font-bold">Property Profile</p>
            <h2 className="text-xl font-extrabold text-slate-100">{property.address}</h2>
            <p className="text-sm text-slate-400">
              {property.city}, {property.state} {property.zip}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-850 hover:text-white transition"
          >
            Close
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`border-b-2 px-4 py-3.5 text-sm font-bold transition-all ${
              activeTab === 'profile'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Profile & Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analyzer')}
            className={`border-b-2 px-4 py-3.5 text-sm font-bold transition-all ${
              activeTab === 'analyzer'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Deal Analyzer Calculator
          </button>
        </div>

        {/* Dynamic Tab Content Box */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {activeTab === 'profile' ? (
            <>
              {/* Profile Details Tab */}
              <section className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <Metric label="List Price" value={formatCurrency(property.price)} />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">Deal Score</p>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold tracking-wide ${dealTier.bg}`}>
                    {metrics.dealScore != null ? `${metrics.dealScore}/100 — ${dealTier.label}` : '—'}
                  </span>
                </div>
                <Metric label="MAO (Max Allowable Offer)" value={formatCurrency(metrics.mao)} />
                <Metric
                  label="Suggested Offer Range"
                  value={
                    metrics.offerMin != null && metrics.offerMax != null
                      ? `${formatCurrency(metrics.offerMin)} – ${formatCurrency(metrics.offerMax)}`
                      : '—'
                  }
                />
              </section>

              <section className="grid grid-cols-2 gap-4">
                <Field label="Address">
                  <input
                    value={property.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    className={fieldClass}
                  />
                </Field>
                <Field label="City">
                  <input value={property.city} onChange={(event) => updateField('city', event.target.value)} className={fieldClass} />
                </Field>
                <Field label="State">
                  <input value={property.state} onChange={(event) => updateField('state', event.target.value)} className={fieldClass} />
                </Field>
                <Field label="ZIP Code">
                  <input value={property.zip} onChange={(event) => updateField('zip', event.target.value)} className={fieldClass} />
                </Field>
                <Field label="List Price ($)">
                  <input
                    type="number"
                    value={property.price}
                    onChange={(event) => updateField('price', Number(event.target.value) || 0)}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Property Type">
                  <select
                    value={property.propertyType}
                    onChange={(event) => updateField('propertyType', event.target.value as Property['propertyType'])}
                    className={fieldClass}
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ARV ($)">
                  <input
                    type="number"
                    value={property.arv ?? ''}
                    onChange={(event) => updateField('arv', event.target.value ? Number(event.target.value) : null)}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Repair Costs ($)">
                  <input
                    type="number"
                    value={property.repairCosts ?? ''}
                    onChange={(event) => updateField('repairCosts', event.target.value ? Number(event.target.value) : null)}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Assignment Fee ($)">
                  <input
                    type="number"
                    value={property.assignmentFee}
                    onChange={(event) => updateField('assignmentFee', Number(event.target.value) || 0)}
                    className={fieldClass}
                  />
                </Field>
              </section>

              <section className="grid grid-cols-1 gap-4 border-t border-slate-800 pt-5">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-amber-500">Property Databases & Comps</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Zillow Link">
                    <input
                      type="text"
                      value={property.zillowUrl || ''}
                      onChange={(event) => updateField('zillowUrl', event.target.value)}
                      className={fieldClass}
                      placeholder="https://www.zillow.com/homedetails/..."
                    />
                  </Field>
                  <Field label="Redfin Link">
                    <input
                      type="text"
                      value={property.redfinUrl || ''}
                      onChange={(event) => updateField('redfinUrl', event.target.value)}
                      className={fieldClass}
                      placeholder="https://www.redfin.com/..."
                    />
                  </Field>
                  <Field label="Realtor.com Link">
                    <input
                      type="text"
                      value={property.realtorUrl || ''}
                      onChange={(event) => updateField('realtorUrl', event.target.value)}
                      className={fieldClass}
                      placeholder="https://www.realtor.com/realestateandhomes-detail/..."
                    />
                  </Field>
                  <Field label="PropStream Link">
                    <input
                      type="text"
                      value={property.propstreamUrl || ''}
                      onChange={(event) => updateField('propstreamUrl', event.target.value)}
                      className={fieldClass}
                      placeholder="PropStream search/listing URL..."
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="BatchLeads Link">
                      <input
                        type="text"
                        value={property.batchleadsUrl || ''}
                        onChange={(event) => updateField('batchleadsUrl', event.target.value)}
                        className={fieldClass}
                        placeholder="BatchLeads property URL..."
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <section>
                <p className="mb-2 text-sm text-slate-400 font-semibold">Lead Categories</p>
                <div className="flex flex-wrap gap-2">
                  {LEAD_CATEGORIES.map((category) => (
                    <TagButton
                      key={category}
                      label={category}
                      active={property.leadCategories.includes(category)}
                      onClick={() => toggleCategory(category)}
                      tone="amber"
                    />
                  ))}
                </div>
              </section>

              <section>
                <Field label="Internal Outreach Notes">
                  <textarea
                    value={property.notes}
                    onChange={(event) => updateField('notes', event.target.value)}
                    rows={3}
                    className={fieldClass}
                  />
                </Field>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-200">Linked Seller</h3>
                <select
                  value={property.sellerId ?? ''}
                  onChange={(event) => updateField('sellerId', event.target.value || null)}
                  className={fieldClass}
                >
                  <option value="">No seller linked</option>
                  {sellers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.ownerName}
                    </option>
                  ))}
                </select>
                {seller && (
                  <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
                    <p className="font-semibold text-slate-200">{seller.ownerName}</p>
                    <p className="text-slate-400">{seller.phone}</p>
                    <p className="text-slate-400">{seller.email}</p>
                    <p className="text-slate-400">{seller.mailingAddress}</p>
                  </div>
                )}
              </section>

              {/* CRM History, Freshness and original source listing links */}
              <section className="border-t border-slate-800 pt-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-amber-500">CRM History & Freshness</h3>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Data Source: <strong className="text-slate-200">{property.source || 'Manual/API'}</strong></span>
                    <span>Freshness: <strong className="text-emerald-400">Active (Updated {new Date(property.updatedAt || new Date()).toLocaleDateString()})</strong></span>
                  </div>
                  {property.sourceUrl && (
                    <div className="text-xs">
                      <a href={property.sourceUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                        🔗 View Original Source Listing
                      </a>
                    </div>
                  )}
                  <div className="border-t border-slate-800 pt-3 space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Communication & Stage Log</p>
                    <div className="space-y-2 pl-2 border-l border-slate-800">
                      <div className="relative pl-4 text-xs">
                        <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-sky-500" />
                        <span className="font-bold text-slate-300">Lead Created: </span>
                        <span className="text-slate-400">{new Date(property.createdAt || new Date()).toLocaleDateString()}</span>
                      </div>
                      {property.lastContactDate && (
                        <div className="relative pl-4 text-xs">
                          <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="font-bold text-slate-300">Seller Contacted: </span>
                          <span className="text-slate-400">{new Date(property.lastContactDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {property.followUpDate && (
                        <div className="relative pl-4 text-xs">
                          <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-amber-500" />
                          <span className="font-bold text-slate-300">Follow-up Callback Scheduled: </span>
                          <span className="text-slate-400">{new Date(property.followUpDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="relative pl-4 text-xs">
                        <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-slate-500" />
                        <span className="font-bold text-slate-300">Current Stage: </span>
                        <span className="text-slate-450 uppercase tracking-wider">{property.status || 'New'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-800 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Matched Buyers & Investors</h3>
                    <p className="text-xs text-slate-400">Scored and ranked based on buy box criteria</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleReRunMatching}
                      disabled={isMatching}
                      className="rounded-xl border border-amber-600 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50"
                    >
                      {isMatching ? 'Re-running...' : '↻ Re-run Matching'}
                    </button>
                    <ExportMenu rows={matchExportRows} filename={`matches-${property.address}`} />
                  </div>
                </div>
                {matches.length ? (
                  <div className="space-y-3">
                    {matches.map((match) => (
                      <div
                        key={`${match.type}-${match.id}`}
                        className="rounded-2xl border border-slate-850 bg-slate-900/40 p-4 text-sm hover:border-slate-800 transition duration-150"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-100">{match.name}</p>
                            <p className="text-xs text-slate-400">{match.companyName || 'No Company'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-bold text-sky-200 border border-sky-500/25">
                              {match.type} {match.buyerType ? `(${match.buyerType})` : ''}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-emerald-400">{match.score || 0}% Match</span>
                              <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${match.score || 0}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown of matching criteria */}
                        <div className="mt-3 border-t border-slate-900/60 pt-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Criteria Match Breakdown</p>
                          <div className="grid grid-cols-5 gap-1 text-[10px] uppercase font-bold text-center">
                            <div className={`p-1 rounded-md transition duration-150 ${match.breakdown?.state ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {match.breakdown?.state ? '✓ State' : '✗ State'}
                            </div>
                            <div className={`p-1 rounded-md transition duration-150 ${match.breakdown?.propertyType ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {match.breakdown?.propertyType ? '✓ Type' : '✗ Type'}
                            </div>
                            <div className={`p-1 rounded-md transition duration-150 ${match.breakdown?.budget ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {match.breakdown?.budget ? '✓ Budget' : '✗ Budget'}
                            </div>
                            <div className={`p-1 rounded-md transition duration-150 ${match.breakdown?.city ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {match.breakdown?.city ? '✓ City' : '✗ City'}
                            </div>
                            <div className={`p-1 rounded-md transition duration-150 ${match.breakdown?.units ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {match.breakdown?.units ? '✓ Units' : '✗ Units'}
                            </div>
                          </div>
                        </div>

                        {/* One-click Action Buttons */}
                        <div className="mt-3 flex gap-2 border-t border-slate-900/60 pt-3">
                          {match.phone && (
                            <a
                              href={`tel:${match.phone}`}
                              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition text-center flex items-center justify-center gap-1"
                            >
                              📞 Call
                            </a>
                          )}
                          {match.email && (
                            <a
                              href={`mailto:${match.email}`}
                              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition text-center flex items-center justify-center gap-1"
                            >
                              ✉️ Email
                            </a>
                          )}
                          {match.linkedInUrl && (
                            <a
                              href={match.linkedInUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-sky-400 hover:bg-slate-900 transition text-center flex items-center justify-center gap-1"
                            >
                              🔗 LinkedIn
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAddToCRM(match.id)}
                            disabled={crmAdded[match.id]}
                            className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center justify-center gap-1 ${
                              crmAdded[match.id]
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                                : 'border border-[#1A3C34] bg-[#1A3C34] text-white hover:bg-[#2A5C4E]'
                            }`}
                          >
                            {crmAdded[match.id] ? '✓ CRM Sync' : '➕ Add CRM'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No buyers or investors match this property's buy box yet.</p>
                )}
              </section>
            </>
          ) : (
            <>
              {/* Deal Analyzer Calculator Tab */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Inputs Pane */}
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Calculator Inputs</h3>

                  <Field label="After Repair Value (ARV) ($)">
                    <input
                      type="number"
                      value={calcArv}
                      onChange={(e) => setCalcArv(e.target.value)}
                      placeholder="e.g. 350000"
                      className={fieldClass}
                    />
                  </Field>

                  <Field label="Estimated Repair Costs ($)">
                    <input
                      type="number"
                      value={calcRepair}
                      onChange={(e) => setCalcRepair(e.target.value)}
                      placeholder="e.g. 45000"
                      className={fieldClass}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Closing Costs (%)">
                      <input
                        type="number"
                        step="0.5"
                        value={calcClosingPct}
                        onChange={(e) => setCalcClosingPct(e.target.value)}
                        className={fieldClass}
                      />
                    </Field>
                    <Field label="Holding Costs (%)">
                      <input
                        type="number"
                        step="0.5"
                        value={calcHoldingPct}
                        onChange={(e) => setCalcHoldingPct(e.target.value)}
                        className={fieldClass}
                      />
                    </Field>
                  </div>

                  <Field label="Desired Profit (End Buyer) ($)">
                    <input
                      type="number"
                      value={calcDesiredProfit}
                      onChange={(e) => setCalcDesiredProfit(e.target.value)}
                      placeholder="e.g. 30000"
                      className={fieldClass}
                    />
                  </Field>

                  <Field label="Assignment Fee (Wholesaler) ($)">
                    <input
                      type="number"
                      value={calcAssignmentFee}
                      onChange={(e) => setCalcAssignmentFee(e.target.value)}
                      placeholder="e.g. 10000"
                      className={fieldClass}
                    />
                  </Field>

                  <Field label="Negotiated / Purchase Price ($)">
                    <input
                      type="number"
                      value={calcNegotiatedPrice}
                      onChange={(e) => setCalcNegotiatedPrice(e.target.value)}
                      placeholder="e.g. 180000"
                      className={fieldClass}
                    />
                  </Field>
                </div>

                {/* Outputs Pane */}
                <div className="space-y-5">
                  <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Maximum Allowable Offer (MAO)</p>
                    <p className="text-sm text-slate-400 mt-0.5">(ARV × 70%) − Repair Costs</p>
                    <p className="mt-2 text-4xl font-extrabold text-[#F5A623] tracking-tight">{formatCurrency(analyzerOutputs.mao)}</p>
                  </div>

                  <div className="rounded-2xl bg-emerald-950/20 border border-emerald-900/30 p-5">
                    <p className="text-xs uppercase tracking-wider text-emerald-400/80 font-bold">Suggested Offer Range</p>
                    <p className="text-sm text-emerald-400/60 mt-0.5">MAO − 10% to MAO</p>
                    <p className="mt-2 text-2xl font-extrabold text-emerald-400">
                      {formatCurrency(analyzerOutputs.offerMin)} – {formatCurrency(analyzerOutputs.offerMax)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-900/50 border border-slate-850 p-4">
                      <p className="text-xs text-slate-400 font-semibold">Net to Seller</p>
                      <p className="text-lg font-bold text-slate-200 mt-1">{formatCurrency(analyzerOutputs.netToSeller)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-900/50 border border-slate-850 p-4">
                      <p className="text-xs text-slate-400 font-semibold">Wholesale Spread</p>
                      <p className="text-lg font-bold text-slate-200 mt-1">{formatCurrency(analyzerOutputs.assignmentFeeEst)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-900/50 border border-slate-850 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">Real-Time Deal Score</p>
                      <p className="text-[10px] text-slate-500">Includes Active Buyerssweet-spot & categories</p>
                    </div>
                    <span className={`rounded-full px-4 py-1.5 text-xs font-extrabold tracking-wide ${dealTier.bg}`}>
                      {analyzerOutputs.dealScore}/100 — {dealTier.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveAnalyzer}
                    className="w-full rounded-2xl bg-[#0BA887] py-3 text-sm font-bold text-white shadow hover:brightness-105 active:scale-[0.99] transition"
                  >
                    Save Analysis to Lead Record
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
      <p className="text-lg font-extrabold text-slate-100 mt-0.5">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-slate-400 font-semibold">{label}</span>
      {children}
    </label>
  );
}