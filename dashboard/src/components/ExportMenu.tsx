import { useState } from 'react';
import { exportRows } from '../utils/export';

interface ExportMenuProps {
  rows: Record<string, unknown>[];
  filename: string;
  disabled?: boolean;
}

export function ExportMenu({ rows, filename, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false);

  const handleExport = (format: 'csv' | 'xlsx') => {
    exportRows(rows, `${filename}-${new Date().toISOString().slice(0, 10)}`, format);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || rows.length === 0}
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Export ({rows.length})
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-800"
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-800"
          >
            CSV (.csv)
          </button>
        </div>
      )}
    </div>
  );
}