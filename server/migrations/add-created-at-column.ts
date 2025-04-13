import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addCreatedAtColumn() {
  try {
    console.log("Checking if created_at column exists in playbook_tasks table...");
    
    // Check if the column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'playbook_tasks' AND column_name = 'created_at'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log("Column 'created_at' not found. Adding it to the playbook_tasks table...");
      
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE playbook_tasks
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      
      console.log("Column 'created_at' added successfully to playbook_tasks table.");
    } else {
      console.log("Column 'created_at' already exists in playbook_tasks table.");
    }
    
    return true;
  } catch (error) {
    console.error("Error adding created_at column:", error);
    throw error;
  }
}

// Run the migration
addCreatedAtColumn()
  .then(() => {
    console.log("Migration completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });