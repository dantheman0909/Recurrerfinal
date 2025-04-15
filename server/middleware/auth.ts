import { Request, Response, NextFunction } from 'express';

// Extend express session
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      name: string;
      email: string;
      role: 'admin' | 'team_lead' | 'csm';
      [key: string]: any;
    };
  }
}

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.user) {
    // Add user to request object
    req.user = req.session.user;
    return next();
  }
  
  // User is not authenticated
  return res.status(401).json({ error: 'Authentication required' });
};

// Middleware to check if user is an admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  // User is not an admin
  return res.status(403).json({ error: 'Admin access required' });
};

// Middleware to check if user is a team lead
export const isTeamLead = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'team_lead')) {
    return next();
  }
  
  // User is not a team lead or admin
  return res.status(403).json({ error: 'Team lead access required' });
};

// Middleware to check if user has permission to access a specific customer
export const canAccessCustomer = (req: Request, res: Response, next: NextFunction) => {
  const { customerId } = req.params;
  
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role === 'admin') {
    // Admins can access all customers
    return next();
  }

  if (req.user.role === 'team_lead') {
    // Team leads can access customers assigned to their team
    // This would need to be checked against the database
    // For now, we'll let team leads through
    return next();
  }

  if (req.user.role === 'csm') {
    // CSMs can only access their assigned customers
    // This would need to be checked against the database
    if (req.user.assigned_customers && req.user.assigned_customers.includes(parseInt(customerId))) {
      return next();
    }
  }
  
  // User doesn't have access to this customer
  return res.status(403).json({ error: 'Access to this customer denied' });
};

// Type definition for the Express Request with user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name: string;
        email: string;
        role: 'admin' | 'team_lead' | 'csm';
        assigned_customers?: number[];
        [key: string]: any;
      };
    }
  }
}