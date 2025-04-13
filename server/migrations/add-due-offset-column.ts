import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addDueOffsetColumn() {
  try {
    console.log("Checking if due_offset column exists in playbook_tasks table...");
    
    // Check if the column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'playbook_tasks' AND column_name = 'due_offset'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log("Column 'due_offset' not found. Adding it to the playbook_tasks table...");
      
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE playbook_tasks
        ADD COLUMN due_offset INTEGER DEFAULT 0
      `);
      
      console.log("Column 'due_offset' added successfully to playbook_tasks table.");
    } else {
      console.log("Column 'due_offset' already exists in playbook_tasks table.");
    }
    
    return true;
  } catch (error) {
    console.error("Error adding due_offset column:", error);
    throw error;
  }
}

// Run the migration
addDueOffsetColumn()
  .then(() => {
    console.log("Migration completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });