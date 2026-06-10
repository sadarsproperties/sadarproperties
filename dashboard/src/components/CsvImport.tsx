import Papa from 'papaparse';
import type { ActiveView } from '../types';

interface CsvImportProps {
  view: ActiveView;
  onImport: (rows: Record<string, string>[]) => void;
}

const templates: Record<ActiveView, string[]> = {
  properties: ['address', 'city', 'state', 'zip', 'propertyType', 'price', 'leadCategories', 'arv', 'repairCosts', 'notes'],
  sellers: ['ownerName', 'phone', 'email', 'mailingAddress'],
  buyers: ['fullName', 'companyName', 'phone', 'email', 'buyerType', 'preferredStates', 'preferredCities', 'desiredPropertyTypes', 'maxBudget'],
  investors: ['investorName', 'companyName', 'phone', 'email', 'linkedInUrl', 'preferredStates', 'preferredCities', 'desiredPropertyTypes', 'maxBudget'],
};

export function CsvImport({ view, onImport }: CsvImportProps) {
  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => onImport(result.data),
    });

    event.target.value = '';
  };

  return (
    <label className="cursor-pointer rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:border-slate-400">
      Import CSV
      <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      <span className="mt-1 block text-[10px] text-slate-400">
        Columns: {templates[view].join(', ')}
      </span>
    </label>
  );
}