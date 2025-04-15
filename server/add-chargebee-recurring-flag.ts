import { db } from "./db";
import { log } from "./vite";
import { chargebeeFieldMappings } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Adds the recurring flag field mapping to the chargebee_field_mappings table
 * This field is used to distinguish between recurring and non-recurring invoices
 */
async function addChargebeeRecurringFlag() {
  try {
    log('Adding recurring flag to chargebee_field_mappings table...', 'migration');
    
    // First check if the mapping already exists
    const existingMapping = await db.select()
      .from(chargebeeFieldMappings)
      .where(eq(chargebeeFieldMappings.chargebee_field, 'recurring'))
      .limit(1);
    
    if (existingMapping && existingMapping.length > 0) {
      log('Recurring flag mapping already exists, skipping', 'migration');
      return { success: true, message: 'Recurring flag mapping already exists' };
    }
    
    // Insert the new mapping
    await db.insert(chargebeeFieldMappings).values({
      chargebee_field: 'recurring',
      local_field: 'recurring',
      local_table: 'chargebee_invoices',
      field_type: 'boolean',
      is_key_field: false
    });
    
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
  addChargebeeRecurringFlag()
    .then(result => {
      console.log(result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default addChargebeeRecurringFlag;