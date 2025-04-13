import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addRemainingColumns() {
  try {
    console.log("Adding remaining columns to playbook_tasks table...");
    
    // List of remaining columns to check and add
    const columnsToAdd = [
      {
        name: 'assignment_role',
        definition: `TEXT DEFAULT 'csm'`
      },
      {
        name: 'required_fields',
        definition: `TEXT[] DEFAULT '{}'::TEXT[]`
      },
      {
        name: 'template_message',
        definition: `TEXT DEFAULT NULL`
      },
      {
        name: 'order',
        definition: `INTEGER DEFAULT 0`
      }
    ];
    
    for (const column of columnsToAdd) {
      // Check if the column already exists
      const checkResult = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'playbook_tasks' AND column_name = ${column.name}
      `);
      
      if (checkResult.rows.length === 0) {
        console.log(`Column '${column.name}' not found. Adding it to the playbook_tasks table...`);
        
        // Add the column if it doesn't exist
        await db.execute(sql`
          ALTER TABLE playbook_tasks
          ADD COLUMN ${sql.raw(column.name)} ${sql.raw(column.definition)}
        `);
        
        console.log(`Column '${column.name}' added successfully to playbook_tasks table.`);
      } else {
        console.log(`Column '${column.name}' already exists in playbook_tasks table.`);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error adding remaining columns:", error);
    throw error;
  }
}

// Run the migration
addRemainingColumns()
  .then(() => {
    console.log("Migration completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });