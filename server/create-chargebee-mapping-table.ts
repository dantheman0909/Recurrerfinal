import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from '../shared/schema';
import ws from 'ws';

// Configure neon to use ws
neonConfig.webSocketConstructor = ws;

async function createChargebeeFieldMappingsTable() {
  console.log('Connecting to database...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable not set');
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  
  console.log('Creating chargebee_field_mappings table...');
  
  try {
    // Check if table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'chargebee_field_mappings'
      );
    `);
    
    const tableExists = result.rows[0].exists;
    
    if (tableExists) {
      console.log('Table chargebee_field_mappings already exists, skipping creation.');
    } else {
      // Create the table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "chargebee_field_mappings" (
          "id" SERIAL PRIMARY KEY,
          "chargebee_entity" TEXT NOT NULL,
          "chargebee_field" TEXT NOT NULL,
          "local_table" TEXT NOT NULL,
          "local_field" TEXT NOT NULL,
          "is_key_field" BOOLEAN DEFAULT false,
          "created_by" INTEGER REFERENCES "users"("id"),
          "created_at" TIMESTAMP DEFAULT now()
        );
      `);
      
      console.log('Table created successfully!');
      
      // Add default mappings for customers
      await db.insert(schema.chargebeeFieldMappings).values([
        { 
          chargebee_entity: 'customer', 
          chargebee_field: 'id', 
          local_table: 'customers', 
          local_field: 'chargebee_id',
          is_key_field: true 
        },
        { 
          chargebee_entity: 'customer', 
          chargebee_field: 'company', 
          local_table: 'customers', 
          local_field: 'name',
          is_key_field: false 
        },
        { 
          chargebee_entity: 'customer', 
          chargebee_field: 'email', 
          local_table: 'customers', 
          local_field: 'contact_email',
          is_key_field: false 
        },
        { 
          chargebee_entity: 'subscription', 
          chargebee_field: 'id', 
          local_table: 'customers', 
          local_field: 'subscription_id',
          is_key_field: true 
        },
        { 
          chargebee_entity: 'subscription', 
          chargebee_field: 'plan_id', 
          local_table: 'customers', 
          local_field: 'subscription_tier',
          is_key_field: false 
        }
      ]);
      
      console.log('Default field mappings created.');
    }
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  } finally {
    await pool.end();
  }
  
  console.log('Done!');
}

createChargebeeFieldMappingsTable().catch(console.error);