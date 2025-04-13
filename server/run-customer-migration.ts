import { migrateAdditionalCustomerFields } from './migrations/add-additional-customer-fields';

// Run the customer fields migration
migrateAdditionalCustomerFields()
  .then(() => {
    console.log("Customer fields migration completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Customer fields migration failed:", error);
    process.exit(1);
  });