import { pool, db } from './db';
import * as schema from '@shared/schema';
import { sql } from 'drizzle-orm';

// This seed script initializes the database tables for our application
async function seed() {
  console.log('Starting database seed operation...');
  
  try {
    // Create enums first
    console.log('Creating enum types...');
    await db.execute(sql`
      DO $$ BEGIN
        -- Create user role enum if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('admin', 'team_lead', 'csm');
        END IF;
        
        -- Create task status enum if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
          CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
        END IF;
        
        -- Create account health enum if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_health') THEN
          CREATE TYPE account_health AS ENUM ('healthy', 'at_risk', 'red_zone');
        END IF;
        
        -- Create alert severity enum if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
          CREATE TYPE alert_severity AS ENUM ('critical', 'high_risk', 'attention_needed');
        END IF;
        
        -- Create playbook trigger enum if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'playbook_trigger') THEN
          CREATE TYPE playbook_trigger AS ENUM ('manual', 'new_customer', 'usage_drop', 'renewal_approaching', 'custom_event');
        END IF;
        
        -- Create due date type enum if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'due_date_type') THEN
          CREATE TYPE due_date_type AS ENUM ('fixed', 'relative');
        END IF;
        
        -- Create recurrence type enum if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrence_type') THEN
          CREATE TYPE recurrence_type AS ENUM ('none', 'daily', 'weekly', 'monthly', 'bi-weekly');
        END IF;
        
        -- Create account type enum if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
          CREATE TYPE account_type AS ENUM ('starter', 'growth', 'key');
        END IF;
      END $$;
    `);
    
    // Create tables in the correct order to handle relationships properly
    console.log('Creating users table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        avatar_url TEXT,
        role user_role NOT NULL DEFAULT 'csm',
        team_lead_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating customers table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        recurrer_id TEXT,
        industry TEXT,
        logo_url TEXT,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        account_type account_type DEFAULT 'starter',
        csm_id INTEGER REFERENCES users(id),
        health_status account_health DEFAULT 'healthy',
        health_score INTEGER,
        subscription_tier TEXT,
        subscription_start TIMESTAMP,
        subscription_end TIMESTAMP,
        subscription_value DECIMAL(10, 2),
        subscription_status TEXT,
        last_contacted TIMESTAMP,
        notes TEXT,
        monthly_recurring_revenue DECIMAL(10, 2),
        total_revenue DECIMAL(10, 2),
        churn_risk INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,
        billing_account_id TEXT,
        active_features TEXT[],
        users_count INTEGER,
        active_users_count INTEGER,
        integration_count INTEGER,
        updated_from_mysql_at TIMESTAMP
      );
    `);

    console.log('Creating tasks table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status task_status DEFAULT 'pending',
        due_date TIMESTAMP,
        priority INTEGER DEFAULT 1,
        customer_id INTEGER REFERENCES customers(id),
        assignee_id INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);

    console.log('Creating task_comments table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating playbooks table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS playbooks (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type playbook_trigger DEFAULT 'manual',
        target_segments TEXT[],
        filters JSONB,
        active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating playbook_tasks table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS playbook_tasks (
        id SERIAL PRIMARY KEY,
        playbook_id INTEGER NOT NULL REFERENCES playbooks(id),
        title TEXT NOT NULL,
        description TEXT,
        due_type due_date_type DEFAULT 'relative',
        due_offset INTEGER,
        fixed_date TIMESTAMP,
        recurrence recurrence_type DEFAULT 'none',
        assignment_role user_role DEFAULT 'csm',
        required_fields TEXT[],
        template_message TEXT,
        position INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating playbook_runs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS playbook_runs (
        id SERIAL PRIMARY KEY,
        playbook_id INTEGER NOT NULL REFERENCES playbooks(id),
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        started_by INTEGER REFERENCES users(id),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        status TEXT DEFAULT 'in_progress'
      );
    `);

    console.log('Creating red_zone_alerts table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS red_zone_alerts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        reason TEXT NOT NULL,
        severity alert_severity DEFAULT 'attention_needed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      );
    `);

    console.log('Creating customer_metrics table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_metrics (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        metric_type TEXT NOT NULL,
        metric_value DECIMAL(10, 2) NOT NULL,
        metric_percent INTEGER,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating mysql_config table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mysql_config (
        id SERIAL PRIMARY KEY,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        database TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating mysql_field_mappings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mysql_field_mappings (
        id SERIAL PRIMARY KEY,
        mysql_table TEXT NOT NULL,
        mysql_field TEXT NOT NULL,
        local_table TEXT NOT NULL,
        local_field TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database schema created successfully');
    
    // Insert seed data for testing
    const adminExists = await db.execute(sql`
      SELECT id FROM users WHERE email = 'admin@example.com'
    `);
    
    if (!adminExists.rows.length) {
      console.log('Adding sample users...');
      await db.execute(sql`
        INSERT INTO users (email, name, role)
        VALUES 
          ('admin@example.com', 'Admin User', 'admin'),
          ('teamlead@example.com', 'Team Lead', 'team_lead'),
          ('csm@example.com', 'CSM User', 'csm')
      `);
      
      console.log('Adding sample customers...');
      await db.execute(sql`
        INSERT INTO customers (name, industry, health_status)
        VALUES 
          ('Acme Inc', 'Technology', 'healthy'),
          ('Beta Corp', 'Finance', 'at_risk'),
          ('Gamma LLC', 'Healthcare', 'red_zone')
      `);
      
      console.log('✅ Sample data created successfully');
    } else {
      console.log('Sample data already exists, skipping seed data');
    }
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seed if called directly
if (process.argv[1] === import.meta.url) {
  seed();
}

export default seed;