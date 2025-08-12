import Papa from 'papaparse';

const REQUIRED_HEADERS = ['id', 'title', 'sku'];
const NUMERIC_FIELDS = ['price', 'inventory_quantity', 'weight'];
const VALID_HEADERS = [
  'id', 'title', 'sku', 'price', 'inventory_quantity', 'weight',
  'barcode', 'compare_at_price', 'requires_shipping', 'taxable'
];

export class CSVValidationError extends Error {
  constructor(message, rowErrors = []) {
    super(message);
    this.name = 'CSVValidationError';
    this.rowErrors = rowErrors;
  }
}

export function validateCSVStructure(csvText) {
  const errors = [];
  
  if (!csvText || csvText.trim().length === 0) {
    throw new CSVValidationError('CSV file is empty');
  }

  const parseResult = Papa.parse(csvText, { 
    header: true, 
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase()
  });

  if (parseResult.errors.length > 0) {
    const parseErrors = parseResult.errors.map(err => 
      `Row ${err.row}: ${err.message}`
    );
    throw new CSVValidationError('CSV parsing failed', parseErrors);
  }

  const headers = parseResult.meta.fields || [];
  const data = parseResult.data;

  // Check required headers
  const missingHeaders = REQUIRED_HEADERS.filter(header => 
    !headers.includes(header)
  );
  
  if (missingHeaders.length > 0) {
    throw new CSVValidationError(
      `Missing required headers: ${missingHeaders.join(', ')}`
    );
  }

  // Check for unknown headers
  const unknownHeaders = headers.filter(header => 
    !VALID_HEADERS.includes(header)
  );
  
  if (unknownHeaders.length > 0) {
    errors.push(`Unknown headers (will be ignored): ${unknownHeaders.join(', ')}`);
  }

  // Validate data rows
  const rowErrors = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for header, +1 for 0-based index
    const rowIssues = [];

    // Check required fields
    if (!row.id || row.id.trim() === '') {
      rowIssues.push('Missing variant ID');
    } else if (!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(row.id.trim())) {
      rowIssues.push('Invalid variant ID format');
    }

    // Validate numeric fields
    NUMERIC_FIELDS.forEach(field => {
      if (row[field] !== undefined && row[field] !== '') {
        const value = parseFloat(row[field]);
        if (isNaN(value)) {
          rowIssues.push(`${field} must be a valid number`);
        } else if (field === 'price' && value < 0) {
          rowIssues.push('Price cannot be negative');
        } else if (field === 'weight' && value < 0) {
          rowIssues.push('Weight cannot be negative');
        } else if (field === 'inventory_quantity' && !Number.isInteger(value)) {
          rowIssues.push('Inventory quantity must be a whole number');
        }
      }
    });

    // Validate boolean fields
    ['requires_shipping', 'taxable'].forEach(field => {
      if (row[field] !== undefined && row[field] !== '') {
        const value = row[field].toString().toLowerCase();
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(value)) {
          rowIssues.push(`${field} must be true/false, yes/no, or 1/0`);
        }
      }
    });

    if (rowIssues.length > 0) {
      rowErrors.push({
        row: rowNumber,
        issues: rowIssues
      });
    }
  });

  return {
    isValid: rowErrors.length === 0,
    data: data,
    warnings: errors,
    rowErrors: rowErrors,
    summary: {
      totalRows: data.length,
      validRows: data.length - rowErrors.length,
      errorRows: rowErrors.length
    }
  };
}

export function sanitizeCSVData(data) {
  return data.map(row => {
    const sanitized = { ...row };
    
    // Normalize numeric fields
    NUMERIC_FIELDS.forEach(field => {
      if (sanitized[field] !== undefined && sanitized[field] !== '') {
        const value = parseFloat(sanitized[field]);
        if (!isNaN(value)) {
          if (field === 'price' || field === 'compare_at_price') {
            // Round to 2 decimal places for currency
            sanitized[field] = Math.round(value * 100) / 100;
          } else if (field === 'inventory_quantity') {
            // Ensure integer for inventory
            sanitized[field] = Math.floor(Math.abs(value));
          } else if (field === 'weight') {
            // Round to 3 decimal places for weight
            sanitized[field] = Math.round(Math.abs(value) * 1000) / 1000;
          }
        }
      }
    });

    // Normalize boolean fields
    ['requires_shipping', 'taxable'].forEach(field => {
      if (sanitized[field] !== undefined && sanitized[field] !== '') {
        const value = sanitized[field].toString().toLowerCase();
        sanitized[field] = ['true', '1', 'yes'].includes(value);
      }
    });

    // Trim string fields
    ['title', 'sku', 'barcode'].forEach(field => {
      if (typeof sanitized[field] === 'string') {
        sanitized[field] = sanitized[field].trim();
      }
    });

    return sanitized;
  });
}

export function generateValidationReport(validationResult) {
  const { isValid, warnings, rowErrors, summary } = validationResult;
  
  let report = `CSV Validation Report\n`;
  report += `=====================\n\n`;
  report += `Total Rows: ${summary.totalRows}\n`;
  report += `Valid Rows: ${summary.validRows}\n`;
  report += `Error Rows: ${summary.errorRows}\n\n`;

  if (warnings.length > 0) {
    report += `Warnings:\n`;
    warnings.forEach(warning => {
      report += `- ${warning}\n`;
    });
    report += `\n`;
  }

  if (rowErrors.length > 0) {
    report += `Row Errors:\n`;
    rowErrors.forEach(error => {
      report += `Row ${error.row}:\n`;
      error.issues.forEach(issue => {
        report += `  - ${issue}\n`;
      });
    });
  }

  if (isValid) {
    report += `✅ CSV is valid and ready for import\n`;
  } else {
    report += `❌ CSV has errors that must be fixed before import\n`;
  }

  return report;
}
