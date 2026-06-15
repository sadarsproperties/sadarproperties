import { query } from './db.js';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// In-memory status tracker for export jobs
export const exportJobs = new Map();

/**
 * Server-side exports generator supporting ExcelJS (.xlsx) and json2csv (.csv)
 */
export async function generateServerExport({ jobId, exportType, format }) {
  console.log(`[ExportService] Running server-side export for job ${jobId} (${exportType}) in ${format} format...`);
  
  if (jobId) {
    exportJobs.set(jobId, { status: 'processing', progress: 10 });
  }

  // 1. Fetch data based on exportType
  let data = [];
  try {
    if (exportType === 'properties') {
      data = await query('SELECT * FROM properties ORDER BY created_at DESC');
    } else if (exportType === 'sellers') {
      data = await query('SELECT * FROM sellers ORDER BY created_at DESC');
    } else if (exportType === 'buyers') {
      data = await query('SELECT * FROM buyers ORDER BY created_at DESC');
    } else if (exportType === 'investors') {
      data = await query('SELECT * FROM investors ORDER BY created_at DESC');
    } else if (exportType.startsWith('crm-')) {
      const stage = exportType.replace('crm-', '');
      let sql = 'SELECT * FROM properties';
      let params = [];
      if (stage === 'new') {
        sql += ' WHERE status = $1';
        params.push('new');
      } else if (stage === 'contacted') {
        sql += ' WHERE status = $1';
        params.push('contacted');
      } else if (stage === 'followup') {
        sql += ' WHERE follow_up_date IS NOT NULL';
      }
      sql += ' ORDER BY created_at DESC';
      data = await query(sql, params);
    } else if (exportType.startsWith('matches-')) {
      const propId = exportType.replace('matches-', '');
      data = await query(`
        SELECT bm.*, b.full_name, b.company_name, b.phone, b.email,
               i.investor_name, i.company_name as investor_company, i.phone as investor_phone, i.email as investor_email
        FROM buyer_matches bm
        LEFT JOIN buyers b ON bm.buyer_id = b.id AND bm.buyer_type = 'buyer'
        LEFT JOIN investors i ON bm.buyer_id = i.id AND bm.buyer_type = 'investor'
        WHERE bm.property_id = $1
        ORDER BY bm.match_score DESC
      `, [propId]);
    }

    if (jobId) {
      exportJobs.set(jobId, { status: 'processing', progress: 50 });
    }

    // Log export operation to export_logs table
    try {
      await query(
        'INSERT INTO export_logs (export_type, format, record_count) VALUES ($1, $2, $3)',
        [exportType, format, data.length]
      );
    } catch (err) {
      console.error('[ExportService] Error logging export:', err);
    }

    // 2. Generate the file buffer
    let buffer;
    if (format === 'csv') {
      buffer = await generateCSV(data);
    } else {
      buffer = await generateExcel(data);
    }

    if (jobId) {
      // Ensure the output directory exists
      const outputDir = path.join(process.cwd(), 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const fileName = `${jobId}.${format}`;
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, buffer);

      exportJobs.set(jobId, {
        status: 'completed',
        progress: 100,
        fileName: `${exportType}-${new Date().toISOString().slice(0, 10)}.${format}`,
        filePath
      });
      console.log(`[ExportService] Job ${jobId} completed. File written to: ${filePath}`);
    }

    return buffer;
  } catch (err) {
    console.error(`[ExportService] Job ${jobId} failed:`, err);
    if (jobId) {
      exportJobs.set(jobId, { status: 'failed', error: err.message });
    }
    throw err;
  }
}

async function generateCSV(data) {
  try {
    const { Parser } = await import('json2csv');
    const parser = new Parser();
    const csv = parser.parse(data);
    return Buffer.from(csv, 'utf-8');
  } catch (err) {
    console.warn('[ExportService] json2csv not available, using built-in CSV generator.', err.message);
    if (data.length === 0) return Buffer.from('', 'utf-8');
    
    const headers = Object.keys(data[0]);
    const escape = (val) => {
      if (val === null || val === undefined) return '';
      let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };
    
    const csvRows = [];
    csvRows.push(headers.map(escape).join(','));
    for (const row of data) {
      csvRows.push(headers.map(h => escape(row[h])).join(','));
    }
    return Buffer.from(csvRows.join('\n'), 'utf-8');
  }
}

async function generateExcel(data) {
  try {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    const worksheet = workbook.addWorksheet('Export');
    
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.columns = headers.map(h => ({ header: h, key: h }));
      worksheet.addRows(data);
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (err) {
    console.warn('[ExportService] exceljs not available, falling back to clean CSV representation.', err.message);
    return await generateCSV(data);
  }
}
