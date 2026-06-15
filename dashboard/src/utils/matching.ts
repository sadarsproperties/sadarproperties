import type { Buyer, Investor, MatchedContact, Property } from '../types';

export interface MatchResult {
  matched: boolean;
  score: number;
  breakdown: {
    state: boolean;
    propertyType: boolean;
    budget: boolean;
    city: boolean;
    units: boolean;
  };
}

export function calculateMatchScore(property: Property, buyerOrInvestor: Buyer | Investor): MatchResult {
  const buyBox = buyerOrInvestor.buyBox || { preferredStates: [], preferredCities: [], desiredPropertyTypes: [], maxBudget: null };
  const preferredStates = buyBox.preferredStates || [];
  const propertyState = (property.state || '').trim().toUpperCase();

  // 1. State Filter (25% Weight) - Hard Filter
  if (preferredStates.length > 0) {
    const isStateMatched = preferredStates.some(s => s.trim().toUpperCase() === propertyState);
    if (!isStateMatched) {
      return {
        matched: false,
        score: 0,
        breakdown: { state: false, propertyType: false, budget: false, city: false, units: false }
      };
    }
  }

  // 2. Property Type Filter (25% Weight) - Hard Filter
  const desiredPropertyTypes = buyBox.desiredPropertyTypes || [];
  const propertyType = (property.propertyType || '').trim();

  if (desiredPropertyTypes.length > 0) {
    const isTypeMatched = desiredPropertyTypes.some(t => {
      const cleanT = t.toLowerCase();
      const cleanPT = propertyType.toLowerCase();
      return cleanT.includes(cleanPT) || cleanPT.includes(cleanT) ||
             (cleanT.includes('sfr') && cleanPT.includes('sfr')) ||
             (cleanT.includes('multi') && cleanPT.includes('multi'));
    });
    if (!isTypeMatched) {
      return {
        matched: false,
        score: 0,
        breakdown: { state: preferredStates.length > 0, propertyType: false, budget: false, city: false, units: false }
      };
    }
  }

  let score = 0;
  const breakdown = {
    state: true,
    propertyType: true,
    budget: false,
    city: false,
    units: false
  };

  score += 25; // Passed state filter
  score += 25; // Passed property type filter

  // 3. Budget Range (25% Weight)
  const price = property.askingPrice || property.price || 0;
  const bMin = buyerOrInvestor.budgetMin || 0;
  const bMax = buyerOrInvestor.budgetMax || buyBox.maxBudget || 0;

  let budgetMatches = false;
  if (bMin === 0 && bMax === 0) {
    budgetMatches = true;
  } else if (bMin > 0 && bMax > 0) {
    budgetMatches = price >= bMin && price <= bMax;
  } else if (bMax > 0) {
    budgetMatches = price <= bMax;
  } else if (bMin > 0) {
    budgetMatches = price >= bMin;
  }

  if (budgetMatches) {
    score += 25;
    breakdown.budget = true;
  }

  // 4. City (10% Weight, optional) - Bonus
  const preferredCities = buyBox.preferredCities || [];
  const propertyCity = (property.city || '').trim().toLowerCase();

  let cityMatches = false;
  if (preferredCities.length === 0) {
    cityMatches = true;
  } else {
    cityMatches = preferredCities.some(c => c.trim().toLowerCase() === propertyCity);
  }

  if (cityMatches) {
    score += 10;
    breakdown.city = true;
  }

  // 5. Unit Count (15% Weight, MF only)
  const isMultifamily = /multi|duplex|triplex|quad|apartment/i.test(propertyType);
  const uMin = ('unitRangeMin' in buyerOrInvestor ? buyerOrInvestor.unitRangeMin : ('minUnits' in buyerOrInvestor ? buyerOrInvestor.minUnits : 0)) || 0;
  const uMax = ('unitRangeMax' in buyerOrInvestor ? buyerOrInvestor.unitRangeMax : ('maxUnits' in buyerOrInvestor ? buyerOrInvestor.maxUnits : 0)) || 0;

  let unitCountMatches = true;
  if (isMultifamily) {
    const propUnits = property.units || 0;
    if (uMin > 0 || uMax > 0) {
      if (propUnits > 0) {
        if (uMin > 0 && uMax > 0) {
          unitCountMatches = propUnits >= uMin && propUnits <= uMax;
        } else if (uMax > 0) {
          unitCountMatches = propUnits <= uMax;
        } else if (uMin > 0) {
          unitCountMatches = propUnits >= uMin;
        }
      } else {
        unitCountMatches = false;
      }
    }
  }

  if (unitCountMatches) {
    score += 15;
    breakdown.units = true;
  }

  return {
    matched: true,
    score: Math.round(score),
    breakdown
  };
}

export function findMatches(
  property: Property,
  buyers: Buyer[],
  investors: Investor[]
): MatchedContact[] {
  const matches: MatchedContact[] = [];

  for (const buyer of buyers) {
    const res = calculateMatchScore(property, buyer);
    if (res.matched) {
      matches.push({
        id: buyer.id,
        name: buyer.fullName,
        companyName: buyer.companyName,
        phone: buyer.phone,
        email: buyer.email,
        type: 'Buyer',
        buyerType: buyer.buyerType,
        score: res.score,
        breakdown: res.breakdown
      });
    }
  }

  for (const investor of investors) {
    const res = calculateMatchScore(property, investor);
    if (res.matched) {
      matches.push({
        id: investor.id,
        name: investor.investorName,
        companyName: investor.companyName,
        phone: investor.phone,
        email: investor.email,
        type: 'Investor',
        linkedInUrl: investor.linkedInUrl,
        score: res.score,
        breakdown: res.breakdown
      });
    }
  }

  // Sort by score descending, then by name ascending
  return matches.sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });
}