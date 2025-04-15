import { Request, Response, Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Get current authenticated user's information
 */
export const getMe = async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.json({
      authenticated: false,
      user: null
    });
  }

  try {
    // Get user from database
    const userResult = await db.select().from(users).where(eq(users.id, req.session.userId));
    
    if (!userResult || userResult.length === 0) {
      return res.json({
        authenticated: false,
        user: null
      });
    }
    
    // Return user information, omitting sensitive data like password
    const user = userResult[0];
    const { password, ...safeUser } = user;
    
    return res.json({
      authenticated: true,
      user: safeUser
    });
  } catch (error) {
    console.error('Error retrieving user information:', error);
    return res.status(500).json({ 
      authenticated: false,
      error: 'Internal server error' 
    });
  }
};

/**
 * Logout the current user
 */
export const logout = async (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      
      // Clear cookie
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully' });
    });
  } else {
    return res.json({ success: true, message: 'No active session' });
  }
};

// Set up the routes
router.get('/', getMe);
router.post('/logout', logout);

export default router;