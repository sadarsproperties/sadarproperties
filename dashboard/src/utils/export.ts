import * as XLSX from 'xlsx';

export function exportRows(
  rows: Record<string, unknown>[],
  filename: string,
  format: 'csv' | 'xlsx'
): void {
  if (!rows.length) return;

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
    return;
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}