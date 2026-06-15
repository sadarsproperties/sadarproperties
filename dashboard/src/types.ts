export const PROPERTY_TYPES = [
  'Single Family Residence (SFR)',
  'Multifamily (General — 5+ units)',
  'Duplex (2 units)',
  'Triplex (3 units)',
  'Quadplex (4 units)',
  'Apartment Complex',
  'Commercial',
] as const;

export const LEAD_CATEGORIES = [
  'Vacant',
  'Absentee Owner',
  'Distressed',
  'Tax Delinquent',
  'Pre-Foreclosure',
  'Foreclosure',
  'REO',
  'Probate',
  'Rental Property',
  'Tired Landlord',
] as const;

export const BUYER_TYPES = [
  'Cash Buyer',
  'Fix and Flip Buyer',
  'Buy and Hold Buyer',
  'Multifamily Buyer',
  'Commercial Buyer',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type LeadCategory = (typeof LEAD_CATEGORIES)[number];
export type BuyerType = (typeof BUYER_TYPES)[number];

export type PriceBracket =
  | 'under_10k'
  | '10k_25k'
  | '25k_50k'
  | '50k_100k'
  | '100k_250k'
  | '250k_plus';

export interface BuyBox {
  preferredStates: string[];
  preferredCities: string[];
  desiredPropertyTypes: PropertyType[];
  maxBudget: number | null;
}

export interface NoteEntry {
  id: string;
  text: string;
  createdAt: string;
}

export interface Seller {
  id: string;
  ownerName: string;
  phone: string;
  email: string;
  mailingAddress: string;
  createdAt: string;
  updatedAt: string;
  propertyId?: string | null;
  phoneNumbers?: string[];
  emailAddresses?: string[];
  ownershipYears?: number | null;
  equityEstimate?: number | null;
  ownershipType?: 'Individual' | 'LLC/Entity';
  entityName?: string;
  skipTraced?: boolean;
  lastContactDate?: string | null;
  contactNotes?: string;
  notesList?: NoteEntry[];
}

export interface Buyer {
  id: string;
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  website?: string;
  buyerType: BuyerType;
  buyBox: BuyBox;
  minUnits?: number | null;
  maxUnits?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  investmentStrategy?: string;
  notes?: string;
  lastContact?: string | null;
  dealsClosed?: number;
  zillowUrl?: string;
  redfinUrl?: string;
  realtorUrl?: string;
  propstreamUrl?: string;
  batchleadsUrl?: string;
  createdAt: string;
  updatedAt: string;
  notesList?: NoteEntry[];
}

export interface Investor {
  id: string;
  investorName: string;
  companyName: string;
  phone: string;
  email: string;
  linkedInUrl?: string;
  biggerPocketsUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  zillowUrl?: string;
  redfinUrl?: string;
  realtorUrl?: string;
  propstreamUrl?: string;
  batchleadsUrl?: string;
  connectedInvestorsUrl?: string;
  loopnetUrl?: string;
  crexiUrl?: string;
  sourcePlatform?: string;
  buyBoxRaw?: string;
  unitRangeMin?: number | null;
  unitRangeMax?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  investmentStrategy?: string;
  aiExtracted?: boolean;
  buyBox: BuyBox;
  createdAt: string;
  updatedAt: string;
  notesList?: NoteEntry[];
}

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  zipCode?: string;
  propertyType: PropertyType;
  leadCategories: LeadCategory[];
  price: number;
  askingPrice?: number;
  arv: number | null;
  repairCosts: number | null;
  assignmentFee: number;
  sellerId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  status?: 'new' | 'analyzed' | 'matched' | 'offer_sent' | 'under_contract' | 'assigned' | 'closed' | 'contacted';
  topMatches?: MatchedContact[];
  dealScore?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  lotSize?: number | null;
  yearBuilt?: number | null;
  units?: number | null;
  source: string;
  sourceUrl?: string;
  zillowUrl?: string;
  redfinUrl?: string;
  realtorUrl?: string;
  propstreamUrl?: string;
  batchleadsUrl?: string;
  dateAdded?: string;
  lastUpdated?: string;
  lastContactDate?: string;
  followUpDate?: string;
  notesList?: NoteEntry[];
  assignedBuyerId?: string | null;
}

export interface PropertyMetrics {
  mao: number | null;
  offerMin: number | null;
  offerMax: number | null;
  dealScore: number | null;
}

export interface FilterState {
  propertyTypes: PropertyType[];
  leadCategories: LeadCategory[];
  priceBrackets: PriceBracket[];
  under10kLast4Hours: boolean;
  newLeads24Hours: boolean;
  search: string;
}

export interface AppData {
  properties: Property[];
  sellers: Seller[];
  buyers: Buyer[];
  investors: Investor[];
}

export type ActiveView = 'properties' | 'sellers' | 'buyers' | 'investors';

export interface MatchedContact {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  type: 'Buyer' | 'Investor';
  buyerType?: BuyerType;
  linkedInUrl?: string;
  score?: number;
  breakdown?: {
    state: boolean;
    propertyType: boolean;
    budget: boolean;
    city: boolean;
    units: boolean;
  };
}