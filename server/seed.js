import { randomUUID } from 'crypto';
import { countAll, sellers, buyers, investors, properties } from './db.js';

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function seedDatabase({ force = false } = {}) {
  const counts = await countAll();
  const hasData = Object.values(counts).some((count) => count > 0);

  if (hasData && !force) {
    return { seeded: false, message: 'Database already has data. Use force=true to reseed.' };
  }

  if (force) {
    // Use direct queries for cleanup (respect FK order)
    const { query } = await import('./db.js');
    await query('DELETE FROM properties');
    await query('DELETE FROM sellers');
    await query('DELETE FROM buyers');
    await query('DELETE FROM investors');
  }

  const now = new Date().toISOString();
  const seller1Id = randomUUID();
  const seller2Id = randomUUID();
  const seller3Id = randomUUID();

  // Sellers
  await sellers.insert({
    id: seller1Id,
    ownerName: 'James Whitfield',
    phone: '(314) 555-0192',
    email: 'j.whitfield@email.com',
    mailingAddress: '8821 Delmar Blvd, St. Louis, MO 63124',
    createdAt: daysAgo(5),
    updatedAt: now,
  });

  await sellers.insert({
    id: seller2Id,
    ownerName: 'Maria Lopez',
    phone: '(314) 555-0144',
    email: 'maria.lopez@email.com',
    mailingAddress: '4109 Minnesota Ave, Kansas City, MO 64129',
    createdAt: daysAgo(2),
    updatedAt: now,
  });

  await sellers.insert({
    id: seller3Id,
    ownerName: 'Robert Chen',
    phone: '(816) 555-0188',
    email: 'rchen.invest@email.com',
    mailingAddress: 'PO Box 441, Independence, MO 64050',
    createdAt: daysAgo(1),
    updatedAt: now,
  });

  // Buyers
  await buyers.insert({
    id: randomUUID(),
    fullName: 'Derrick Miles',
    companyName: 'Miles Cash Offers LLC',
    phone: '(314) 555-0110',
    email: 'derrick@milescash.com',
    buyerType: 'Cash Buyer',
    buyBox: {
      preferredStates: ['MO'],
      preferredCities: ['St. Louis', 'East St. Louis'],
      desiredPropertyTypes: ['Single Family', 'Duplex'],
      maxBudget: 85000,
    },
    createdAt: daysAgo(10),
    updatedAt: now,
  });

  await buyers.insert({
    id: randomUUID(),
    fullName: 'Angela Brooks',
    companyName: 'Brooks Flip Group',
    phone: '(816) 555-0177',
    email: 'angela@brooksflip.com',
    buyerType: 'Fix & Flip',
    buyBox: {
      preferredStates: ['MO', 'KS'],
      preferredCities: ['Kansas City'],
      desiredPropertyTypes: ['Single Family', 'Multifamily'],
      maxBudget: 150000,
    },
    createdAt: daysAgo(8),
    updatedAt: now,
  });

  // Investors
  await investors.insert({
    id: randomUUID(),
    investorName: 'Samuel Ortiz',
    companyName: 'Ortiz Capital Partners',
    phone: '(314) 555-0133',
    email: 'sam@ortizcapital.com',
    linkedInUrl: 'https://linkedin.com/in/samuelortiz',
    buyBox: {
      preferredStates: ['MO'],
      preferredCities: ['St. Louis'],
      desiredPropertyTypes: ['Multifamily', 'Duplex', 'Triplex'],
      maxBudget: 250000,
    },
    createdAt: daysAgo(12),
    updatedAt: now,
  });

  await investors.insert({
    id: randomUUID(),
    investorName: 'Priya Nair',
    companyName: 'Nair Holdings',
    phone: '(816) 555-0166',
    email: 'priya@nairholdings.com',
    linkedInUrl: 'https://linkedin.com/in/priyanair',
    buyBox: {
      preferredStates: ['MO', 'KS'],
      preferredCities: ['Kansas City', 'Independence'],
      desiredPropertyTypes: ['Commercial', 'Multifamily'],
      maxBudget: 500000,
    },
    createdAt: daysAgo(6),
    updatedAt: now,
  });

  // Properties
  await properties.insert({
    id: randomUUID(),
    address: '1427 N Grand Blvd',
    city: 'St. Louis',
    state: 'MO',
    zip: '63106',
    propertyType: 'Single Family',
    leadCategories: ['Vacant', 'Absentee Owner', 'Distressed'],
    price: 8200,
    arv: 95000,
    repairCosts: 28000,
    assignmentFee: 10000,
    sellerId: seller1Id,
    notes: 'Boarded windows, strong rental comps nearby.',
    createdAt: hoursAgo(2),
    updatedAt: now,
  });

  await properties.insert({
    id: randomUUID(),
    address: '3908 E 39th St',
    city: 'Kansas City',
    state: 'MO',
    zip: '64128',
    propertyType: 'Duplex',
    leadCategories: ['Tax Delinquent', 'Tired Landlord'],
    price: 42000,
    arv: 125000,
    repairCosts: 35000,
    assignmentFee: 12000,
    sellerId: seller2Id,
    notes: 'Seller motivated, behind on taxes.',
    createdAt: hoursAgo(6),
    updatedAt: now,
  });

  await properties.insert({
    id: randomUUID(),
    address: '118 W Lexington Ave',
    city: 'Independence',
    state: 'MO',
    zip: '64050',
    propertyType: 'Multifamily',
    leadCategories: ['Pre-Foreclosure', 'Rental Property'],
    price: 118000,
    arv: 210000,
    repairCosts: 45000,
    assignmentFee: 15000,
    sellerId: seller3Id,
    notes: '4-unit, long-term tenant in place.',
    createdAt: hoursAgo(20),
    updatedAt: now,
  });

  await properties.insert({
    id: randomUUID(),
    address: '5512 Natural Bridge Ave',
    city: 'St. Louis',
    state: 'MO',
    zip: '63120',
    propertyType: 'Single Family',
    leadCategories: ['Foreclosure', 'REO'],
    price: 6500,
    arv: 72000,
    repairCosts: 22000,
    assignmentFee: 10000,
    sellerId: seller1Id,
    notes: 'REO assignment candidate under $10k.',
    createdAt: hoursAgo(1),
    updatedAt: now,
  });

  return { seeded: true, message: 'Sample wholesalers data loaded.' };
}
