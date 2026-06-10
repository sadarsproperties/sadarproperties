import type { FilterState, PriceBracket, Property } from '../types';

const HOUR_MS = 60 * 60 * 1000;

export function getPriceBracket(price: number): PriceBracket {
  if (price < 10000) return 'under_10k';
  if (price < 25000) return '10k_25k';
  if (price < 50000) return '25k_50k';
  if (price < 100000) return '50k_100k';
  if (price < 250000) return '100k_250k';
  return '250k_plus';
}

export const PRICE_BRACKET_LABELS: Record<PriceBracket, string> = {
  under_10k: 'Under $10,000',
  '10k_25k': '$10,000–$25,000',
  '25k_50k': '$25,000–$50,000',
  '50k_100k': '$50,000–$100,000',
  '100k_250k': '$100,000–$250,000',
  '250k_plus': '$250,000+',
};

export function filterProperties(properties: Property[], filters: FilterState): Property[] {
  const now = Date.now();

  return properties.filter((property) => {
    if (filters.propertyTypes.length && !filters.propertyTypes.includes(property.propertyType)) {
      return false;
    }

    if (
      filters.leadCategories.length &&
      !filters.leadCategories.some((category) => property.leadCategories.includes(category))
    ) {
      return false;
    }

    if (filters.priceBrackets.length) {
      const bracket = getPriceBracket(property.price);
      if (!filters.priceBrackets.includes(bracket)) return false;
    }

    if (filters.under10kLast4Hours) {
      const created = new Date(property.createdAt).getTime();
      if (property.price >= 10000 || now - created > 4 * HOUR_MS) return false;
    }

    if (filters.newLeads24Hours) {
      const created = new Date(property.createdAt).getTime();
      if (now - created > 24 * HOUR_MS) return false;
    }

    if (filters.search.trim()) {
      const query = filters.search.trim().toLowerCase();
      const haystack = [
        property.address,
        property.city,
        property.state,
        property.zip,
        property.notes,
        property.leadCategories.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}