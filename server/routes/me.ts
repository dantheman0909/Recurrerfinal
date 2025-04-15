import { Router, Request, Response } from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';

const router = Router();

/**
 * Get current authenticated user information
 * GET /api/me
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        authenticated: false,
        message: 'Not authenticated' 
      });
    }
    
    // Get user information
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!user) {
      return res.status(401).json({ 
        authenticated: false,
        message: 'User not found' 
      });
    }
    
    // Return user information (excluding sensitive data)
    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        team_lead_id: user.team_lead_id
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ 
      authenticated: false,
      message: 'Error fetching user data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;