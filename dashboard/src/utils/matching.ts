import type { Buyer, Investor, MatchedContact, Property } from '../types';

function matchesBuyBox(
  property: Property,
  buyBox: Buyer['buyBox'] | Investor['buyBox']
): boolean {
  if (buyBox.maxBudget != null && property.price > buyBox.maxBudget) {
    return false;
  }

  if (
    buyBox.preferredStates.length &&
    !buyBox.preferredStates.some((state) => state.toLowerCase() === property.state.toLowerCase())
  ) {
    return false;
  }

  if (
    buyBox.preferredCities.length &&
    !buyBox.preferredCities.some((city) => city.toLowerCase() === property.city.toLowerCase())
  ) {
    return false;
  }

  if (
    buyBox.desiredPropertyTypes.length &&
    !buyBox.desiredPropertyTypes.includes(property.propertyType)
  ) {
    return false;
  }

  return true;
}

export function findMatches(
  property: Property,
  buyers: Buyer[],
  investors: Investor[]
): MatchedContact[] {
  const matches: MatchedContact[] = [];

  for (const buyer of buyers) {
    if (matchesBuyBox(property, buyer.buyBox)) {
      matches.push({
        id: buyer.id,
        name: buyer.fullName,
        companyName: buyer.companyName,
        phone: buyer.phone,
        email: buyer.email,
        type: 'Buyer',
        buyerType: buyer.buyerType,
      });
    }
  }

  for (const investor of investors) {
    if (matchesBuyBox(property, investor.buyBox)) {
      matches.push({
        id: investor.id,
        name: investor.investorName,
        companyName: investor.companyName,
        phone: investor.phone,
        email: investor.email,
        type: 'Investor',
        linkedInUrl: investor.linkedInUrl,
      });
    }
  }

  return matches.sort((a, b) => a.name.localeCompare(b.name));
}