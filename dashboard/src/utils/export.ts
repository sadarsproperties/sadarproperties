import * as XLSX from 'xlsx';

function formatRow(row: Record<string, any>): Record<string, any> {
  // 1. Seller
  if ('ownerName' in row) {
    const phoneList = Array.isArray(row.phoneNumbers) ? row.phoneNumbers : (row.phone ? [row.phone] : []);
    const emailList = Array.isArray(row.emailAddresses) ? row.emailAddresses : (row.email ? [row.email] : []);
    return {
      'Owner Name': row.ownerName || '',
      'Phone Numbers': phoneList.join(', '),
      'Email Addresses': emailList.join(', '),
      'Mailing Address': row.mailingAddress || '',
      'Ownership Type': row.ownershipType || 'Individual',
      'Company/Entity Name': row.entityName || '',
      'Equity Estimate ($)': row.equityEstimate != null ? row.equityEstimate : '',
      'Years Owned': row.ownershipYears != null ? row.ownershipYears : '',
      'Skip Traced': row.skipTraced ? 'Yes' : 'No',
      'Last Contact Date': row.lastContactDate ? String(row.lastContactDate).slice(0, 10) : '',
      'Contact Notes': row.contactNotes || '',
    };
  }

  // 2. Buyer
  if ('buyerType' in row) {
    const buyBox = row.buyBox || {};
    return {
      'Full Name': row.fullName || '',
      'Company Name': row.companyName || '',
      'Phone': row.phone || '',
      'Email': row.email || '',
      'Buyer Type': row.buyerType || '',
      'Preferred States': Array.isArray(buyBox.preferredStates) ? buyBox.preferredStates.join(', ') : '',
      'Preferred Cities': Array.isArray(buyBox.preferredCities) ? buyBox.preferredCities.join(', ') : '',
      'Desired Property Types': Array.isArray(buyBox.desiredPropertyTypes) ? buyBox.desiredPropertyTypes.join(', ') : '',
      'Max Budget ($)': buyBox.maxBudget != null ? buyBox.maxBudget : '',
    };
  }

  // 3. Investor
  if ('investorName' in row) {
    const buyBox = row.buyBox || {};
    return {
      'Investor Name': row.investorName || '',
      'Company Name': row.companyName || '',
      'Phone': row.phone || '',
      'Email': row.email || '',
      'LinkedIn URL': row.linkedInUrl || '',
      'Preferred States': Array.isArray(buyBox.preferredStates) ? buyBox.preferredStates.join(', ') : '',
      'Preferred Cities': Array.isArray(buyBox.preferredCities) ? buyBox.preferredCities.join(', ') : '',
      'Desired Property Types': Array.isArray(buyBox.desiredPropertyTypes) ? buyBox.desiredPropertyTypes.join(', ') : '',
      'Max Budget ($)': buyBox.maxBudget != null ? buyBox.maxBudget : '',
    };
  }

  // 4. Property / Lead
  if ('address' in row && 'price' in row) {
    return {
      'Address': row.address || '',
      'City': row.city || '',
      'State': row.state || '',
      'ZIP Code': row.zip || (row.zipCode || ''),
      'Property Type': row.propertyType || '',
      'Lead Categories': Array.isArray(row.leadCategories) ? row.leadCategories.join(', ') : '',
      'Status': row.status || 'new',
      'Price ($)': row.price != null ? row.price : 0,
      'Asking Price ($)': row.askingPrice != null ? row.askingPrice : 0,
      'ARV ($)': row.arv != null ? row.arv : '',
      'Repair Costs ($)': row.repairCosts != null ? row.repairCosts : '',
      'Assignment Fee ($)': row.assignmentFee != null ? row.assignmentFee : 10000,
      'Deal Score': row.dealScore != null ? row.dealScore : '',
      'Bedrooms': row.bedrooms != null ? row.bedrooms : '',
      'Bathrooms': row.bathrooms != null ? row.bathrooms : '',
      'Sqft': row.sqft != null ? row.sqft : '',
      'Lot Size': row.lotSize != null ? row.lotSize : '',
      'Year Built': row.yearBuilt != null ? row.yearBuilt : '',
      'Source': row.source || 'Manual',
      'Source URL': row.sourceUrl || '',
      'Notes': row.notes || '',
    };
  }

  // Fallback: return as-is
  return row;
}

export function exportRows(
  rows: Record<string, unknown>[],
  filename: string,
  format: 'csv' | 'xlsx'
): void {
  if (!rows.length) return;

  const formatted = rows.map(formatRow);
  const worksheet = XLSX.utils.json_to_sheet(formatted);
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