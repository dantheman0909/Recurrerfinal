import { addConditionFieldColumn } from './migrations/add-condition-field-column';

async function runMigrations() {
  try {
    console.log("Running condition field migration...");
    const result = await addConditionFieldColumn();
    console.log("Migration result:", result);
    console.log("All migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
}

runMigrations();