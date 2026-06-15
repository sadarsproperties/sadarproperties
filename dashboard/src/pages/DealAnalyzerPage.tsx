import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import AppLayout from '../components/AppLayout';
import { calculateDealAnalyzer, formatCurrency, type DealAnalyzerInputs } from '../utils/calculations';

function parseNum(str: string) {
  return parseFloat(String(str).replace(/[,$]/g, '')) || 0;
}

function formatNum(n: number) {
  return Math.round(n).toLocaleString('en-US');
}

function getDealScoreTier(score: number | null) {
  if (score == null) return { label: 'N/A', bg: 'bg-slate-800 text-slate-400 border border-slate-700' };
  if (score >= 80) return { label: 'HOT DEAL', bg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' };
  if (score >= 60) return { label: 'GOOD DEAL', bg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
  if (score >= 40) return { label: 'MARGINAL', bg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
  return { label: 'WEAK', bg: 'bg-slate-700/50 text-slate-400 border border-slate-700/70' };
}

export default function DealAnalyzerPage() {
  const navigate = useNavigate();
  
  // Inputs state
  const [arv, setArv] = useState('300,000');
  const [repair, setRepair] = useState(45000);
  const [closingCostsPct, setClosingCostsPct] = useState('3');
  const [holdingCostsPct, setHoldingCostsPct] = useState('1');
  const [desiredProfit, setDesiredProfit] = useState('30,000');
  const [assignmentFee, setAssignmentFee] = useState('10,000');
  const [negotiatedPrice, setNegotiatedPrice] = useState('165,000');

  // Loaded buyers state for Price Desirability Score
  const [buyerBudgets, setBuyerBudgets] = useState<number[]>([]);

  useEffect(() => {
    async function loadBuyers() {
      try {
        const data = await api.fetchData();
        if (data && data.buyers) {
          setBuyerBudgets(data.buyers.map((b) => b.buyBox.maxBudget).filter((b): b is number => b != null));
        }
      } catch (e) {
        console.error('Failed to load buyers for deal score calculation', e);
      }
    }
    loadBuyers();
  }, []);

  // Sync desired profit when ARV changes (default to 10% of ARV)
  const handleArvChange = (val: string) => {
    setArv(val);
    const parsed = parseNum(val);
    if (parsed > 0) {
      setDesiredProfit(formatNum(Math.round(parsed * 0.10)));
    }
  };

  const parsedArv = parseNum(arv);
  const parsedDesiredProfit = parseNum(desiredProfit);
  const parsedAssignmentFee = parseNum(assignmentFee);
  const parsedNegotiatedPrice = parseNum(negotiatedPrice);
  const parsedClosingCostsPct = parseFloat(closingCostsPct) || 0;
  const parsedHoldingCostsPct = parseFloat(holdingCostsPct) || 0;

  const inputs: DealAnalyzerInputs = {
    arv: parsedArv,
    repairCosts: repair,
    closingCostsPct: parsedClosingCostsPct,
    holdingCostsPct: parsedHoldingCostsPct,
    desiredProfit: parsedDesiredProfit,
    assignmentFee: parsedAssignmentFee,
    negotiatedPrice: parsedNegotiatedPrice,
  };

  const outputs = useMemo(() => {
    return calculateDealAnalyzer(
      inputs,
      ['Distressed'], // Default lead category for analyzer leads
      new Date().toISOString(),
      buyerBudgets
    );
  }, [inputs, buyerBudgets]);

  const sliderPct = (repair / 150000) * 100;
  const dealTier = getDealScoreTier(outputs.dealScore);

  async function saveAsProperty() {
    try {
      const address = prompt('Property address to save?', '123 Main St') || 'Analyzed Deal';
      const city = prompt('City?', 'St. Louis') || '';
      const state = prompt('State?', 'MO') || '';
      
      await api.createProperty({
        address,
        city,
        state,
        propertyType: 'Single Family Residence (SFR)',
        leadCategories: ['Distressed'],
        price: parsedNegotiatedPrice,
        askingPrice: parsedNegotiatedPrice,
        arv: parsedArv || null,
        repairCosts: repair || null,
        assignmentFee: parsedAssignmentFee || 10000,
        sellerId: null,
        dealScore: outputs.dealScore,
        notes: `Saved from Deal Analyzer. MAO: ${formatCurrency(outputs.mao)}. Real-Time Deal Score: ${outputs.dealScore}/100.`,
      });
      alert('Saved to database! Check Pipeline.');
      navigate('/pipeline');
    } catch (e: any) {
      alert('Save failed: ' + (e?.message || e));
    }
  }

  return (
    <AppLayout title="Deal Analyzer" showBack onBack={() => navigate('/dashboard')}>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Inputs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Deal Inputs</div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs text-[#8A8A8A]">
                  <div>After Repair Value (ARV)</div>
                  <div className="rounded bg-amber-100 px-2 py-px text-[10px] font-semibold text-amber-700">Key metric</div>
                </div>
                <div className="mt-1 flex items-center text-3xl font-extrabold text-[#1A3C34]">
                  <span className="mr-1 text-slate-300">$</span>
                  <input
                    value={arv}
                    onChange={e => handleArvChange(e.target.value)}
                    onBlur={() => setArv(formatNum(parseNum(arv)))}
                    className="w-full bg-transparent tracking-[-1px] outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#8A8A8A]">Repair Cost Estimate</div>
                    <div className="text-[10px] text-[#8A8A8A]">Drag slider or adjust value</div>
                  </div>
                  <div className="text-right text-3xl font-extrabold text-[#1A3C34] tabular-nums">${formatNum(repair)}</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150000"
                  step="500"
                  value={repair}
                  onChange={e => setRepair(parseInt(e.target.value))}
                  className="repair-slider mt-3 w-full cursor-pointer"
                  style={{ background: `linear-gradient(to right, #1A3C34 0%, #1A3C34 ${sliderPct}%, #E8E2DA ${sliderPct}%, #E8E2DA 100%)` }}
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-400"><div>$0</div><div>$75k</div><div>$150k</div></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#8A8A8A]">Closing Costs (%)</div>
                  <input
                    type="number"
                    step="0.5"
                    value={closingCostsPct}
                    onChange={e => setClosingCostsPct(e.target.value)}
                    className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1A3C34]"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#8A8A8A]">Holding Costs (%)</div>
                  <input
                    type="number"
                    step="0.5"
                    value={holdingCostsPct}
                    onChange={e => setHoldingCostsPct(e.target.value)}
                    className="mt-1 w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1A3C34]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs font-semibold text-[#8A8A8A]">Desired Profit</div>
                  <div className="mt-1 flex items-center border border-black/10 rounded-xl px-2.5 py-2">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      value={desiredProfit}
                      onChange={e => setDesiredProfit(e.target.value)}
                      onBlur={() => setDesiredProfit(formatNum(parseNum(desiredProfit)))}
                      className="ml-1 w-full bg-transparent text-sm font-semibold outline-none"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#8A8A8A]">Wholesale Fee</div>
                  <div className="mt-1 flex items-center border border-black/10 rounded-xl px-2.5 py-2">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      value={assignmentFee}
                      onChange={e => setAssignmentFee(e.target.value)}
                      onBlur={() => setAssignmentFee(formatNum(parseNum(assignmentFee)))}
                      className="ml-1 w-full bg-transparent text-sm font-semibold outline-none"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#8A8A8A]">Negotiated Price</div>
                  <div className="mt-1 flex items-center border border-black/10 rounded-xl px-2.5 py-2">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      value={negotiatedPrice}
                      onChange={e => setNegotiatedPrice(e.target.value)}
                      onBlur={() => setNegotiatedPrice(formatNum(parseNum(negotiatedPrice)))}
                      className="ml-1 w-full bg-transparent text-sm font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={saveAsProperty}
            className="w-full rounded-2xl bg-[#1A3C34] py-3 text-sm font-bold text-white shadow hover:bg-[#1A3C34]/95 transition active:scale-[0.99]"
          >
            Save Analysis as Property Lead
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-3xl bg-[#1A3C34] p-6 text-white shadow-sm">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/50">
              <div>Auto-Calculated Results</div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#F5A623]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F5A623]" /> LIVE</div>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-sm text-white/70">Max Allowable Offer (MAO)</div>
                <div className="text-[11px] text-white/40">(ARV × 70%) − Repair Costs</div>
              </div>
              <div className="text-right text-6xl font-extrabold tabular-nums tracking-[-2px] text-[#F5A623]">{formatNum(outputs.mao)}</div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-widest text-white/50">Suggested Offer Range</div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-400">
                  {formatCurrency(outputs.offerMin)} – {formatCurrency(outputs.offerMax)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Deal Score</div>
                  <div className="text-[10px] text-white/30 mt-0.5">Real-time composite</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold tracking-wide ${dealTier.bg}`}>
                  {outputs.dealScore}/100 — {dealTier.label}
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown List */}
          <div className="rounded-3xl border border-black/5 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">
              <div>70% Rule & Seller Breakdown</div>
              <div className="rounded-full bg-[#1A3C34]/10 px-3 py-0.5 text-xs text-[#1A3C34] font-semibold">Live</div>
            </div>
            {[
              { label: 'ARV × 70%', val: formatCurrency(parsedArv * 0.70) },
              { label: 'Estimated Repair Costs', val: formatCurrency(repair), neg: true },
              { label: 'Maximum Allowable Offer (MAO)', val: formatCurrency(outputs.mao), highlight: true },
              { label: 'Negotiated / Purchase Price', val: formatCurrency(parsedNegotiatedPrice) },
              { label: 'Closing Costs Estimate', val: formatCurrency(parsedNegotiatedPrice * (parsedClosingCostsPct / 100)), neg: true },
              { label: 'Estimated Wholesaler Spread', val: formatCurrency(outputs.assignmentFeeEst), highlight: true },
              { label: 'Estimated Net to Seller', val: formatCurrency(outputs.netToSeller), highlight: true },
            ].map((row, i) => (
              <div key={i} className={`flex items-center justify-between border-t px-5 py-3 text-sm ${row.highlight ? 'bg-amber-50/50 font-bold text-slate-800' : 'text-slate-600'}`}>
                <div>{row.label}</div>
                <div className={row.neg ? 'text-red-600 font-semibold' : ''}>{row.val}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/pipeline')} className="flex-1 rounded-2xl bg-[#F5A623] py-3 text-sm font-bold text-[#1A3C34] shadow hover:brightness-95 active:scale-[0.98] transition">Go to Pipeline</button>
            <button onClick={() => navigate('/dashboard')} className="flex-1 rounded-2xl border-2 border-[#1A3C34] py-3 text-sm font-bold text-[#1A3C34] hover:bg-black/5 active:scale-[0.98] transition">Dashboard</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
