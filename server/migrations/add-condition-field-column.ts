import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addConditionFieldColumn() {
  try {
    console.log("Adding condition_field column to playbook_tasks table...");
    
    // Check if the column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'playbook_tasks' AND column_name = 'condition_field'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log("Column 'condition_field' not found. Adding it to the playbook_tasks table...");
      
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE playbook_tasks
        ADD COLUMN condition_field JSONB DEFAULT NULL
      `);
      
      console.log("Column 'condition_field' added successfully to playbook_tasks table.");
    } else {
      console.log("Column 'condition_field' already exists in playbook_tasks table.");
    }
    
    return true;
  } catch (error) {
    console.error("Error adding condition_field column:", error);
    throw error;
  }
}

// Run the migration
addConditionFieldColumn()
  .then(() => {
    console.log("Migration completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });