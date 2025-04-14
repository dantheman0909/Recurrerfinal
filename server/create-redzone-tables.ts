import { pool } from './db';

/**
 * Creates the RedZone-related tables for the enhanced RedZone Configuration + Resolution Framework
 */
async function createRedZoneTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if tables already exist
    const checkTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('red_zone_rules', 'red_zone_resolution_criteria', 'red_zone_activity_logs')
    `;
    const existingTables = await client.query(checkTablesQuery);
    const existingTableNames = existingTables.rows.map(row => row.table_name);

    // Create red_zone_rules table if it doesn't exist
    if (!existingTableNames.includes('red_zone_rules')) {
      console.log('Creating red_zone_rules table...');
      await client.query(`
        CREATE TABLE red_zone_rules (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          conditions JSONB NOT NULL,
          severity TEXT CHECK (severity IN ('critical', 'high_risk', 'attention_needed')) DEFAULT 'attention_needed',
          auto_resolve BOOLEAN DEFAULT false,
          resolution_conditions JSONB,
          enabled BOOLEAN DEFAULT true,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP,
          team_lead_approval_required BOOLEAN DEFAULT false,
          notification_message TEXT
        );
      `);
    } else {
      console.log('red_zone_rules table already exists.');
    }

    // Create red_zone_resolution_criteria table if it doesn't exist
    if (!existingTableNames.includes('red_zone_resolution_criteria')) {
      console.log('Creating red_zone_resolution_criteria table...');
      await client.query(`
        CREATE TABLE red_zone_resolution_criteria (
          id SERIAL PRIMARY KEY,
          rule_id INTEGER NOT NULL REFERENCES red_zone_rules(id) ON DELETE CASCADE,
          field_path TEXT NOT NULL,
          operator TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } else {
      console.log('red_zone_resolution_criteria table already exists.');
    }

    // Check if red_zone_alerts table needs updating
    const checkRedZoneAlertsColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'red_zone_alerts'
    `;
    const existingColumns = await client.query(checkRedZoneAlertsColumnsQuery);
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);

    // Update red_zone_alerts table with new columns if needed
    if (existingColumnNames.includes('id')) {
      console.log('Updating red_zone_alerts table with new columns...');
      
      // Add rule_id if it doesn't exist
      if (!existingColumnNames.includes('rule_id')) {
        await client.query(`ALTER TABLE red_zone_alerts ADD COLUMN rule_id INTEGER REFERENCES red_zone_rules(id);`);
      }
      
      // Add status if it doesn't exist
      if (!existingColumnNames.includes('status')) {
        await client.query(`ALTER TABLE red_zone_alerts ADD COLUMN status TEXT DEFAULT 'open' NOT NULL;`);
      }
      
      // Add other new columns
      if (!existingColumnNames.includes('details')) {
        await client.query(`ALTER TABLE red_zone_alerts ADD COLUMN details JSONB;`);
      }
      
      if (!existingColumnNames.includes('notes')) {
        await client.query(`ALTER TABLE red_zone_alerts ADD COLUMN notes TEXT;`);
      }
      
      if (!existingColumnNames.includes('assigned_to')) {
        await client.query(`ALTER TABLE red_zone_alerts ADD COLUMN assigned_to INTEGER REFERENCES users(id);`);
      }
      
      if (!existingColumnNames.includes('escalated_to')) {
        await client.query(`ALTER TABLE red_zone_alerts ADD COLUMN escalated_to INTEGER REFERENCES users(id);`);
      }
      
      if (!existingColumnNames.includes('escalated_at')) {
        await client.query(`ALTER TABLE red_zone_alerts ADD COLUMN escalated_at TIMESTAMP;`);
      }
      
      if (!existingColumnNames.includes('resolution_summary')) {
        await client.query(`ALTER TABLE red_zone_alerts ADD COLUMN resolution_summary TEXT;`);
      }
      
      if (!existingColumnNames.includes('resolved_by')) {
        await client.query(`ALTER TABLE red_zone_alerts ADD COLUMN resolved_by INTEGER REFERENCES users(id);`);
      }
    }

    // Create red_zone_activity_logs table if it doesn't exist
    if (!existingTableNames.includes('red_zone_activity_logs')) {
      console.log('Creating red_zone_activity_logs table...');
      await client.query(`
        CREATE TABLE red_zone_activity_logs (
          id SERIAL PRIMARY KEY,
          alert_id INTEGER NOT NULL REFERENCES red_zone_alerts(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          performed_by INTEGER REFERENCES users(id),
          details JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } else {
      console.log('red_zone_activity_logs table already exists.');
    }

    await client.query('COMMIT');
    console.log('RedZone tables creation completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating RedZone tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Execute the function if this file is run directly
// ESM modules don't have require.main === module, so we'll just run it
createRedZoneTables()
  .then(() => {
    console.log('RedZone tables setup complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error setting up RedZone tables:', err);
    process.exit(1);
  });

export default createRedZoneTables;