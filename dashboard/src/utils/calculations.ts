import type { Property, PropertyMetrics } from '../types';

export const DEFAULT_ASSIGNMENT_FEE = 10000;

export interface DealAnalyzerInputs {
  arv: number;
  repairCosts: number;
  closingCostsPct: number;
  holdingCostsPct: number;
  desiredProfit: number;
  assignmentFee: number;
  negotiatedPrice: number;
}

export interface DealAnalyzerOutputs {
  mao: number;
  offerMin: number;
  offerMax: number;
  assignmentFeeEst: number;
  netToSeller: number;
  dealScore: number;
}

export function calculateDealAnalyzer(
  inputs: DealAnalyzerInputs,
  leadCategories: string[] = [],
  createdAt?: string,
  buyerBudgets: number[] = []
): DealAnalyzerOutputs {
  const { arv, repairCosts, closingCostsPct, negotiatedPrice } = inputs;

  // MAO = ARV * 0.70 - Repair Costs
  const mao = arv * 0.70 - repairCosts;
  const offerMin = mao * 0.90;
  const offerMax = mao;
  
  // Assignment Fee Estimate = MAO - Negotiated Price
  const assignmentFeeEst = mao - negotiatedPrice;
  
  // Net to Seller = Negotiated Price - (Negotiated Price * Closing Costs % / 100)
  const closingCosts = negotiatedPrice * (closingCostsPct / 100);
  const netToSeller = negotiatedPrice - closingCosts;

  // Compute Deal Score (5.4 Algorithm)
  // Factor 1: Equity (ARV vs Price) - 35% weight
  let equityScore = 0;
  if (negotiatedPrice > 0 && arv > 0) {
    const equityPct = (arv - negotiatedPrice) / arv;
    if (equityPct >= 0.40) {
      equityScore = 100;
    } else if (equityPct <= 0.10) {
      equityScore = 0;
    } else {
      equityScore = ((equityPct - 0.10) / (0.40 - 0.10)) * 100;
    }
  }

  // Factor 2: Lead Category Quality - 20% weight
  let categoryScore = 30;
  const highQuality = ['foreclosure', 'vacant', 'tax delinquent', 'distressed', 'tired landlord', 'probate', 'expired'];
  const medQuality = ['pre-foreclosure', 'absentee owner', 'rental property', 'divorce', 'bankruptcy'];

  if (leadCategories && leadCategories.length > 0) {
    const cats = leadCategories.map(c => String(c).trim().toLowerCase());
    const hasHigh = cats.some(c => highQuality.includes(c));
    const hasMed = cats.some(c => medQuality.includes(c));
    if (hasHigh) {
      categoryScore = 100;
    } else if (hasMed) {
      categoryScore = 70;
    }
  }

  // Factor 3: Days on Market - 15% weight
  let domScore = 60;
  if (createdAt) {
    const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 3600 * 24);
    if (days >= 90) domScore = 100;
    else if (days >= 60) domScore = 80;
    else if (days >= 30) domScore = 60;
    else if (days >= 15) domScore = 40;
    else domScore = 20;
  }

  // Factor 4: Rehab Cost vs ARV - 15% weight
  let repairScore = 100;
  if (repairCosts > 0 && arv > 0) {
    const repairPct = repairCosts / arv;
    if (repairPct <= 0.10) {
      repairScore = 100;
    } else if (repairPct >= 0.50) {
      repairScore = 20;
    } else {
      repairScore = 100 - ((repairPct - 0.10) / (0.50 - 0.10)) * 80;
    }
  }

  // Factor 5: Price Range Desirability - 15% weight
  let priceDesirabilityScore = 100;
  const activeBudgets = buyerBudgets.filter(b => b > 0);
  if (activeBudgets.length > 0) {
    const matching = activeBudgets.filter(b => b >= negotiatedPrice);
    priceDesirabilityScore = (matching.length / activeBudgets.length) * 100;
  } else {
    if (negotiatedPrice >= 50000 && negotiatedPrice <= 250000) priceDesirabilityScore = 100;
    else if (negotiatedPrice > 250000 && negotiatedPrice <= 400000) priceDesirabilityScore = 75;
    else if (negotiatedPrice < 50000) priceDesirabilityScore = 60;
    else priceDesirabilityScore = 30;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(
    (equityScore * 0.35) +
    (categoryScore * 0.20) +
    (domScore * 0.15) +
    (repairScore * 0.15) +
    (priceDesirabilityScore * 0.15)
  )));

  return {
    mao: Math.round(mao),
    offerMin: Math.round(offerMin),
    offerMax: Math.round(offerMax),
    assignmentFeeEst: Math.round(assignmentFeeEst),
    netToSeller: Math.round(netToSeller),
    dealScore: finalScore,
  };
}

export function calculateMetrics(
  property: Property,
  options?: { matchCount?: number; daysSinceAdded?: number; buyerBudgets?: number[] }
): PropertyMetrics {
  const { arv, repairCosts, price, askingPrice, leadCategories, createdAt } = property;
  const buyerBudgets = options?.buyerBudgets ?? [];

  if (arv == null || repairCosts == null || arv <= 0) {
    return { mao: null, offerMin: null, offerMax: null, dealScore: null };
  }

  // Calculate using standard calculator helper
  const inputs: DealAnalyzerInputs = {
    arv,
    repairCosts,
    closingCostsPct: 3,
    holdingCostsPct: 1,
    desiredProfit: Math.round(arv * 0.10),
    assignmentFee: property.assignmentFee || 10000,
    negotiatedPrice: Number(askingPrice || price || 0),
  };

  const results = calculateDealAnalyzer(
    inputs,
    leadCategories,
    createdAt,
    buyerBudgets
  );

  return {
    mao: results.mao,
    offerMin: results.offerMin,
    offerMax: results.offerMax,
    dealScore: results.dealScore,
  };
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}