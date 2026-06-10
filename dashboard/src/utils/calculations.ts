import type { Property, PropertyMetrics } from '../types';

export const DEFAULT_ASSIGNMENT_FEE = 10000;

// Sophisticated scoring with tunable weights
const SCORING_WEIGHTS = {
  margin: 45,           // Profit / assignment fee potential
  spread: 30,           // ARV - purchase price equity
  matchQuality: 15,     // Number & strength of buyer matches (applied client-side)
  repairEfficiency: 7,  // Lower repair % of ARV is better
  recency: 3,           // Newer leads get slight boost (days since created)
};

export function calculateMetrics(property: Property, options?: { matchCount?: number; daysSinceAdded?: number }): PropertyMetrics {
  const { arv, repairCosts, assignmentFee, price, createdAt } = property;
  const matchCount = options?.matchCount ?? 0;
  const daysSince = options?.daysSinceAdded ?? (createdAt ? (Date.now() - new Date(createdAt).getTime()) / (1000*3600*24) : 30);

  if (arv == null || repairCosts == null || arv <= 0) {
    return { mao: null, offerMin: null, offerMax: null, dealScore: null };
  }

  const mao = arv * 0.7 - repairCosts - (assignmentFee || 10000);
  const offerMin = mao * 0.9;
  const offerMax = mao;

  let dealScore: number | null = null;
  if (mao > 0) {
    const profitRatio = (assignmentFee || 10000) / mao;
    const marginScore = Math.min(profitRatio * 200, SCORING_WEIGHTS.margin);

    const spreadScore = Math.min((arv - price) / arv * 100, SCORING_WEIGHTS.spread);

    // Match quality (more matches + higher implied quality)
    const matchScore = Math.min(matchCount * 5, SCORING_WEIGHTS.matchQuality);

    // Repair efficiency: lower repair-to-ARV ratio is better
    const repairRatio = repairCosts / arv;
    const repairPenalty = Math.max(0, (repairRatio - 0.2) * 50);
    const repairScore = Math.max(0, SCORING_WEIGHTS.repairEfficiency - repairPenalty);

    // Recency bonus (newer leads slightly preferred)
    const recencyScore = Math.max(0, SCORING_WEIGHTS.recency * (1 - Math.min(daysSince / 45, 1)));

    dealScore = Math.max(1, Math.min(100, Math.round(
      marginScore + spreadScore + matchScore + repairScore + recencyScore
    )));
  } else {
    dealScore = 1;
  }

  return {
    mao: Math.round(mao),
    offerMin: Math.round(offerMin),
    offerMax: Math.round(offerMax),
    dealScore,
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