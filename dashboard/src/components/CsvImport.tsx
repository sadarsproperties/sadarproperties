import Papa from 'papaparse';
import type { ActiveView } from '../types';

interface CsvImportProps {
  view?: ActiveView;
  columns?: string[];
  onImport: (rows: Record<string, string>[]) => void;
}

const templates: Record<ActiveView, string[]> = {
  properties: ['address', 'city', 'state', 'county', 'zip', 'propertyType', 'price', 'leadCategories', 'arv', 'repairCosts', 'notes'],
  sellers: ['ownerName', 'phone', 'email', 'mailingAddress'],
  buyers: ['fullName', 'companyName', 'phone', 'email', 'buyerType', 'preferredStates', 'preferredCities', 'desiredPropertyTypes', 'maxBudget'],
  investors: ['investorName', 'companyName', 'phone', 'email', 'linkedInUrl', 'preferredStates', 'preferredCities', 'desiredPropertyTypes', 'maxBudget'],
};

export function CsvImport({ view, columns, onImport }: CsvImportProps) {
  const cols = columns ?? (view ? templates[view] : []);

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
    <label className="cursor-pointer rounded-2xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#1A3C34] transition hover:bg-black/5">
      Import CSV
      <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      {cols.length > 0 && (
        <span className="mt-1 block text-[10px] text-[#8A8A8A]">
          Columns: {cols.join(', ')}
        </span>
      )}
    </label>
  );
}
