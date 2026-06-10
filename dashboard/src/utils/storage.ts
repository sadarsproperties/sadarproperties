import type { AppData } from '../types';

const STORAGE_KEY = 'sadarproperties-dashboard-v1';

export const emptyData = (): AppData => ({
  properties: [],
  sellers: [],
  buyers: [],
  investors: [],
});

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return { ...emptyData(), ...JSON.parse(raw) };
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}