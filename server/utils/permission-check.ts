import { db } from '../db';
import { permissions as permissionsTable, users as usersTable } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Check if a user has a specific permission
 * @param userId - The user ID to check
 * @param permissionId - The permission ID to check
 * @returns Boolean indicating if the user has the permission
 */
export async function hasPermission(userId: number, permissionId: string): Promise<boolean> {
  try {
    // Get user
    const user = await db.query.users.findFirst({
      where: eq(usersTable.id, userId)
    });

    if (!user) {
      return false;
    }

    // Get the permission
    const permission = await db.query.permissions.findFirst({
      where: eq(permissionsTable.id, permissionId)
    });

    if (!permission) {
      return false;
    }

    // Check if the user has the permission based on their role
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
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if a user has all of the specified permissions
 * @param userId - The user ID to check
 * @param permissionIds - Array of permission IDs to check
 * @returns Boolean indicating if the user has all the permissions
 */
export async function hasAllPermissions(userId: number, permissionIds: string[]): Promise<boolean> {
  try {
    for (const permissionId of permissionIds) {
      const hasThisPermission = await hasPermission(userId, permissionId);
      if (!hasThisPermission) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error checking all permissions:', error);
    return false;
  }
}

/**
 * Check if a user has any of the specified permissions
 * @param userId - The user ID to check
 * @param permissionIds - Array of permission IDs to check
 * @returns Boolean indicating if the user has any of the permissions
 */
export async function hasAnyPermission(userId: number, permissionIds: string[]): Promise<boolean> {
  try {
    for (const permissionId of permissionIds) {
      const hasThisPermission = await hasPermission(userId, permissionId);
      if (hasThisPermission) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking any permissions:', error);
    return false;
  }
}

/**
 * Get all permissions a user has based on their role
 * @param userId - The user ID to check
 * @returns Array of permission IDs the user has
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  try {
    // Get user
    const user = await db.query.users.findFirst({
      where: eq(usersTable.id, userId)
    });

    if (!user) {
      return [];
    }

    // Get all permissions
    const allPermissions = await db.query.permissions.findMany();

    // Filter permissions based on user role
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
    console.error('Error getting user permissions:', error);
    return [];
  }
}