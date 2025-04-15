import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { log } from './vite';

neonConfig.webSocketConstructor = ws;

/**
 * Adds necessary columns to the customers table for Chargebee caching
 */
async function updateCustomerSchema() {
  try {
    log('Starting customer schema update...', 'schema');
    
    // Connect to the database
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    const pool = new Pool({ connectionString });
    const db = drizzle(pool);
    
    // Execute the SQL to add the columns if they don't exist
    const queries = [
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_from_chargebee_at TIMESTAMP",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS subscription_status TEXT",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS plan_id TEXT",
    ];
    
    for (const query of queries) {
      try {
        await pool.query(query);
        log(`Successfully executed: ${query}`, 'schema');
      } catch (error) {
        log(`Error executing query '${query}': ${error}`, 'schema');
      }
    }
    
    log('Customer schema update completed.', 'schema');
    
    // Close the database connection
    await pool.end();
    
    return { success: true, message: 'Customer schema updated successfully' };
  } catch (error) {
    log(`Error updating customer schema: ${error}`, 'schema');
    return { success: false, error: String(error) };
  }
}

// Run the function if this is executed directly
if (require.main === module) {
  updateCustomerSchema()
    .then(result => {
      console.log(result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export { updateCustomerSchema };