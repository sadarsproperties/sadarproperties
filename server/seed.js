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
    // Truncate all tables cascading to respect FK orders
    const { query } = await import('./db.js');
    await query('TRUNCATE TABLE buyer_matches, crm_activities, crm_notes, properties, sellers, buyers, investors, data_sources, export_logs CASCADE');
  }

  const now = new Date().toISOString();
  const seller1Id = randomUUID();
  const seller2Id = randomUUID();
  const seller3Id = randomUUID();

  const prop1Id = randomUUID();
  const prop2Id = randomUUID();
  const prop3Id = randomUUID();
  const prop4Id = randomUUID();

  // Sellers
  await sellers.insert({
    id: seller1Id,
    ownerName: 'James Whitfield',
    phone: '(314) 555-0192',
    email: 'j.whitfield@email.com',
    mailingAddress: '8821 Delmar Blvd, St. Louis, MO 63124',
    createdAt: daysAgo(5),
    updatedAt: now,
    propertyId: null,
    phoneNumbers: ['(314) 555-0192', '(314) 555-0999'],
    emailAddresses: ['j.whitfield@email.com'],
    ownershipYears: 12,
    equityEstimate: 145000,
    ownershipType: 'Individual',
    entityName: '',
    skipTraced: true,
    lastContactDate: daysAgo(3),
    contactNotes: 'Very motivated, inherited property, prefers cash deal.',
  });

  await sellers.insert({
    id: seller2Id,
    ownerName: 'Maria Lopez',
    phone: '(314) 555-0144',
    email: 'maria.lopez@email.com',
    mailingAddress: '4109 Minnesota Ave, Kansas City, MO 64129',
    createdAt: daysAgo(2),
    updatedAt: now,
    propertyId: null,
    phoneNumbers: ['(314) 555-0144'],
    emailAddresses: ['maria.lopez@email.com', 'm.lopez.business@email.com'],
    ownershipYears: 4,
    equityEstimate: 62000,
    ownershipType: 'Individual',
    entityName: '',
    skipTraced: false,
    lastContactDate: daysAgo(1),
    contactNotes: 'Prefers text communication.',
  });

  await sellers.insert({
    id: seller3Id,
    ownerName: 'Robert Chen',
    phone: '(816) 555-0188',
    email: 'rchen.invest@email.com',
    mailingAddress: 'PO Box 441, Independence, MO 64050',
    createdAt: daysAgo(1),
    updatedAt: now,
    propertyId: null,
    phoneNumbers: ['(816) 555-0188'],
    emailAddresses: ['rchen.invest@email.com'],
    ownershipYears: 8,
    equityEstimate: 320000,
    ownershipType: 'LLC/Entity',
    entityName: 'Chen Holdings LLC',
    skipTraced: true,
    lastContactDate: daysAgo(2),
    contactNotes: 'Tired landlord, owns multiple properties in St. Louis.',
  });

  // Buyers
  await buyers.insert({
    id: randomUUID(),
    fullName: 'Derrick Miles',
    companyName: 'Miles Cash Offers LLC',
    phone: '(314) 555-0110',
    email: 'derrick@milescash.com',
    website: 'https://www.milescashoffers.com',
    buyerType: 'Cash Buyer',
    buyBox: {
      preferredStates: ['MO'],
      preferredCities: ['St. Louis', 'East St. Louis'],
      desiredPropertyTypes: ['Single Family Residence (SFR)', 'Duplex (2 units)'],
      maxBudget: 85000,
    },
    minUnits: 1,
    maxUnits: 2,
    budgetMin: 40000,
    budgetMax: 100000,
    investmentStrategy: 'Fix & Flip',
    notes: 'Frequent buyer, prefers North County properties needing light rehab.',
    lastContact: daysAgo(1),
    dealsClosed: 4,
    createdAt: daysAgo(10),
    updatedAt: now,
  });

  await buyers.insert({
    id: randomUUID(),
    fullName: 'Angela Brooks',
    companyName: 'Brooks Flip Group',
    phone: '(816) 555-0177',
    email: 'angela@brooksflip.com',
    website: 'https://www.brooksflipgroup.com',
    buyerType: 'Fix and Flip Buyer',
    buyBox: {
      preferredStates: ['MO', 'KS'],
      preferredCities: ['Kansas City'],
      desiredPropertyTypes: ['Single Family Residence (SFR)', 'Multifamily (General — 5+ units)'],
      maxBudget: 150000,
    },
    minUnits: 1,
    maxUnits: 10,
    budgetMin: 75000,
    budgetMax: 250000,
    investmentStrategy: 'Fix & Flip',
    notes: 'Looking for cosmetic rehabs in Kansas City metro area.',
    lastContact: daysAgo(3),
    dealsClosed: 2,
    createdAt: daysAgo(8),
    updatedAt: now,
  });

  await buyers.insert({
    id: randomUUID(),
    fullName: 'Marcus Vance',
    companyName: 'Vance Capital Partners',
    phone: '(314) 555-0244',
    email: 'marcus@vancecapital.com',
    website: 'https://www.vancecapital.com',
    buyerType: 'Multifamily Buyer',
    buyBox: {
      preferredStates: ['MO', 'IL'],
      preferredCities: ['St. Louis', 'Chicago'],
      desiredPropertyTypes: ['Multifamily (General — 5+ units)', 'Apartment Complex'],
      maxBudget: 1500000,
    },
    minUnits: 5,
    maxUnits: 50,
    budgetMin: 300000,
    budgetMax: 2000000,
    investmentStrategy: 'Buy & Hold',
    notes: 'Institutional multifamily buyer looking for value-add deals.',
    lastContact: daysAgo(5),
    dealsClosed: 1,
    createdAt: daysAgo(15),
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
      desiredPropertyTypes: ['Multifamily (General — 5+ units)', 'Duplex (2 units)', 'Triplex (3 units)'],
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
      desiredPropertyTypes: ['Commercial', 'Multifamily (General — 5+ units)'],
      maxBudget: 500000,
    },
    createdAt: daysAgo(6),
    updatedAt: now,
  });

  // Properties
  await properties.insert({
    id: prop1Id,
    address: '1427 N Grand Blvd',
    city: 'St. Louis',
    state: 'MO',
    zip: '63106',
    propertyType: 'Single Family Residence (SFR)',
    leadCategories: ['Vacant', 'Absentee Owner', 'Distressed'],
    price: 8200,
    askingPrice: 8200,
    arv: 95000,
    repairCosts: 28000,
    assignmentFee: 10000,
    sellerId: seller1Id,
    notes: 'Boarded windows, strong rental comps nearby.',
    createdAt: hoursAgo(2),
    updatedAt: now,
  });

  await properties.insert({
    id: prop2Id,
    address: '3908 E 39th St',
    city: 'Kansas City',
    state: 'MO',
    zip: '64128',
    propertyType: 'Duplex (2 units)',
    leadCategories: ['Tax Delinquent', 'Tired Landlord'],
    price: 42000,
    askingPrice: 42000,
    arv: 125000,
    repairCosts: 35000,
    assignmentFee: 12000,
    sellerId: seller2Id,
    notes: 'Seller motivated, behind on taxes.',
    createdAt: hoursAgo(6),
    updatedAt: now,
  });

  await properties.insert({
    id: prop3Id,
    address: '118 W Lexington Ave',
    city: 'Independence',
    state: 'MO',
    zip: '64050',
    propertyType: 'Multifamily (General — 5+ units)',
    leadCategories: ['Pre-Foreclosure', 'Rental Property'],
    price: 118000,
    askingPrice: 118000,
    arv: 210000,
    repairCosts: 45000,
    assignmentFee: 15000,
    sellerId: seller3Id,
    notes: '4-unit, long-term tenant in place.',
    createdAt: hoursAgo(20),
    updatedAt: now,
  });

  await properties.insert({
    id: prop4Id,
    address: '5512 Natural Bridge Ave',
    city: 'St. Louis',
    state: 'MO',
    zip: '63120',
    propertyType: 'Single Family Residence (SFR)',
    leadCategories: ['Foreclosure', 'REO'],
    price: 6500,
    askingPrice: 6500,
    arv: 72000,
    repairCosts: 22000,
    assignmentFee: 10000,
    sellerId: seller1Id,
    notes: 'REO assignment candidate under $10k.',
    createdAt: hoursAgo(1),
    updatedAt: now,
  });

  // Link back properties to sellers (avoiding circular foreign key insert constraints)
  await sellers.update(seller1Id, { propertyId: prop1Id });
  await sellers.update(seller2Id, { propertyId: prop2Id });
  await sellers.update(seller3Id, { propertyId: prop3Id });

  return { seeded: true, message: 'Sample wholesalers data loaded.' };
}
