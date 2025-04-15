import { Request, Response, NextFunction } from 'express';
import { hasPermission, hasAllPermissions, hasAnyPermission } from '../utils/permission-check';

declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      email: string;
      role: 'admin' | 'team_lead' | 'csm';
    }
    
    interface Request {
      user?: User;
      isAuthenticated(): boolean;
    }
  }
}

/**
 * Middleware to check if a user is authenticated
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized: Please log in to access this resource' });
};

/**
 * Middleware to check if a user is an admin
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  
  res.status(403).json({ error: 'Forbidden: Admin access required' });
};

/**
 * Middleware to check if a user is a team lead or admin
 */
export const isTeamLeadOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.isAuthenticated && 
    req.isAuthenticated() && 
    req.user && 
    ['admin', 'team_lead'].includes(req.user.role)
  ) {
    return next();
  }
  
  res.status(403).json({ error: 'Forbidden: Team Lead or Admin access required' });
};

/**
 * Middleware factory to check if a user has a specific permission
 * @param permissionId The permission ID to check
 */
export const hasPermissionMiddleware = (permissionId: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized: Please log in to access this resource' });
    }
    
    const userHasPermission = await hasPermission(req.user.id, permissionId);
    
    if (userHasPermission) {
      return next();
    }
    
    res.status(403).json({ 
      error: `Forbidden: You don't have the required permission: ${permissionId}` 
    });
  };
};

/**
 * Middleware factory to check if a user has all of the specified permissions
 * @param permissionIds Array of permission IDs to check
 */
export const hasAllPermissionsMiddleware = (permissionIds: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized: Please log in to access this resource' });
    }
    
    const userHasAllPermissions = await hasAllPermissions(req.user.id, permissionIds);
    
    if (userHasAllPermissions) {
      return next();
    }
    
    res.status(403).json({ 
      error: `Forbidden: You don't have all required permissions: ${permissionIds.join(', ')}` 
    });
  };
};

/**
 * Middleware factory to check if a user has any of the specified permissions
 * @param permissionIds Array of permission IDs to check
 */
export const hasAnyPermissionMiddleware = (permissionIds: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized: Please log in to access this resource' });
    }
    
    const userHasAnyPermission = await hasAnyPermission(req.user.id, permissionIds);
    
    if (userHasAnyPermission) {
      return next();
    }
    
    res.status(403).json({ 
      error: `Forbidden: You need at least one of these permissions: ${permissionIds.join(', ')}` 
    });
  };
};