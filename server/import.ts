import { Request, Response } from 'express';
import { db } from './db';
import { customers } from '@shared/schema';
import { log } from './vite';
import { randomUUID } from 'crypto';
import { storage } from './storage';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Helper function to sanitize input values
const sanitizeValue = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value === '' || value.toLowerCase() === 'null') {
    return null;
  }
  return value.trim();
};

// Convert string to proper type based on field name
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
    return parseInt(value) || null;
  }
  
  // Date fields
  if (['onboarded_at', 'renewal_date', 'updated_from_mysql_at'].includes(field)) {
    try {
      return new Date(value);
    } catch (e) {
      return null;
    }
  }
  
  // Return as string for all other fields
  return value;
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
    
    // Read and parse CSV file
    const csvContent = req.file.buffer.toString('utf8');
    const rows = csvContent.split('\n');
    
    if (rows.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV file must contain at least a header row and one data row' });
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
    const importedRecords = [];
    const errors = [];
    const updatedRecords = [];
    
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue; // Skip empty rows
      
      const values = rows[i].split(',');
      if (values.length !== headers.length) {
        errors.push(`Row ${i}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
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
      
      // Special handling for health_status enum
      if (convertedRecord.health_status) {
        // Ensure it's one of: 'healthy', 'at_risk', 'red_zone'
        if (!['healthy', 'at_risk', 'red_zone'].includes(convertedRecord.health_status)) {
          convertedRecord.health_status = 'healthy'; // Default to healthy if invalid
        }
      }
      
      // Make sure the record has a name field (required by the schema)
      if (!convertedRecord.name) {
        if (record.company_name) {
          convertedRecord.name = record.company_name;
        } else {
          convertedRecord.name = `Customer-${i}`;
        }
      }

      // Check if this is an update (by recurrer_id) or a new record
      try {
        const existingCustomer = await storage.getCustomerByRecurrerId(convertedRecord.recurrer_id);
        
        if (existingCustomer) {
          // Update existing customer
          await storage.updateCustomer(existingCustomer.id, convertedRecord);
          updatedRecords.push(convertedRecord);
        } else {
          // Create new customer
          const newCustomer = await storage.createCustomer(convertedRecord);
          importedRecords.push(newCustomer);
        }
      } catch (error: any) {
        errors.push(`Row ${i}: ${error.message}`);
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
    // Get all customer fields from storage
    const customerFields = await storage.getCustomerTableFields();
    
    // Filter out specific fields we don't want in the CSV
    const fieldsToExclude = ['id', 'created_at', 'updated_from_mysql_at'];
    const filteredFields = customerFields
      .filter(field => !fieldsToExclude.includes(field))
      .sort(); // Sort fields alphabetically for better organization
    
    // Add 'name' field at the beginning as it's required
    if (!filteredFields.includes('name')) {
      filteredFields.unshift('name');
    } else {
      // Remove and reinsert name at the beginning
      filteredFields.splice(filteredFields.indexOf('name'), 1);
      filteredFields.unshift('name');
    }
    
    // Add recurrer_id as the second field for clarity
    if (filteredFields.includes('recurrer_id')) {
      filteredFields.splice(filteredFields.indexOf('recurrer_id'), 1);
      filteredFields.splice(1, 0, 'recurrer_id');
    }
    
    // Create CSV header row from fields
    const headerRow = filteredFields.join(',');
    
    // Create a mapping object with field examples
    const fieldExamples: Record<string, string[]> = {
      name: ['Acme Tech Solutions', 'Gamma Retail', 'Beta Manufacturing'],
      recurrer_id: ['', '', ''],  // Empty to demonstrate auto-generation
      industry: ['Technology', 'Retail', 'Manufacturing'],
      contact_name: ['John Smith', 'Sarah Lee', 'Raj Kumar'],
      contact_email: ['john@acmetech.com', 'sarah@gammaretail.com', 'raj@betamfg.com'],
      contact_phone: ['+91 9876543210', '+91 8765432109', '+91 7654321098'],
      assigned_csm: ['1', '2', '3'],
      health_status: ['healthy', 'at_risk', 'red_zone'],
      mrr: ['54000', '25000', '18000'],
      arr: ['648000', '300000', '216000'],
      renewal_date: ['2025-12-15', '2025-06-30', '2024-09-10'],
      currency_code: ['INR', 'INR', 'INR'],
      chargebee_customer_id: ['', 'cb_cust_123', ''],
      chargebee_subscription_id: ['', 'cb_sub_456', ''],
      mysql_company_id: ['sql_123', 'sql_456', 'sql_789'],
      active_stores: ['20', '15', '10'],
      growth_subscription_count: ['5', '3', '2'],
      loyalty_active_store_count: ['3', '2', '1'],
      loyalty_inactive_store_count: ['1', '0', '0'],
      loyalty_active_channels: ['WhatsApp|SMS', 'SMS', ''],
      loyalty_channel_credits: ['200', '100', '50'],
      negative_feedback_alert_inactive: ['0', '1', '2'],
      less_than_300_bills: ['0', '2', '5'],
      active_auto_campaigns_count: ['12', '6', '3'],
      unique_customers_captured: ['20000', '15000', '8000'],
      revenue_1_year: ['120000', '90000', '60000'],
      customers_with_min_one_visit: ['5000', '3000', '2000'],
      customers_with_min_two_visit: ['1200', '900', '500'],
      customers_without_min_visits: ['800', '500', '300'],
      percentage_of_inactive_customers: ['3.2', '2.8', '2.5'],
      negative_feedbacks_count: ['400', '300', '200'],
      campaigns_sent_last_90_days: ['150', '100', '50'],
      bills_received_last_30_days: ['15', '10', '8'],
      customers_acquired_last_30_days: ['20', '15', '10'],
      loyalty_type: ['premium', 'basic', 'standard'],
      loyalty_reward: ['tier2', 'tier1', 'none'],
      onboarded_at: ['2023-01-15', '2023-02-28', '2023-03-10'],
      logo_url: ['https://example.com/logo1.png', 'https://example.com/logo2.png', '']
    };
    
    // Create sample data rows
    const sampleRows = Array(3).fill(null).map((_, i) => {
      return filteredFields.map(field => {
        if (fieldExamples[field] && fieldExamples[field][i]) {
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
export const exportCustomersCSV = async (req: Request, res: Response) => {
  try {
    // Get all customers
    const allCustomers = await storage.getCustomers();
    
    // Get all customer fields
    const customerFields = await storage.getCustomerTableFields();
    
    // Filter out specific fields we don't want in the CSV
    const fieldsToExclude = ['id', 'created_at', 'updated_from_mysql_at'];
    const filteredFields = customerFields
      .filter(field => !fieldsToExclude.includes(field))
      .sort(); // Sort fields alphabetically for better organization
    
    // Reorganize fields for better readability
    // Add 'name' field at the beginning as it's required
    if (filteredFields.includes('name')) {
      filteredFields.splice(filteredFields.indexOf('name'), 1);
      filteredFields.unshift('name');
    }
    
    // Add recurrer_id as the second field for clarity
    if (filteredFields.includes('recurrer_id')) {
      filteredFields.splice(filteredFields.indexOf('recurrer_id'), 1);
      filteredFields.splice(1, 0, 'recurrer_id');
    }
    
    // Create CSV header row
    const headerRow = filteredFields.join(',');
    
    // Create a row for each customer
    const customerRows = allCustomers.map(customer => {
      return filteredFields.map(field => {
        const value = customer[field as keyof typeof customer]; // Type assertion for TypeScript
        
        // Handle different value types
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object' && value instanceof Date) {
          return value.toISOString().split('T')[0]; // YYYY-MM-DD format
        } else if (Array.isArray(value)) {
          return `"${value.join('|')}"`;  // Convert arrays to pipe-delimited strings and quote them
        } else {
          // Clean strings and surround with quotes if they contain commas
          const strValue = String(value);
          if (strValue.includes(',')) {
            return `"${strValue}"`;
          }
          return strValue.replace(/,/g, ''); // Remove commas to prevent CSV parsing issues
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