import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';
import { googleOAuthService } from '../google-oauth-service';
import { oauthScopeEnum } from '@shared/schema';

const router = Router();

/**
 * Initiates Google OAuth flow
 * GET /api/auth/google
 */
router.get('/google', async (req: Request, res: Response) => {
  try {
    // Generate authorization URL with required scopes
    const scopes = ['email', 'profile'] as const;
    const authUrlResult = await googleOAuthService.getAuthUrl(scopes);
    
    if (!authUrlResult.success) {
      return res.status(500).json({ 
        message: 'Failed to generate Google OAuth URL',
        error: authUrlResult.error
      });
    }
    
    // Store info in session if needed
    if (req.session) {
      req.session.oauthFlow = { state: 'login' };
    }
    
    // Redirect to Google's authorization page
    return res.redirect(authUrlResult.url as string);
  } catch (error) {
    console.error('Google OAuth initialization error:', error);
    return res.status(500).json({ 
      message: 'Failed to initiate Google authentication',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Handles Google OAuth callback
 * GET /api/auth/google/callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Authorization code missing or invalid' });
    }
    
    // For now, we'll use a dummy user ID until we implement proper sessions
    const userId = 1; // This should be the actual user's ID from session
    
    // Exchange the authorization code for tokens
    const exchangeResult = await googleOAuthService.exchangeCodeForTokens(code, userId);
    
    if (!exchangeResult.success) {
      return res.status(500).json({ 
        message: 'Failed to exchange code for tokens',
        error: exchangeResult.error
      });
    }
    
    // Get user info from Google
    const userInfoResult = await googleOAuthService.getUserInfo(userId);
    
    if (!userInfoResult.success) {
      return res.status(500).json({ 
        message: 'Failed to get user info from Google',
        error: userInfoResult.error
      });
    }
    
    const userInfo = userInfoResult.userInfo;
    const email = userInfo?.email;
    
    if (!email) {
      return res.status(500).json({ message: 'Could not retrieve email from Google' });
    }
    
    // Check if this is a signup or login attempt
    const isSignup = req.session?.oauthFlow?.state === 'signup';
    
    // See if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (existingUser) {
      // User exists - handle as login
      // Set session authentication here
      if (req.session) {
        req.session.userId = existingUser.id;
        req.session.userRole = existingUser.role;
      }
      
      return res.redirect('/'); // Redirect to dashboard
    } else if (isSignup) {
      // New user - create account
      // Check if domain is reelo.io for automatic CSM role
      const isReeloEmail = email.endsWith('@reelo.io');
      const role = isReeloEmail ? 'csm' : 'csm'; // Default to CSM for now
      
      // Create the user
      const newUser = {
        name: userInfo?.name || email.split('@')[0],
        email: email,
        role: role
      };
      
      try {
        const result = await db.insert(users).values(newUser).returning();
        
        // Set session authentication here
        if (req.session && result.length > 0) {
          req.session.userId = result[0].id;
          req.session.userRole = role;
        }
        
        return res.redirect('/'); // Redirect to dashboard
      } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ 
          message: 'Failed to create user account',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } else {
      // User doesn't exist and not a signup attempt
      return res.redirect('/auth/signup?email=' + encodeURIComponent(email));
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.status(500).json({ 
      message: 'Failed to process Google authentication',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Initiates Google OAuth flow specifically for signup
 * GET /api/auth/google/signup
 */
router.get('/google/signup', async (req: Request, res: Response) => {
  try {
    // Generate authorization URL with required scopes
    const scopes = ['email', 'profile'] as const;
    const authUrlResult = await googleOAuthService.getAuthUrl(scopes);
    
    if (!authUrlResult.success) {
      return res.status(500).json({ 
        message: 'Failed to generate Google OAuth URL',
        error: authUrlResult.error
      });
    }
    
    // Store info in session
    if (req.session) {
      req.session.oauthFlow = { state: 'signup' };
    }
    
    // Redirect to Google's authorization page
    return res.redirect(authUrlResult.url as string);
  } catch (error) {
    console.error('Google OAuth signup initialization error:', error);
    return res.status(500).json({ 
      message: 'Failed to initiate Google signup',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Logout endpoint
 * GET /api/auth/logout
 */
router.get('/logout', (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      
      res.redirect('/auth/login');
    });
  } else {
    res.redirect('/auth/login');
  }
});

export default router;