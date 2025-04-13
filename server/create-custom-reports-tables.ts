import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Creates the custom reports and metrics tables for advanced reporting
 */
async function createCustomReportsTables() {
  console.log('Creating custom reports tables...');
  
  try {
    // Create custom_reports table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS custom_reports (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        chart_type TEXT NOT NULL DEFAULT 'line',
        is_public BOOLEAN DEFAULT TRUE,
        filters JSONB,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,
        last_run_at TIMESTAMP
      )
    `);
    
    // Create custom_metrics table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS custom_metrics (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES custom_reports(id),
        name TEXT NOT NULL,
        description TEXT,
        data_source TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        sql_query TEXT,
        field_mapping JSONB,
        display_format TEXT DEFAULT 'number',
        display_color TEXT,
        target_value INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create report_schedules table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS report_schedules (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES custom_reports(id),
        frequency TEXT NOT NULL,
        recipients TEXT[],
        last_sent_at TIMESTAMP,
        next_scheduled_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Custom reports tables created successfully.');
  } catch (error) {
    console.error('Error creating custom reports tables:', error);
    throw error;
  }
}

export { createCustomReportsTables };

// Export a default function for consistency with other migration modules
export default async function createCustomReportsTables_main() {
  try {
    await createCustomReportsTables();
    return { success: true };
  } catch (error) {
    console.error('Custom reports tables migration failed:', error);
    return { success: false, error };
  }
}

// Self-invoking if file is run directly (for CLI usage)
if (import.meta.url === `file://${process.argv[1]}`) {
  createCustomReportsTables()
    .then(() => {
      console.log('Custom reports tables migration completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Custom reports tables migration failed:', error);
      process.exit(1);
    });
}