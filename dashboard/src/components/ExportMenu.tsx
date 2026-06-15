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
        className="rounded-2xl bg-[#0BA887] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#099275] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Export ({rows.length})
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl py-1 text-slate-800">
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            className="block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-black/5 transition"
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-black/5 transition"
          >
            CSV (.csv)
          </button>
        </div>
      )}
    </div>
  );
}