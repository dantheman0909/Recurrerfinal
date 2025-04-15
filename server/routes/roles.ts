import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { z } from 'zod';
import { permissions } from '@shared/schema';

const router = Router();

// Define the structure of role permissions
const rolePermissionSchema = z.object({
  permissions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      roles: z.object({
        admin: z.boolean(),
        team_lead: z.boolean(),
        csm: z.boolean(),
      }),
    })
  ),
});

/**
 * Get all role permissions
 * GET /api/roles/permissions
 */
router.get('/permissions', async (req, res) => {
  try {
    // Get all permissions from the database
    const rolePermissions = await db.query.permissions.findMany();
    
    // If no permissions exist yet, return default set
    if (!rolePermissions || rolePermissions.length === 0) {
      return res.json(getDefaultPermissions());
    }
    
    return res.json(rolePermissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch role permissions',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Update role permissions
 * PUT /api/roles/permissions
 */
router.put('/permissions', async (req, res) => {
  try {
    // Validate request body
    const validationResult = rolePermissionSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid permission data',
        errors: validationResult.error.format()
      });
    }
    
    const { permissions: updatedPermissions } = validationResult.data;
    
    // Transaction to update all permissions
    await db.transaction(async (tx) => {
      // First clear existing permissions
      await tx.delete(permissions);
      
      // Insert the updated permissions
      for (const permission of updatedPermissions) {
        await tx.insert(permissions).values({
          id: permission.id,
          name: permission.name,
          description: permission.description,
          admin_access: permission.roles.admin,
          team_lead_access: permission.roles.team_lead,
          csm_access: permission.roles.csm,
        });
      }
    });
    
    return res.json({ 
      message: 'Permissions updated successfully',
      permissions: updatedPermissions
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return res.status(500).json({ 
      message: 'Failed to update role permissions',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Check if a user has a specific permission
 * GET /api/roles/check/:permissionId
 */
router.get('/check/:permissionId', async (req, res) => {
  try {
    const { permissionId } = req.params;
    const { role } = req.query;
    
    if (!role || typeof role !== 'string') {
      return res.status(400).json({ message: 'Role parameter is required' });
    }
    
    // Get the permission from the database
    const permission = await db.query.permissions.findFirst({
      where: eq(permissions.id, permissionId)
    });
    
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    
    // Check if the role has access
    let hasAccess = false;
    
    switch (role) {
      case 'admin':
        hasAccess = permission.admin_access;
        break;
      case 'team_lead':
        hasAccess = permission.team_lead_access;
        break;
      case 'csm':
        hasAccess = permission.csm_access;
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }
    
    return res.json({ hasAccess });
  } catch (error) {
    console.error('Error checking permission:', error);
    return res.status(500).json({ 
      message: 'Failed to check permission',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get default role permissions used for initial setup
 */
function getDefaultPermissions() {
  return [
    {
      id: 'view_customers',
      name: 'View Customers',
      description: 'View customer information and details',
      roles: {
        admin: true,
        team_lead: true,
        csm: true,
      },
    },
    {
      id: 'edit_customers',
      name: 'Edit Customers',
      description: 'Edit customer information and details',
      roles: {
        admin: true,
        team_lead: true,
        csm: false,
      },
    },
    {
      id: 'delete_customers',
      name: 'Delete Customers',
      description: 'Delete customers from the system',
      roles: {
        admin: true,
        team_lead: false,
        csm: false,
      },
    },
    {
      id: 'assign_customers',
      name: 'Assign Customers',
      description: 'Assign customers to CSMs',
      roles: {
        admin: true,
        team_lead: true,
        csm: false,
      },
    },
    {
      id: 'view_tasks',
      name: 'View Tasks',
      description: 'View all tasks in the system',
      roles: {
        admin: true,
        team_lead: true,
        csm: true,
      },
    },
    {
      id: 'manage_tasks',
      name: 'Manage Tasks',
      description: 'Create, edit, and delete tasks',
      roles: {
        admin: true,
        team_lead: true,
        csm: true,
      },
    },
    {
      id: 'view_reports',
      name: 'View Reports',
      description: 'Access reporting and analytics features',
      roles: {
        admin: true,
        team_lead: true,
        csm: false,
      },
    },
    {
      id: 'manage_users',
      name: 'Manage Users',
      description: 'Create, edit, and delete users',
      roles: {
        admin: true,
        team_lead: false,
        csm: false,
      },
    },
    {
      id: 'manage_settings',
      name: 'Manage Settings',
      description: 'Configure application settings',
      roles: {
        admin: true,
        team_lead: false,
        csm: false,
      },
    },
    {
      id: 'manage_integrations',
      name: 'Manage Integrations',
      description: 'Configure external integrations',
      roles: {
        admin: true,
        team_lead: false,
        csm: false,
      },
    },
  ];
}

export default router;