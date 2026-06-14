import type { AppData, Buyer, Investor, MatchedContact, Property, Seller } from '../types';
import { getAuthToken } from '../hooks/useAuth';

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
};