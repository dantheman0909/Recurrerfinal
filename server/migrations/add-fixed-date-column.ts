import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addFixedDateColumn() {
  try {
    console.log("Checking if fixed_date column exists in playbook_tasks table...");
    
    // Check if the column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'playbook_tasks' AND column_name = 'fixed_date'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log("Column 'fixed_date' not found. Adding it to the playbook_tasks table...");
      
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE playbook_tasks
        ADD COLUMN fixed_date TIMESTAMP DEFAULT NULL
      `);
      
      console.log("Column 'fixed_date' added successfully to playbook_tasks table.");
    } else {
      console.log("Column 'fixed_date' already exists in playbook_tasks table.");
    }
    
    return true;
  } catch (error) {
    console.error("Error adding fixed_date column:", error);
    throw error;
  }
}

// Run the migration
addFixedDateColumn()
  .then(() => {
    console.log("Migration completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });