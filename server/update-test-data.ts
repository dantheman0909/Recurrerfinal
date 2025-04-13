import { db } from "./db";
import { customers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "./vite";

async function updateTestData() {
  try {
    log('Starting test data update...', 'testdata');
    
    // Update first test customer with Chargebee data
    await db.update(customers)
      .set({
        chargebee_customer_id: 'AzyohMUi9BdQpjCc',
        chargebee_subscription_id: '1sQ5y3UzQcPgJz9X'
      })
      .where(eq(customers.id, 1));
      
    // Update second test customer with MySQL data
    await db.update(customers)
      .set({
        mysql_company_id: '613727fb2183fd3b238d80de'
      })
      .where(eq(customers.id, 2));
      
    // Update third test customer with both Chargebee and MySQL data
    await db.update(customers)
      .set({
        chargebee_customer_id: 'KvYrQhB23x5xCcPq',
        chargebee_subscription_id: 'HtF9qP13xVJmL4aZ',
        mysql_company_id: '613727fb6532fd3b238d80fe'
      })
      .where(eq(customers.id, 3));
    
    log('Test data updated successfully!', 'testdata');
  } catch (error) {
    log(`Test data update failed: ${error}`, 'testdata');
    throw error;
  }
}

// Run the update
updateTestData()
  .then(() => {
    log('Exiting test data update script', 'testdata');
    process.exit(0);
  })
  .catch(error => {
    log(`Test data update error: ${error}`, 'testdata');
    process.exit(1);
  });