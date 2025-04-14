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
  
  // Required fields validation - based on user requirements
  const requiredFields = [
    { field: 'name', label: 'Name' },
    { field: 'recurrer_id', label: 'Recurrer ID' },
    { field: 'contact_email', label: 'Contact Email' },
    { field: 'contact_phone', label: 'Contact Phone' },
    { field: 'chargebee_customer_id', label: 'Chargebee Customer ID' },
    { field: 'chargebee_subscription_id', label: 'Chargebee Subscription ID' }
  ];
  
  requiredFields.forEach(({ field, label }) => {
    if (!record[field]) {
      errors.push({
        row: rowIndex,
        field,
        value: String(record[field] || ''),
        message: `${label} is required`
      });
    }
  });
  
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
  
  // Phone validation - basic check for non-empty value
  if (record.contact_phone && record.contact_phone.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'contact_phone',
      value: String(record.contact_phone),
      message: 'Invalid phone number format'
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
        
        // Check all required fields are present
        const requiredFields = ['name', 'recurrer_id', 'contact_email', 'contact_phone', 'chargebee_customer_id', 'chargebee_subscription_id'];
        const missingFields = requiredFields.filter(field => !record[field]);
        
        if (missingFields.length > 0) {
          errors.push(`Row ${record.row}: Missing required fields: ${missingFields.join(', ')}`);
          continue; // Skip records missing required fields
        }
        
        // Create a clean copy of the record with all fields from the export format
        const cleanRecord = {
          // Required fields (must be present in import)
          name: record.name, // Required field
          recurrer_id: record.recurrer_id, // Required field
          contact_email: record.contact_email, // Required field
          contact_phone: record.contact_phone, // Required field
          chargebee_customer_id: record.chargebee_customer_id, // Required field
          chargebee_subscription_id: record.chargebee_subscription_id, // Required field
          
          // All fields from user-defined export format
          reelo_id: record.reelo_id || null,
          active_stores: typeof record.active_stores === 'number' ? record.active_stores : null,
          contact_name: record.contact_name || null,
          arr: typeof record.arr === 'number' ? record.arr : null,
          mrr: typeof record.mrr === 'number' ? record.mrr : null,
          assigned_csm: typeof record.assigned_csm === 'number' ? record.assigned_csm : null,
          currency_code: record.currency_code || null,
          growth_subscription_count: typeof record.growth_subscription_count === 'number' ? record.growth_subscription_count : null,
          health_status: record.health_status || null,
          industry: record.industry || null,
          bills_received_last_30_days: typeof record.bills_received_last_30_days === 'number' ? record.bills_received_last_30_days : null,
          campaigns_sent_last_90_days: typeof record.campaigns_sent_last_90_days === 'number' ? record.campaigns_sent_last_90_days : null,
          customers_acquired_last_30_days: typeof record.customers_acquired_last_30_days === 'number' ? record.customers_acquired_last_30_days : null,
          customers_with_min_one_visit: typeof record.customers_with_min_one_visit === 'number' ? record.customers_with_min_one_visit : null,
          customers_with_min_two_visit: typeof record.customers_with_min_two_visit === 'number' ? record.customers_with_min_two_visit : null,
          customers_without_min_visits: typeof record.customers_without_min_visits === 'number' ? record.customers_without_min_visits : null,
          enableRLS: record.enableRLS || null,
          less_than_300_bills: typeof record.less_than_300_bills === 'number' ? record.less_than_300_bills : null,
          logo_url: record.logo_url || null,
          loyalty_active_channels: record.loyalty_active_channels || null,
          loyalty_active_store_count: typeof record.loyalty_active_store_count === 'number' ? record.loyalty_active_store_count : null,
          loyalty_channel_credits: typeof record.loyalty_channel_credits === 'number' ? record.loyalty_channel_credits : null,
          loyalty_inactive_store_count: typeof record.loyalty_inactive_store_count === 'number' ? record.loyalty_inactive_store_count : null,
          loyalty_reward: record.loyalty_reward || null,
          loyalty_type: record.loyalty_type || null,
          mysql_company_id: record.mysql_company_id || null,
          negative_feedback_alert_inactive: typeof record.negative_feedback_alert_inactive === 'number' ? record.negative_feedback_alert_inactive : null,
          negative_feedbacks_count: typeof record.negative_feedbacks_count === 'number' ? record.negative_feedbacks_count : null,
          onboarded_at: record.onboarded_at instanceof Date ? record.onboarded_at : null,
          percentage_of_inactive_customers: typeof record.percentage_of_inactive_customers === 'number' ? record.percentage_of_inactive_customers : null,
          renewal_date: record.renewal_date instanceof Date ? record.renewal_date : null,
          revenue_1_year: typeof record.revenue_1_year === 'number' ? record.revenue_1_year : null,
          unique_customers_captured: typeof record.unique_customers_captured === 'number' ? record.unique_customers_captured : null
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
    // Define the fields in the exact order we want them (must match export format)
    const requiredFields = [
      'name',
      'recurrer_id',
      'reelo_id',
      'active_stores',
      'contact_name',
      'contact_phone',
      'contact_email',
      'chargebee_customer_id',
      'chargebee_subscription_id',
      'arr',
      'mrr',
      'assigned_csm',
      'currency_code',
      'growth_subscription_count',
      'health_status',
      'industry',
      'bills_received_last_30_days',
      'campaigns_sent_last_90_days',
      'customers_acquired_last_30_days',
      'customers_with_min_one_visit',
      'customers_with_min_two_visit',
      'customers_without_min_visits',
      'enableRLS',
      'less_than_300_bills',
      'logo_url',
      'loyalty_active_channels',
      'loyalty_active_store_count',
      'loyalty_channel_credits',
      'loyalty_inactive_store_count',
      'loyalty_reward',
      'loyalty_type',
      'mysql_company_id',
      'negative_feedback_alert_inactive',
      'negative_feedbacks_count',
      'onboarded_at',
      'percentage_of_inactive_customers',
      'renewal_date',
      'revenue_1_year',
      'unique_customers_captured'
    ];
    
    // Create CSV header row from fields
    const headerRow = requiredFields.join(',');
    
    // Create a mapping object with field examples - including all required and optional fields
    const fieldExamples: Record<string, string[]> = {
      // Required fields
      name: ['Acme Industries', 'Beta Solutions', 'Gamma Foods'],
      recurrer_id: ['rec_123456', 'rec_234567', 'rec_345678'],  // Include sample IDs for clarity
      contact_email: ['john@acme.com', 'sarah@beta.com', 'raj@gammafoods.com'],
      contact_phone: ['+91 9876543210', '+91 8765432109', '+91 7654321098'],
      chargebee_customer_id: ['cb_cust_123', 'cb_cust_456', 'cb_cust_789'], 
      chargebee_subscription_id: ['cb_sub_123', 'cb_sub_456', 'cb_sub_789'],
      
      // All other fields based on user requirements
      reelo_id: ['618cece4633e300aa89bfba0', '626fc380ad1e9d301415d090', '62e23515db2250adbfa5a80b'],
      active_stores: ['12', '5', '8'],
      contact_name: ['John Smith', 'Sarah Lee', 'Raj Kumar'],
      arr: ['648000', '300000', '216000'],
      mrr: ['54000', '25000', '18000'],
      assigned_csm: ['1', '2', '1'],
      currency_code: ['INR', 'USD', 'INR'],
      growth_subscription_count: ['2', '1', '3'],
      health_status: ['healthy', 'at_risk', 'healthy'],
      industry: ['Manufacturing', 'Technology', 'Food & Beverage'],
      bills_received_last_30_days: ['452', '215', '378'],
      campaigns_sent_last_90_days: ['12', '5', '8'],
      customers_acquired_last_30_days: ['45', '22', '37'],
      customers_with_min_one_visit: ['320', '180', '250'],
      customers_with_min_two_visit: ['210', '120', '175'],
      customers_without_min_visits: ['110', '60', '75'],
      enableRLS: ['true', 'false', 'true'],
      less_than_300_bills: ['0', '1', '0'],
      logo_url: ['https://example.com/logo1.png', 'https://example.com/logo2.png', 'https://example.com/logo3.png'],
      loyalty_active_channels: ['sms,email,whatsapp', 'email', 'sms,email'],
      loyalty_active_store_count: ['10', '4', '7'],
      loyalty_channel_credits: ['5000', '2000', '3500'],
      loyalty_inactive_store_count: ['2', '1', '1'],
      loyalty_reward: ['tier1', 'tier2', 'tier1'],
      loyalty_type: ['points', 'visits', 'points'],
      mysql_company_id: ['mysql_123', 'mysql_456', 'mysql_789'],
      negative_feedback_alert_inactive: ['0', '1', '0'],
      negative_feedbacks_count: ['2', '5', '1'],
      onboarded_at: ['2023-01-15', '2023-03-22', '2023-02-10'],
      percentage_of_inactive_customers: ['25.5', '32.7', '18.2'],
      renewal_date: ['2025-12-15', '2025-06-30', '2025-09-10'],
      revenue_1_year: ['7500000', '3200000', '5100000'],
      unique_customers_captured: ['4500', '2200', '3800']
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
  
  // Field mappings for case-insensitive matching and aliases - must match export fields
  const fieldMappings: Record<string, string> = {
    // Standard fields
    'name': 'name',
    'company name': 'name',
    'recurrer_id': 'recurrer_id',
    
    // All fields from the customer data model (based on user's request)
    'reelo_id': 'reelo_id',
    'active_stores': 'active_stores',
    'contact_name': 'contact_name',
    'contact_phone': 'contact_phone',
    'contact_email': 'contact_email',
    'chargebee_customer_id': 'chargebee_customer_id',
    'chargebee_subscription_id': 'chargebee_subscription_id',
    'arr': 'arr',
    'mrr': 'mrr',
    'assigned_csm': 'assigned_csm',
    'csm_id': 'assigned_csm',  // Map to internal field
    'currency_code': 'currency_code', 
    'growth_subscription_count': 'growth_subscription_count',
    'health_status': 'health_status',
    'health status': 'health_status',
    'industry': 'industry',
    'bills_received_last_30_days': 'bills_received_last_30_days',
    'campaigns_sent_last_90_days': 'campaigns_sent_last_90_days',
    'customers_acquired_last_30_days': 'customers_acquired_last_30_days',
    'customers_with_min_one_visit': 'customers_with_min_one_visit',
    'customers_with_min_two_visit': 'customers_with_min_two_visit',
    'customers_without_min_visits': 'customers_without_min_visits',
    'enableRLS': 'enableRLS',
    'less_than_300_bills': 'less_than_300_bills',
    'logo_url': 'logo_url',
    'loyalty_active_channels': 'loyalty_active_channels',
    'loyalty_active_store_count': 'loyalty_active_store_count',
    'loyalty_channel_credits': 'loyalty_channel_credits',
    'loyalty_inactive_store_count': 'loyalty_inactive_store_count',
    'loyalty_reward': 'loyalty_reward',
    'loyalty_type': 'loyalty_type',
    'mysql_company_id': 'mysql_company_id',
    'negative_feedback_alert_inactive': 'negative_feedback_alert_inactive',
    'negative_feedbacks_count': 'negative_feedbacks_count',
    'onboarded_at': 'onboarded_at',
    'percentage_of_inactive_customers': 'percentage_of_inactive_customers',
    'renewal_date': 'renewal_date',
    'revenue_1_year': 'revenue_1_year',
    'unique_customers_captured': 'unique_customers_captured'
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
    
    // Ensure recurrer_id exists - either use the provided one or generate a new one
    if (!record.recurrer_id) {
      record.recurrer_id = `rec_${randomUUID().replace(/-/g, '')}`;
      // Add a note that this ID was auto-generated
      validationErrors.push({
        row: i,
        field: 'recurrer_id',
        value: record.recurrer_id,
        message: 'Recurrer ID was auto-generated for this record'
      });
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
// Helper function to get field requirements info
const getFieldRequirements = () => {
  return {
    required_fields: [
      { field: 'name', description: 'Company or customer name' },
      { field: 'recurrer_id', description: 'Unique identifier for the customer in Recurrer (will be auto-generated if missing)' },
      { field: 'contact_email', description: 'Primary contact email address' },
      { field: 'contact_phone', description: 'Primary contact phone number' },
      { field: 'chargebee_customer_id', description: 'Chargebee customer identifier' },
      { field: 'chargebee_subscription_id', description: 'Chargebee subscription identifier' }
    ],
    optional_fields: [
      // Core customer info
      { field: 'reelo_id', description: 'Reelo system identifier' },
      { field: 'industry', description: 'Customer industry or sector' },
      { field: 'contact_name', description: 'Primary contact person name' },
      { field: 'assigned_csm', description: 'ID of assigned Customer Success Manager' },
      
      // Financial data
      { field: 'mrr', description: 'Monthly Recurring Revenue (numeric)' },
      { field: 'arr', description: 'Annual Recurring Revenue (numeric)' },
      { field: 'currency_code', description: 'Currency code (e.g., USD, INR)' },
      { field: 'renewal_date', description: 'Next renewal date (YYYY-MM-DD)' },
      { field: 'revenue_1_year', description: 'Total revenue over the past year' },
      
      // Health & status
      { field: 'health_status', description: 'Customer health (healthy, at_risk, red_zone)' },
      { field: 'onboarded_at', description: 'Date customer completed onboarding (YYYY-MM-DD)' },
      
      // Store data
      { field: 'active_stores', description: 'Number of active store locations' },
      { field: 'growth_subscription_count', description: 'Number of growth subscriptions' },
      
      // Loyalty program data
      { field: 'loyalty_active_store_count', description: 'Number of stores with active loyalty programs' },
      { field: 'loyalty_inactive_store_count', description: 'Number of stores with inactive loyalty programs' },
      { field: 'loyalty_active_channels', description: 'Active communication channels for loyalty program' },
      { field: 'loyalty_channel_credits', description: 'Channel credits for loyalty program' },
      { field: 'loyalty_type', description: 'Type of loyalty program' },
      { field: 'loyalty_reward', description: 'Reward tier for loyalty program' },
      
      // Customer metrics
      { field: 'bills_received_last_30_days', description: 'Number of bills received in the last 30 days' },
      { field: 'campaigns_sent_last_90_days', description: 'Number of campaigns sent in the last 90 days' },
      { field: 'customers_acquired_last_30_days', description: 'Number of new customers acquired in the last 30 days' },
      { field: 'customers_with_min_one_visit', description: 'Number of customers with at least one visit' },
      { field: 'customers_with_min_two_visit', description: 'Number of customers with at least two visits' },
      { field: 'customers_without_min_visits', description: 'Number of customers without minimum visits' },
      { field: 'unique_customers_captured', description: 'Total number of unique customers captured' },
      { field: 'percentage_of_inactive_customers', description: 'Percentage of inactive customers' },
      
      // Feedback & alerts
      { field: 'negative_feedback_alert_inactive', description: 'Number of inactive negative feedback alerts' },
      { field: 'negative_feedbacks_count', description: 'Total count of negative feedback received' },
      { field: 'less_than_300_bills', description: 'Flag if customer has less than 300 bills (1=yes, 0=no)' },
      
      // System data
      { field: 'enableRLS', description: 'Enable row-level security (true/false)' },
      { field: 'mysql_company_id', description: 'MySQL database company identifier' },
      { field: 'logo_url', description: 'URL to customer logo image' }
    ],
    file_format: 'CSV with header row containing field names'
  };
};

export const previewCSVImport = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded',
        field_requirements: getFieldRequirements() // Include field requirements even on error
      });
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
    
    // Return preview results with field requirements
    res.json({
      success: true,
      preview: {
        total: result.records.length,
        new: result.new.length,
        updated: result.updated.length,
        sample: result.records.slice(0, 10), // First 10 records as preview
        validation_errors: result.validationErrors
      },
      field_requirements: getFieldRequirements() // Include field requirements in response
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
    
    // Define fields in the exact order we want them (must match sample file and user requirements)
    const requiredFields = [
      'name',
      'recurrer_id',
      'reelo_id',
      'active_stores',
      'contact_name',
      'contact_phone',
      'contact_email',
      'chargebee_customer_id',
      'chargebee_subscription_id',
      'arr',
      'mrr',
      'assigned_csm',
      'currency_code',
      'growth_subscription_count',
      'health_status',
      'industry',
      'bills_received_last_30_days',
      'campaigns_sent_last_90_days',
      'customers_acquired_last_30_days',
      'customers_with_min_one_visit',
      'customers_with_min_two_visit',
      'customers_without_min_visits',
      'enableRLS',
      'less_than_300_bills',
      'logo_url',
      'loyalty_active_channels',
      'loyalty_active_store_count',
      'loyalty_channel_credits',
      'loyalty_inactive_store_count',
      'loyalty_reward',
      'loyalty_type',
      'mysql_company_id',
      'negative_feedback_alert_inactive',
      'negative_feedbacks_count',
      'onboarded_at',
      'percentage_of_inactive_customers',
      'renewal_date',
      'revenue_1_year',
      'unique_customers_captured'
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