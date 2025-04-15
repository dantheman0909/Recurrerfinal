import { db } from "./db";
import { log } from "./vite";
import { pool } from "./db";

/**
 * Adds the recurring flag field mapping to the chargebee_field_mappings table
 * This field is used to distinguish between recurring and non-recurring invoices
 */
async function addChargebeeRecurringFlag() {
  try {
    log('Adding recurring flag to chargebee_field_mappings table...', 'migration');
    
    // First check if the mapping already exists using direct SQL
    const checkResult = await pool.query(`
      SELECT id FROM chargebee_field_mappings 
      WHERE chargebee_field = 'recurring' 
      LIMIT 1
    `);
    
    if (checkResult && checkResult.rowCount && checkResult.rowCount > 0) {
      log('Recurring flag mapping already exists, skipping', 'migration');
      return { success: true, message: 'Recurring flag mapping already exists' };
    }
    
    // Insert the new mapping with direct SQL
    await pool.query(`
      INSERT INTO chargebee_field_mappings 
      (chargebee_entity, chargebee_field, local_table, local_field, is_key_field) 
      VALUES ('invoice', 'recurring', 'chargebee_invoices', 'recurring', false)
    `);
    
    log('Successfully added recurring flag mapping to chargebee_field_mappings', 'migration');
    return { success: true, message: 'Successfully added recurring flag mapping' };
  } catch (error) {
    log(`Error adding recurring flag mapping: ${error}`, 'migration');
    return { success: false, error: String(error) };
  }
}

// Function to check if this file is run directly
const isMainModule = () => {
  const mainModule = process.argv[1];
  const fileUrl = import.meta.url;
  const filePath = fileUrl.startsWith('file:') ? fileUrl.slice(5) : fileUrl;
  return mainModule && filePath === mainModule;
};

// Run if this file is executed directly
if (isMainModule()) {
  console.log('Starting to add Chargebee recurring flag mapping...');
  addChargebeeRecurringFlag()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default addChargebeeRecurringFlag;