import { db } from "../db";

// Import all migration scripts
import { runMigration as addFiltersColumn } from './add-filters-column';
import { addDueTypeColumn } from './add-due-type-column';
import { addDueOffsetColumn } from './add-due-offset-column';
import { addFixedDateColumn } from './add-fixed-date-column';
import { addRecurrenceColumn } from './add-recurrence-column';

async function runAllMigrations() {
  try {
    console.log("Starting all migrations...");
    
    // Run migrations in sequence
    await addFiltersColumn();
    await addDueTypeColumn();
    await addDueOffsetColumn();
    await addFixedDateColumn();
    await addRecurrenceColumn();
    
    console.log("All migrations completed successfully.");
    return true;
  } catch (error) {
    console.error("Migration process failed:", error);
    throw error;
  }
}

// Run the migrations
runAllMigrations()
  .then(() => {
    console.log("Migration process finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration process failed:", error);
    process.exit(1);
  });