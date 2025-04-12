import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addDueTypeColumn() {
  try {
    console.log("Checking if due_type column exists in playbook_tasks table...");
    
    // Check if the column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'playbook_tasks' AND column_name = 'due_type'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log("Column 'due_type' not found. Adding it to the playbook_tasks table...");
      
      // Create the enum type if it doesn't exist
      try {
        await db.execute(sql`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'due_date_type') THEN
              CREATE TYPE due_date_type AS ENUM ('fixed', 'relative');
            END IF;
          END
          $$;
        `);
        console.log("Enum type due_date_type created or already exists.");
      } catch (error) {
        console.log("Error creating enum type, it may already exist:", error);
      }
      
      // Add the due_type column with default value 'relative'
      await db.execute(sql`
        ALTER TABLE playbook_tasks
        ADD COLUMN due_type due_date_type DEFAULT 'relative'::due_date_type
      `);
      
      console.log("Column 'due_type' added successfully to playbook_tasks table.");
    } else {
      console.log("Column 'due_type' already exists in playbook_tasks table.");
    }
    
    return true;
  } catch (error) {
    console.error("Error adding due_type column:", error);
    throw error;
  }
}

// Run the migration
addDueTypeColumn()
  .then(() => {
    console.log("Migration completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });