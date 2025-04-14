import { Request, Response } from 'express';
import { db } from './db';
import { customers, accountHealthEnum } from '@shared/schema';
import { log } from './vite';
import { randomUUID } from 'crypto';
import { storage } from './storage';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Define error types for better error reporting
type ValidationError = {
  row: number;
  field: string;
  value: string;
  message: string;
};

// Helper function to sanitize input values
const sanitizeValue = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value === '' || value.toLowerCase() === 'null') {
    return null;
  }
  return value.trim();
};

// More robust type conversion and validation
const convertValueType = (field: string, value: string | null): any => {
  if (value === null) return null;
  
  // Integer fields
  if (['id', 'mrr', 'arr', 'assigned_csm', 'active_stores', 'growth_subscription_count', 
       'loyalty_active_store_count', 'loyalty_inactive_store_count', 'loyalty_channel_credits',
       'negative_feedback_alert_inactive', 'less_than_300_bills', 'wa_header_active', 
       'active_auto_campaigns_count', 'unique_customers_captured', 'total_revenue_last_1_year_per_growth_subscription_per_month',
       'revenue_1_year', 'customers_with_min_one_visit', 'customers_with_min_two_visit', 'aov',
       'customers_profiled_with_birthday', 'customers_profiled_with_anniversary', 'next_month_birthdays',
       'next_month_anniversaries', 'customers_without_min_visits', 'percentage_of_inactive_customers',
       'negative_feedbacks_count', 'campaigns_sent_last_90_days', 'bills_received_last_30_days',
       'customers_acquired_last_30_days'].includes(field)) {
    // Make sure we have a valid number format
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      return null;
    }
    return parsed;
  }
  
  // Decimal/float fields
  if (['percentage_of_inactive_customers'].includes(field)) {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return null;
    }
    return parsed;
  }
  
  // Date fields
  if (['onboarded_at', 'renewal_date', 'updated_from_mysql_at'].includes(field)) {
    try {
      const date = new Date(value);
      // Validate that it's a proper date
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch (e) {
      return null;
    }
  }
  
  // Enum fields
  if (field === 'health_status' && value) {
    if (['healthy', 'at_risk', 'red_zone'].includes(value.toLowerCase())) {
      return value.toLowerCase();
    }
    return 'healthy'; // Default to healthy if invalid
  }
  
  // Email validation for contact_email
  if (field === 'contact_email' && value) {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return null;
    }
  }
  
  // Return as string for all other fields
  return value;
};

// Validate a record and return any validation errors
const validateRecord = (record: Record<string, any>, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Required field validation
  if (!record.name) {
    errors.push({
      row: rowIndex,
      field: 'name',
      value: String(record.name || ''),
      message: 'Name is required'
    });
  }
  
  // Numeric fields validation
  ['mrr', 'arr'].forEach(field => {
    const value = record[field];
    if (value !== null && value !== undefined && isNaN(Number(value))) {
      errors.push({
        row: rowIndex,
        field,
        value: String(value),
        message: `${field.toUpperCase()} must be a number`
      });
    }
  });
  
  // Email validation
  if (record.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.contact_email)) {
    errors.push({
      row: rowIndex,
      field: 'contact_email',
      value: String(record.contact_email),
      message: 'Invalid email format'
    });
  }
  
  // Health status validation
  if (record.health_status && !['healthy', 'at_risk', 'red_zone'].includes(record.health_status)) {
    errors.push({
      row: rowIndex,
      field: 'health_status',
      value: String(record.health_status),
      message: 'Health status must be one of: healthy, at_risk, red_zone'
    });
  }
  
  // Date validation for renewal_date and onboarded_at
  ['renewal_date', 'onboarded_at'].forEach(field => {
    if (record[field]) {
      try {
        const date = new Date(record[field]);
        if (isNaN(date.getTime())) {
          errors.push({
            row: rowIndex,
            field,
            value: String(record[field]),
            message: `Invalid date format for ${field}`
          });
        }
      } catch (e) {
        errors.push({
          row: rowIndex,
          field,
          value: String(record[field]),
          message: `Invalid date format for ${field}`
        });
      }
    }
  });
  
  return errors;
};

// Configure multer for file uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Process and import CSV data
export const importCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Read CSV file
    const csvContent = req.file.buffer.toString('utf8');
    
    // Get existing customers for recurrer_id comparison
    const allCustomers = await storage.getCustomers();
    const customersByRecurrerId: Record<string, any> = {};
    allCustomers.forEach((customer: any) => {
      if (customer.recurrer_id) {
        customersByRecurrerId[customer.recurrer_id] = customer;
      }
    });
    
    // Process CSV content
    const result = processCSV(csvContent, customersByRecurrerId);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error || 'Failed to process CSV' 
      });
    }
    
    // Only display the most important errors in the response
    const errors: string[] = [];
    if (result.validationErrors && result.validationErrors.length > 0) {
      result.validationErrors.forEach(err => {
        errors.push(`Row ${err.row}: ${err.message} (${err.field}: ${err.value})`);
      });
    }
    
    // Import records into database
    const importedRecords: any[] = [];
    const updatedRecords: any[] = [];
    
    for (const record of result.records) {
      try {
        // Check if record has validation errors
        const hasErrors = result.validationErrors ? result.validationErrors.some(err => 
          err.row === record.row && err.field !== 'format'
        ) : false;
        
        if (hasErrors) {
          continue; // Skip records with validation errors
        }
        
        // Make sure the record has a required name field
        if (!record.name || typeof record.name !== 'string') {
          continue; // Skip records without name
        }
        
        // Create a clean copy of the record without extra properties
        const cleanRecord = {
          name: record.name, // Ensure the required field is always present
          recurrer_id: record.recurrer_id || null,
          industry: record.industry || null,
          logo_url: record.logo_url || null,
          contact_name: record.contact_name || null,
          contact_email: record.contact_email || null,
          contact_phone: record.contact_phone || null,
          assigned_csm: typeof record.assigned_csm === 'number' ? record.assigned_csm : null,
          health_status: record.health_status || null,
          mrr: typeof record.mrr === 'number' ? record.mrr : null,
          arr: typeof record.arr === 'number' ? record.arr : null,
          currency_code: record.currency_code || null,
          renewal_date: record.renewal_date instanceof Date ? record.renewal_date : null,
          onboarded_at: record.onboarded_at instanceof Date ? record.onboarded_at : null,
          chargebee_customer_id: record.chargebee_customer_id || null,
          chargebee_subscription_id: record.chargebee_subscription_id || null,
          mysql_company_id: record.mysql_company_id || null,
          active_stores: typeof record.active_stores === 'number' ? record.active_stores : null,
          growth_subscription_count: typeof record.growth_subscription_count === 'number' ? record.growth_subscription_count : null,
          loyalty_active_store_count: typeof record.loyalty_active_store_count === 'number' ? record.loyalty_active_store_count : null,
          loyalty_inactive_store_count: typeof record.loyalty_inactive_store_count === 'number' ? record.loyalty_inactive_store_count : null,
          loyalty_active_channels: record.loyalty_active_channels || null,
          loyalty_channel_credits: typeof record.loyalty_channel_credits === 'number' ? record.loyalty_channel_credits : null,
          loyalty_type: record.loyalty_type || null,
          loyalty_reward: record.loyalty_reward || null
        };
        
        const existingCustomer = customersByRecurrerId[record.recurrer_id];
        
        if (existingCustomer) {
          // Update existing customer
          await storage.updateCustomer(existingCustomer.id, cleanRecord);
          updatedRecords.push(record);
        } else {
          // Create new customer
          const newCustomer = await storage.createCustomer(cleanRecord);
          importedRecords.push(newCustomer);
        }
      } catch (error: any) {
        errors.push(`Row error: ${error.message}`);
      }
    }
    
    // Return response with import results
    res.json({
      success: true,
      count: importedRecords.length + updatedRecords.length,
      new: importedRecords.length,
      updated: updatedRecords.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error: any) {
    log(`CSV import error: ${error}`, 'error');
    res.status(500).json({ success: false, error: `Failed to import CSV: ${error.message}` });
  }
};

// Generate and download sample CSV file with all customer fields
export const downloadSampleCSV = async (req: Request, res: Response) => {
  try {
    // Define the required fields in the exact order we want them
    const requiredFields = [
      'name',
      'recurrer_id',
      'industry',
      'contact_name',
      'contact_email',
      'contact_phone',
      'csm_id',
      'chargebee_customer_id',
      'chargebee_subscription_id',
      'health_status',
      'mrr',
      'arr',
      'renewal_date',
      'onboarding_stage',
      'timezone',
      'tags',
      'notes'
    ];
    
    // Create CSV header row from fields
    const headerRow = requiredFields.join(',');
    
    // Create a mapping object with field examples - all with required fields
    const fieldExamples: Record<string, string[]> = {
      name: ['Acme Industries', 'Beta Solutions', 'Gamma Foods'],
      recurrer_id: ['rec_123456', 'rec_234567', 'rec_345678'],  // Include sample IDs for clarity
      industry: ['Manufacturing', 'Technology', 'Food & Beverage'],
      contact_name: ['John Smith', 'Sarah Lee', 'Raj Kumar'],
      contact_email: ['john@acme.com', 'sarah@beta.com', 'raj@gammafoods.com'],
      contact_phone: ['+91 9876543210', '+91 8765432109', '+91 7654321098'],
      csm_id: ['1', '2', '1'],
      chargebee_customer_id: ['cb_cust_123', 'cb_cust_456', 'cb_cust_789'], // Required field
      chargebee_subscription_id: ['cb_sub_123', 'cb_sub_456', 'cb_sub_789'], // Required field
      health_status: ['healthy', 'at_risk', 'healthy'],
      mrr: ['54000', '25000', '18000'],
      arr: ['648000', '300000', '216000'],
      renewal_date: ['2025-12-15', '2025-06-30', '2025-09-10'],
      onboarding_stage: ['completed', 'in_progress', 'completed'],
      timezone: ['Asia/Kolkata', 'Asia/Kolkata', 'Asia/Kolkata'],
      tags: ['"enterprise,manufacturing"', '"tech,startup"', '"food,retail"'],
      notes: ['Enterprise customer with 50+ locations', 'Needs attention for onboarding completion', 'Multiple locations in South India']
    };
    
    // Create sample data rows
    const sampleRows = Array(3).fill(null).map((_, i) => {
      return requiredFields.map(field => {
        if (fieldExamples[field] && fieldExamples[field][i]) {
          // Handle fields that might need quoting due to commas
          if (field === 'tags' || field === 'notes') {
            return `"${fieldExamples[field][i].replace(/^"|"$/g, '')}"`;
          }
          return fieldExamples[field][i];
        }
        // Default empty for fields not in the example mapping
        return '';
      }).join(',');
    });
    
    // Combine header and sample rows
    const csvContent = [headerRow, ...sampleRows].join('\n');
    
    // Write to public directory
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const publicDir = path.join(__dirname, '..', 'public', 'sample');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    const filePath = path.join(publicDir, 'customer-import-sample.csv');
    fs.writeFileSync(filePath, csvContent);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customer-import-sample.csv');
    res.send(csvContent);
    
  } catch (error: any) {
    log(`Error creating sample CSV: ${error}`, 'error');
    res.status(500).json({ success: false, error: `Failed to create sample CSV: ${error.message}` });
  }
};

// Download current customer data as CSV for updates
// Helper function to process CSV content and return records and errors
export const processCSV = (csvContent: string, existingCustomers: Record<string, any> = {}) => {
  const rows = csvContent.split('\n');
  
  if (rows.length < 2) {
    return {
      success: false,
      error: 'CSV file must contain at least a header row and one data row',
      records: [],
      validationErrors: [],
      new: [],
      updated: []
    };
  }
  
  // Get headers from first row
  const headers = rows[0].split(',').map(h => h.trim());
  
  // Field mappings for case-insensitive matching and aliases
  const fieldMappings: Record<string, string> = {
    // Standard fields
    'name': 'name',
    'company name': 'name',
    'recurrer_id': 'recurrer_id',
    'industry': 'industry',
    'logo_url': 'logo_url',
    'contact_name': 'contact_name',
    'contact_email': 'contact_email',
    'contact_phone': 'contact_phone',
    'assigned_csm': 'assigned_csm',
    'csm_id': 'assigned_csm',
    'health_status': 'health_status',
    'health status': 'health_status',
    'mrr': 'mrr',
    'arr': 'arr',
    'currency_code': 'currency_code',
    'renewal_date': 'renewal_date',
    'onboarded_at': 'onboarded_at',
    
    // External IDs
    'chargebee_customer_id': 'chargebee_customer_id',
    'chargebee_subscription_id': 'chargebee_subscription_id',
    'mysql_company_id': 'mysql_company_id',
    
    // MySQL company fields
    'active_stores': 'active_stores',
    'growth_subscription_count': 'growth_subscription_count',
    'loyalty_active_store_count': 'loyalty_active_store_count',
    'loyalty_inactive_store_count': 'loyalty_inactive_store_count',
    'loyalty_active_channels': 'loyalty_active_channels',
    'loyalty_channel_credits': 'loyalty_channel_credits',
    'loyalty_type': 'loyalty_type', 
    'loyalty_reward': 'loyalty_reward',
  };
  
  // Process each row
  const records: Record<string, any>[] = [];
  const validationErrors: ValidationError[] = [];
  const newRecords: Record<string, any>[] = [];
  const updatedRecords: Record<string, any>[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue; // Skip empty rows
    
    // Handle quoted values in CSV correctly
    let inQuote = false;
    let currentValue = '';
    const values: string[] = [];
    const rowStr = rows[i] + ',';  // Add trailing comma to simplify parsing
    
    for (let j = 0; j < rowStr.length; j++) {
      const char = rowStr[j];
      
      if (char === '"' && (j === 0 || rowStr[j-1] !== '\\')) {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    if (values.length !== headers.length) {
      validationErrors.push({
        row: i,
        field: 'format',
        value: `columns: ${values.length}`,
        message: `Column count mismatch (expected ${headers.length}, got ${values.length})`
      });
      continue;
    }
    
    // Create record object with normalized field names
    const record: Record<string, any> = {};
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      const mappedField = fieldMappings[normalizedHeader] || normalizedHeader;
      record[mappedField] = sanitizeValue(values[index]);
    });
    
    // Generate recurrer_id if not present
    if (!record.recurrer_id) {
      record.recurrer_id = `rec_${randomUUID().replace(/-/g, '')}`;
    }
    
    // Convert values to appropriate types
    const convertedRecord: Record<string, any> = {};
    Object.keys(record).forEach(key => {
      convertedRecord[key] = convertValueType(key, record[key]);
    });
    
    // Make sure the record has a name field (required by the schema)
    if (!convertedRecord.name) {
      if (record.company_name) {
        convertedRecord.name = record.company_name;
      } else {
        convertedRecord.name = `Customer-${i}`;
      }
    }
    
    // Add row number for reference in validations
    convertedRecord.row = i;
    
    // Run validation on the record
    const recordErrors = validateRecord(convertedRecord, i);
    if (recordErrors.length > 0) {
      validationErrors.push(...recordErrors);
    }
    
    // Check if this is an update or a new record
    const isExisting = existingCustomers[convertedRecord.recurrer_id];
    if (isExisting) {
      updatedRecords.push({
        ...convertedRecord,
        id: isExisting.id,
        is_update: true
      });
    } else {
      newRecords.push({
        ...convertedRecord,
        is_new: true
      });
    }
    
    records.push(convertedRecord);
  }
  
  return {
    success: true,
    records,
    validationErrors,
    new: newRecords,
    updated: updatedRecords
  };
};

// Preview CSV import without committing to database
export const previewCSVImport = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Read CSV file
    const csvContent = req.file.buffer.toString('utf8');
    
    // Get existing customers for recurrer_id comparison
    const allCustomers = await storage.getCustomers();
    const customersByRecurrerId: Record<string, any> = {};
    allCustomers.forEach((customer: any) => {
      if (customer.recurrer_id) {
        customersByRecurrerId[customer.recurrer_id] = customer;
      }
    });
    
    // Process CSV content
    const result = processCSV(csvContent, customersByRecurrerId);
    
    // Return preview results
    res.json({
      success: true,
      preview: {
        total: result.records.length,
        new: result.new.length,
        updated: result.updated.length,
        sample: result.records.slice(0, 10), // First 10 records as preview
        validation_errors: result.validationErrors
      }
    });
    
  } catch (error: any) {
    log(`CSV preview error: ${error}`, 'error');
    res.status(500).json({ success: false, error: `Failed to preview CSV: ${error.message}` });
  }
};

export const exportCustomersCSV = async (req: Request, res: Response) => {
  try {
    // Get all customers
    const allCustomers = await storage.getCustomers();
    
    // Define required fields in the exact order we want them (must match sample file)
    const requiredFields = [
      'name',
      'recurrer_id',
      'industry',
      'contact_name',
      'contact_email',
      'contact_phone',
      'csm_id',
      'chargebee_customer_id',
      'chargebee_subscription_id',
      'health_status',
      'mrr',
      'arr',
      'renewal_date',
      'onboarding_stage',
      'timezone',
      'tags',
      'notes'
    ];
    
    // Create a mapping for field names from database to export (handle field name differences)
    const fieldMappings: Record<string, string> = {
      'assigned_csm': 'csm_id',
      // Add more mappings as needed
    };
    
    // Create CSV header row
    const headerRow = requiredFields.join(',');
    
    // Create a row for each customer
    const customerRows = allCustomers.map(customer => {
      return requiredFields.map(field => {
        // Map field names if needed
        const dbField = fieldMappings[field] || field;
        
        // Get the value from the customer record
        const value = customer[dbField as keyof typeof customer]; // Type assertion for TypeScript
        
        // Handle different value types
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object' && value instanceof Date) {
          return value.toISOString().split('T')[0]; // YYYY-MM-DD format
        } else if (Array.isArray(value)) {
          return `"${value.join(',')}"`;  // Convert arrays to comma-delimited strings and quote them
        } else {
          // Clean strings and surround with quotes if they contain commas
          const strValue = String(value);
          if (strValue.includes(',')) {
            return `"${strValue}"`;
          }
          return strValue;
        }
      }).join(',');
    });
    
    // Combine header and customer rows
    const csvContent = [headerRow, ...customerRows].join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers-export.csv');
    
    // Send the CSV content
    res.send(csvContent);
    
  } catch (error: any) {
    log(`Error exporting customers: ${error}`, 'error');
    res.status(500).json({ success: false, error: `Failed to export customers: ${error.message}` });
  }
};