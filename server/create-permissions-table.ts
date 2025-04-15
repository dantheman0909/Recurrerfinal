import { db } from './db';
import { permissions } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Create and initialize the permissions table for role-based access control
 * This function creates the table if it doesn't exist and populates it with default permissions
 */
async function createPermissionsTable(): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log('Creating permissions table...');
    
    // Check if the table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permissions'
      );
    `);
    
    const exists = tableExists.rows[0]?.exists === true || tableExists.rows[0]?.exists === 'true';
    
    if (!exists) {
      // Create the table using the schema definition
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS permissions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          admin_access BOOLEAN NOT NULL DEFAULT TRUE,
          team_lead_access BOOLEAN NOT NULL DEFAULT FALSE,
          csm_access BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Permissions table created successfully');
      
      // Insert default permissions
      await insertDefaultPermissions();
      return { success: true, message: 'Permissions table created and populated with defaults' };
    } else {
      console.log('Permissions table already exists, checking for missing permissions...');
      
      // Check if any default permissions are missing and add them
      await insertDefaultPermissions();
      return { success: true, message: 'Permissions table already exists, checked for missing permissions' };
    }
  } catch (error) {
    console.error('Error creating permissions table:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Insert the default set of permissions
 * This is used both for initial setup and to ensure all required permissions exist
 */
async function insertDefaultPermissions() {
  const defaultPermissions = [
    {
      id: 'view_customers',
      name: 'View Customers',
      description: 'View customer information and details',
      admin_access: true,
      team_lead_access: true,
      csm_access: true,
    },
    {
      id: 'edit_customers',
      name: 'Edit Customers',
      description: 'Edit customer information and details',
      admin_access: true,
      team_lead_access: true,
      csm_access: false,
    },
    {
      id: 'delete_customers',
      name: 'Delete Customers',
      description: 'Delete customers from the system',
      admin_access: true,
      team_lead_access: false,
      csm_access: false,
    },
    {
      id: 'assign_customers',
      name: 'Assign Customers',
      description: 'Assign customers to CSMs',
      admin_access: true,
      team_lead_access: true,
      csm_access: false,
    },
    {
      id: 'view_tasks',
      name: 'View Tasks',
      description: 'View all tasks in the system',
      admin_access: true,
      team_lead_access: true,
      csm_access: true,
    },
    {
      id: 'manage_tasks',
      name: 'Manage Tasks',
      description: 'Create, edit, and delete tasks',
      admin_access: true,
      team_lead_access: true,
      csm_access: true,
    },
    {
      id: 'view_reports',
      name: 'View Reports',
      description: 'Access reporting and analytics features',
      admin_access: true,
      team_lead_access: true,
      csm_access: false,
    },
    {
      id: 'manage_users',
      name: 'Manage Users',
      description: 'Create, edit, and delete users',
      admin_access: true,
      team_lead_access: false,
      csm_access: false,
    },
    {
      id: 'manage_settings',
      name: 'Manage Settings',
      description: 'Configure application settings',
      admin_access: true,
      team_lead_access: false,
      csm_access: false,
    },
    {
      id: 'manage_integrations',
      name: 'Manage Integrations',
      description: 'Configure external integrations',
      admin_access: true,
      team_lead_access: false,
      csm_access: false,
    },
  ];
  
  // For each default permission
  for (const permission of defaultPermissions) {
    // Check if it already exists
    const existing = await db.query.permissions.findFirst({
      where: (fields, { eq }) => eq(fields.id, permission.id)
    });
    
    if (!existing) {
      // Insert if it doesn't exist
      await db.insert(permissions).values(permission);
      console.log(`Added permission: ${permission.id}`);
    }
  }
}

export default createPermissionsTable;