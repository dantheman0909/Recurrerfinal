import { db } from "./db";
import { sql } from "drizzle-orm";

async function fixPlaybooksTable() {
  try {
    console.log("Checking if filters column exists in playbooks table...");
    
    // Check if the filters column already exists
    const checkFiltersResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'playbooks' AND column_name = 'filters'
    `);
    
    if (checkFiltersResult.rows.length === 0) {
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
    
    // Check if the active column already exists
    console.log("Checking if active column exists in playbooks table...");
    const checkActiveResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'playbooks' AND column_name = 'active'
    `);
    
    if (checkActiveResult.rows.length === 0) {
      console.log("Column 'active' not found. Adding it to the playbooks table...");
      
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE playbooks
        ADD COLUMN active BOOLEAN DEFAULT true
      `);
      
      console.log("Column 'active' added successfully to playbooks table.");
    } else {
      console.log("Column 'active' already exists in playbooks table.");
    }
    
    return true;
  } catch (error) {
    console.error("Error fixing playbooks table:", error);
    throw error;
  }
}

// Run the migration
fixPlaybooksTable()
  .then(() => {
    console.log("Migration completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });