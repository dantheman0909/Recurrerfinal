import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addFiltersColumn() {
  try {
    console.log("Checking if filters column exists in playbooks table...");
    
    // Check if the column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'playbooks' AND column_name = 'filters'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log("Column 'filters' not found. Adding it to the playbooks table...");
      
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE playbooks
        ADD COLUMN filters JSONB DEFAULT NULL
      `);
      
      console.log("Column 'filters' added successfully to playbooks table.");
    } else {
      console.log("Column 'filters' already exists in playbooks table.");
    }
    
    return true;
  } catch (error) {
    console.error("Error adding filters column:", error);
    throw error;
  }
}

// Export a function that can be called from other modules
export const runMigration = async () => {
  try {
    await addFiltersColumn();
    console.log("Migration completed successfully.");
    return true;
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
};