export const PROPERTY_TYPES = [
  'Single Family',
  'Multifamily',
  'Duplex',
  'Triplex',
  'Quadplex',
  'Apartment',
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
  'Fix & Flip',
  'Buy & Hold',
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

export interface Seller {
  id: string;
  ownerName: string;
  phone: string;
  email: string;
  mailingAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface Buyer {
  id: string;
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  buyerType: BuyerType;
  buyBox: BuyBox;
  createdAt: string;
  updatedAt: string;
}

export interface Investor {
  id: string;
  investorName: string;
  companyName: string;
  phone: string;
  email: string;
  linkedInUrl: string;
  buyBox: BuyBox;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: PropertyType;
  leadCategories: LeadCategory[];
  price: number;
  arv: number | null;
  repairCosts: number | null;
  assignmentFee: number;
  sellerId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  // New CRM + automation fields
  status?: 'new' | 'analyzed' | 'matched' | 'offer_sent' | 'under_contract' | 'assigned' | 'closed';
  topMatches?: MatchedContact[];
  dealScore?: number | null;
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
}