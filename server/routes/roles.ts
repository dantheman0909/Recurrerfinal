import express from 'express';
import { db } from '../db';
import { permissions } from '@shared/schema';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Get all permissions with role access
router.get('/permissions', isAuthenticated, async (req, res) => {
  try {
    const permissionsList = await db.query.permissions.findMany();
    res.json(permissionsList);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch permissions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update permissions
router.put('/permissions', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { permissions: updatedPermissions } = req.body;
    
    if (!Array.isArray(updatedPermissions)) {
      return res.status(400).json({ error: 'Invalid permissions data format' });
    }
    
    // Update each permission
    const results = await Promise.all(
      updatedPermissions.map(async (permission) => {
        return db.update(permissions)
          .set({ 
            admin_access: permission.admin_access,
            team_lead_access: permission.team_lead_access,
            csm_access: permission.csm_access
          })
          .where(eq(permissions.id, permission.id));
      })
    );
    
    res.json({ success: true, message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ 
      error: 'Failed to update permissions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get user permissions based on role
router.get('/user-permissions', isAuthenticated, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userRole = req.user.role;
    
    // Get all permissions
    const allPermissions = await db.query.permissions.findMany();
    
    // Filter permissions based on user role
    const userPermissions = allPermissions
      .filter(permission => {
        switch (userRole) {
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
    
    res.json({ permissions: userPermissions });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user permissions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;