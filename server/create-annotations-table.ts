import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';

/**
 * Creates the annotations table for real-time collaboration
 */
async function createAnnotationsTable() {
  try {
    console.log('Creating annotations table...');
    
    // Connection
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
    const db = drizzle(pool, { schema });
    
    // Create the annotation_type enum if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annotation_type') THEN
          CREATE TYPE annotation_type AS ENUM ('comment', 'highlight', 'suggestion', 'action_item');
        END IF;
      END
      $$;
    `);
    
    // Create the entity_type enum if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type') THEN
          CREATE TYPE entity_type AS ENUM ('customer', 'task', 'playbook', 'report', 'metric');
        END IF;
      END
      $$;
    `);
    
    // Create the annotations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS annotations (
        id SERIAL PRIMARY KEY,
        entity_type entity_type NOT NULL,
        entity_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type annotation_type NOT NULL DEFAULT 'comment',
        content TEXT NOT NULL,
        position_data JSONB,
        is_resolved BOOLEAN DEFAULT FALSE,
        parent_id INTEGER,
        mentioned_user_ids INTEGER[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,
        resolved_at TIMESTAMP,
        resolved_by INTEGER REFERENCES users(id)
      );
    `);
    
    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_annotations_entity ON annotations(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
      CREATE INDEX IF NOT EXISTS idx_annotations_parent_id ON annotations(parent_id) WHERE parent_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_annotations_mentioned_users ON annotations USING GIN(mentioned_user_ids) WHERE mentioned_user_ids IS NOT NULL;
    `);
    
    console.log('Annotations table created successfully!');
    
    await pool.end();
    
    return { success: true, message: 'Annotations table created successfully' };
  } catch (error) {
    console.error('Error creating annotations table:', error);
    return { success: false, message: `Error creating annotations table: ${error}` };
  }
}

export default createAnnotationsTable;