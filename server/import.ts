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
    
    const csvData = req.file.buffer.toString('utf8');
    const rows = csvData.split('\n');
    
    if (rows.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV file is empty or invalid' });
    }
    
    // Get headers from first row
    const headers = rows[0].split(',').map(h => h.trim());
    
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
      
      // Create record object
      const record: Record<string, any> = {};
      headers.forEach((header, index) => {
        record[header] = sanitizeValue(values[index]);
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
    
    // Create CSV header row from fields
    const headerRow = customerFields
      .filter(field => field !== 'id' && field !== 'created_at') // Remove auto-generated fields
      .join(',');
      
    // Create sample data rows (2-3 examples)
    const sampleRows = [
      // Row 1 - Tech company
      'Acme Tech Solutions,,Technology,John Smith,john@acmetech.com,+91 9876543210,1,healthy,54000,648000,2025-12-15,Asia/Kolkata,,20,5,3,1,WhatsApp|SMS,200,0,0,12,20000,120000,5000,1200,800,3.2,400,150,15,20,35,0,moderate,standard,150,120,premium,tier2',
      
      // Row 2 - Retail company with less data
      'Gamma Retail,,Retail,Sarah Lee,sarah@gammaretail.com,+91 8765432109,2,at_risk,25000,300000,2025-06-30,Asia/Kolkata,CB_CUST_123,15,3,2,0,SMS,100,1,2,6,15000,90000,3000,900,500,2.8,300,100,10,15,25,10,basic,entry,100,80,basic,tier1',
      
      // Row 3 - Manufacturing company with minimal data
      'Beta Manufacturing,,Manufacturing,Raj Kumar,raj@betamfg.com,+91 7654321098,3,red_zone,18000,216000,2024-09-10,Asia/Kolkata,,10,2,1,0,,50,2,5,3,8000,60000,2000,500,300,2.5,200,50,8,10,20,25,none,none,50,40,standard,none'
    ];
    
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
    
    // Return success
    res.json({ success: true, message: 'Sample CSV created and updated' });
    
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
    
    // Create CSV header row
    const headerRow = customerFields
      .filter(field => field !== 'id' && field !== 'created_at') // Remove internal fields
      .join(',');
    
    // Create a row for each customer
    const customerRows = allCustomers.map(customer => {
      return customerFields
        .filter(field => field !== 'id' && field !== 'created_at')
        .map(field => {
          const value = customer[field];
          
          // Handle different value types
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'object' && value instanceof Date) {
            return value.toISOString().split('T')[0]; // YYYY-MM-DD format
          } else {
            return String(value).replace(/,/g, ''); // Remove commas to prevent CSV parsing issues
          }
        })
        .join(',');
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