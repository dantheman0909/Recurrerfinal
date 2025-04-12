import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addRecurrenceColumn() {
  try {
    console.log("Checking if recurrence column exists in playbook_tasks table...");
    
    // Check if the column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'playbook_tasks' AND column_name = 'recurrence'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log("Column 'recurrence' not found. Adding it to the playbook_tasks table...");
      
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE playbook_tasks
        ADD COLUMN recurrence TEXT DEFAULT NULL
      `);
      
      console.log("Column 'recurrence' added successfully to playbook_tasks table.");
    } else {
      console.log("Column 'recurrence' already exists in playbook_tasks table.");
    }
    
    return true;
  } catch (error) {
    console.error("Error adding recurrence column:", error);
    throw error;
  }
}

// Run the migration
addRecurrenceColumn()
  .then(() => {
    console.log("Migration completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });