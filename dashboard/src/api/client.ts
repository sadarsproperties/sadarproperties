import type { AppData, AreaStat, Buyer, City, County, Investor, MatchedContact, Property, Realtor, Seller, TitleCompany } from '../types';
import { getAuthToken } from './token';

const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
let normalized = (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://') || rawApiUrl.startsWith('/'))
  ? rawApiUrl
  : `https://${rawApiUrl}`;

if (normalized.startsWith('http') && !normalized.endsWith('/api') && !normalized.includes('/api/')) {
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  normalized = `${normalized}/api`;
}

export const API_BASE = normalized;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),
  fetchData: () => request<AppData>('/data'),
  createProperty: (property: Partial<Property>) =>
    request<Property>('/properties', { method: 'POST', body: JSON.stringify(property) }),
  updateProperty: (id: string, property: Partial<Property>) =>
    request<Property>(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(property) }),
  deleteProperty: (id: string) => request<{ ok: boolean }>(`/properties/${id}`, { method: 'DELETE' }),
  bulkProperties: (items: Partial<Property>[]) =>
    request<Property[]>('/properties/bulk', { method: 'POST', body: JSON.stringify(items) }),

  getSellers: (params?: Record<string, string>) =>
    request<Seller[]>('/sellers' + (params ? '?' + new URLSearchParams(params).toString() : '')),

  createSeller: (seller: Partial<Seller>) =>
    request<Seller>('/sellers', { method: 'POST', body: JSON.stringify(seller) }),
  updateSeller: (id: string, seller: Partial<Seller>) =>
    request<Seller>(`/sellers/${id}`, { method: 'PUT', body: JSON.stringify(seller) }),
  deleteSeller: (id: string) => request<{ ok: boolean }>(`/sellers/${id}`, { method: 'DELETE' }),
  bulkSellers: (items: Partial<Seller>[]) =>
    request<Seller[]>('/sellers/bulk', { method: 'POST', body: JSON.stringify(items) }),

  createBuyer: (buyer: Partial<Buyer>) =>
    request<Buyer>('/buyers', { method: 'POST', body: JSON.stringify(buyer) }),
  updateBuyer: (id: string, buyer: Partial<Buyer>) =>
    request<Buyer>(`/buyers/${id}`, { method: 'PUT', body: JSON.stringify(buyer) }),
  deleteBuyer: (id: string) => request<{ ok: boolean }>(`/buyers/${id}`, { method: 'DELETE' }),
  bulkBuyers: (items: Partial<Buyer>[]) =>
    request<Buyer[]>('/buyers/bulk', { method: 'POST', body: JSON.stringify(items) }),

  createInvestor: (investor: Partial<Investor>) =>
    request<Investor>('/investors', { method: 'POST', body: JSON.stringify(investor) }),
  updateInvestor: (id: string, investor: Partial<Investor>) =>
    request<Investor>(`/investors/${id}`, { method: 'PUT', body: JSON.stringify(investor) }),
  deleteInvestor: (id: string) => request<{ ok: boolean }>(`/investors/${id}`, { method: 'DELETE' }),
  bulkInvestors: (items: Partial<Investor>[]) =>
    request<Investor[]>('/investors/bulk', { method: 'POST', body: JSON.stringify(items) }),

  // Automation & AI
  autoMatchProperty: (id: string) =>
    request<{ property: Property; matches: MatchedContact[]; dealScore: number | null }>(`/properties/${id}/auto-match`, { method: 'POST' }),

  extractBuyBox: (payload: { text?: string; url?: string }) =>
    request<{ preferredStates: string[]; preferredCities: string[]; desiredPropertyTypes: string[]; maxBudget: number | null; notes: string }>('/ai/extract-buybox', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  notifyMatches: (id: string, matches: any[]) =>
    request<{ sent: number; log: Array<{ to: string; email: string; emailId: string; at: string }>; errors?: Array<{ name: string; reason: string }> }>(`/properties/${id}/notify`, {
      method: 'POST',
      body: JSON.stringify({ matches }),
    }),

  clearDb: () =>
    request<{ ok: boolean }>('/admin/clear-db', { method: 'POST' }),

  // Geography
  getCounties: (params?: Record<string, string>) =>
    request<County[]>('/counties' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  createCounty: (county: Partial<County>) =>
    request<County>('/counties', { method: 'POST', body: JSON.stringify(county) }),
  updateCounty: (id: string, county: Partial<County>) =>
    request<County>(`/counties/${id}`, { method: 'PUT', body: JSON.stringify(county) }),
  deleteCounty: (id: string) => request<{ ok: boolean }>(`/counties/${id}`, { method: 'DELETE' }),
  bulkCounties: (items: Partial<County>[]) =>
    request<County[]>('/counties/bulk', { method: 'POST', body: JSON.stringify(items) }),

  getCities: (params?: Record<string, string>) =>
    request<City[]>('/cities' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  createCity: (city: Partial<City>) =>
    request<City>('/cities', { method: 'POST', body: JSON.stringify(city) }),
  updateCity: (id: string, city: Partial<City>) =>
    request<City>(`/cities/${id}`, { method: 'PUT', body: JSON.stringify(city) }),
  deleteCity: (id: string) => request<{ ok: boolean }>(`/cities/${id}`, { method: 'DELETE' }),
  bulkCities: (items: Partial<City>[]) =>
    request<City[]>('/cities/bulk', { method: 'POST', body: JSON.stringify(items) }),

  getAreaStats: () => request<AreaStat[]>('/geo/area-stats'),

  // Realtors
  getRealtors: (params?: Record<string, string>) =>
    request<Realtor[]>('/realtors' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  createRealtor: (realtor: Partial<Realtor>) =>
    request<Realtor>('/realtors', { method: 'POST', body: JSON.stringify(realtor) }),
  updateRealtor: (id: string, realtor: Partial<Realtor>) =>
    request<Realtor>(`/realtors/${id}`, { method: 'PUT', body: JSON.stringify(realtor) }),
  deleteRealtor: (id: string) => request<{ ok: boolean }>(`/realtors/${id}`, { method: 'DELETE' }),
  bulkRealtors: (items: Partial<Realtor>[]) =>
    request<Realtor[]>('/realtors/bulk', { method: 'POST', body: JSON.stringify(items) }),

  // Title companies
  getTitleCompanies: (params?: Record<string, string>) =>
    request<TitleCompany[]>('/title-companies' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  createTitleCompany: (tc: Partial<TitleCompany>) =>
    request<TitleCompany>('/title-companies', { method: 'POST', body: JSON.stringify(tc) }),
  updateTitleCompany: (id: string, tc: Partial<TitleCompany>) =>
    request<TitleCompany>(`/title-companies/${id}`, { method: 'PUT', body: JSON.stringify(tc) }),
  deleteTitleCompany: (id: string) => request<{ ok: boolean }>(`/title-companies/${id}`, { method: 'DELETE' }),
  bulkTitleCompanies: (items: Partial<TitleCompany>[]) =>
    request<TitleCompany[]>('/title-companies/bulk', { method: 'POST', body: JSON.stringify(items) }),
};