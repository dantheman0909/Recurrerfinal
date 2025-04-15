import { db } from '../db';

/**
 * Checks if a user has a specific permission based on their role
 * @param userId The ID of the user to check
 * @param permissionId The ID of the permission to check
 * @returns Promise resolving to boolean indicating if the user has the permission
 */
export async function checkUserPermission(userId: number, permissionId: string): Promise<boolean> {
  try {
    // Get the user to determine their role
    const user = await db.query.users.findFirst({
      where: (fields, { eq }) => eq(fields.id, userId)
    });

    if (!user) {
      return false;
    }

    // Get the permission
    const permission = await db.query.permissions.findFirst({
      where: (fields, { eq }) => eq(fields.id, permissionId)
    });

    if (!permission) {
      return false;
    }

    // Check if the user's role has access to this permission
    switch (user.role) {
      case 'admin':
        return permission.admin_access;
      case 'team_lead':
        return permission.team_lead_access;
      case 'csm':
        return permission.csm_access;
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error checking permission ${permissionId} for user ${userId}:`, error);
    return false;
  }
}

/**
 * Creates a middleware to check if a user has a specific permission
 * @param permissionId The ID of the permission to check
 * @returns Express middleware that checks the permission
 */
export function requirePermission(permissionId: string) {
  return async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasPermission = await checkUserPermission(req.user.id, permissionId);
    
    if (hasPermission) {
      return next();
    } else {
      return res.status(403).json({ 
        error: 'Permission denied', 
        details: `You do not have the required permission: ${permissionId}` 
      });
    }
  };
}

/**
 * Utility to get all permissions for a specific user
 * @param userId The ID of the user
 * @returns Promise resolving to an array of permission IDs the user has
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  try {
    // Get the user to determine their role
    const user = await db.query.users.findFirst({
      where: (fields, { eq }) => eq(fields.id, userId)
    });

    if (!user) {
      return [];
    }

    // Get all permissions
    const allPermissions = await db.query.permissions.findMany();
    
    // Filter the permissions based on the user's role
    const userPermissions = allPermissions
      .filter(permission => {
        switch (user.role) {
          case 'admin':
            return permission.admin_access;
          case 'team_lead':
            return permission.team_lead_access;
          case 'csm':
            return permission.csm_access;
          default:
            return false;
        }
      })
      .map(p => p.id);
    
    return userPermissions;
  } catch (error) {
    console.error(`Error getting permissions for user ${userId}:`, error);
    return [];
  }
}