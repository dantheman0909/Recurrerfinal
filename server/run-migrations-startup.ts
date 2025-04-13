import { addConditionFieldColumn } from './migrations/add-condition-field-column';

export async function runMigrationsOnStartup() {
  try {
    console.log("Running database migrations...");
    await addConditionFieldColumn();
    console.log("Database migrations completed successfully");
    return true;
  } catch (error) {
    console.error("Error running migrations:", error);
    return false;
  }
}