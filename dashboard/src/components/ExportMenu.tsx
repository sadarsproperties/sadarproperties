import { useState } from 'react';
import { exportRows } from '../utils/export';
import { API_BASE } from '../api/client';
import { getAuthToken } from '../api/token';

interface ExportMenuProps {
  rows: Record<string, unknown>[];
  filename: string;
  disabled?: boolean;
}

export function ExportMenu({ rows, filename, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setOpen(false);
    setExporting(true);

    try {
      // Map filename to expected server export type
      let backendType = filename;
      if (filename === 'rewip-properties-database') backendType = 'properties';
      else if (filename === 'seller-intelligence-export') backendType = 'sellers';
      else if (filename === 'buyers-export') backendType = 'buyers';
      else if (filename === 'investors-export') backendType = 'investors';

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/export?type=${backendType}&format=${format}`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Server-side export returned error status');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.warn('[ExportMenu] Server-side export failed, falling back to client-side generation:', err);
      exportRows(rows, `${filename}-${new Date().toISOString().slice(0, 10)}`, format);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || rows.length === 0 || exporting}
        onClick={() => setOpen((value) => !value)}
        className="rounded-2xl bg-[#0BA887] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#099275] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {exporting ? 'Exporting...' : `Export (${rows.length})`}
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