import { Request, Response, Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { googleOAuthService } from '../google-oauth-service';
import bcrypt from 'bcrypt';

const router = Router();

/**
 * Initiate Google OAuth flow for login
 */
export const googleAuthLogin = async (req: Request, res: Response) => {
  try {
    // Initialize Google OAuth service
    const initResult = await googleOAuthService.initialize();
    if (!initResult.success) {
      return res.status(500).json({ error: initResult.error || 'Failed to initialize Google OAuth' });
    }
    
    // Get OAuth URL with appropriate scopes
    const authUrlResult = await googleOAuthService.getAuthUrl(['email', 'profile']);
    if (!authUrlResult.success || !authUrlResult.url) {
      return res.status(500).json({ error: authUrlResult.error || 'Failed to generate authorization URL' });
    }
    
    // Save OAuth flow information in session
    req.session.oauthFlow = 'login';
    
    // Redirect to Google's OAuth page
    res.redirect(authUrlResult.url);
  } catch (error) {
    console.error('Google auth initiation error:', error);
    res.status(500).json({ error: 'An error occurred during OAuth initiation' });
  }
};

/**
 * Handle Google OAuth callback for login
 */
export const googleAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      return res.redirect('/auth/login?error=invalid_code');
    }
    
    // Initialize Google OAuth service
    const initResult = await googleOAuthService.initialize();
    if (!initResult.success) {
      return res.redirect('/auth/login?error=initialization_failed');
    }
    
    // Check if this is login or signup flow
    const isSignup = req.session.oauthFlow === 'signup';
    
    // Exchange code for tokens
    // For simplicity without a user yet, we'll use a placeholder userId
    // In production, this would handle both existing and new users properly
    const temporaryUserId = 0; // placeholder
    const exchangeResult = await googleOAuthService.exchangeCodeForTokens(code, temporaryUserId);
    
    if (!exchangeResult.success) {
      return res.redirect(`/auth/${isSignup ? 'signup' : 'login'}?error=token_exchange_failed`);
    }
    
    // Get user info from Google
    const userInfoResult = await googleOAuthService.getUserInfo(temporaryUserId);
    
    if (!userInfoResult.success || !userInfoResult.userInfo) {
      return res.redirect(`/auth/${isSignup ? 'signup' : 'login'}?error=user_info_failed`);
    }
    
    const googleUser = userInfoResult.userInfo;
    const email = googleUser.email;
    
    // Check if user exists
    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    
    if (existingUsers.length === 0) {
      // User doesn't exist
      if (isSignup) {
        // For signup, create the user
        const isReeloEmail = email.endsWith('@reelo.io');
        const userRole = isReeloEmail ? 'csm' : 'csm'; // Default to CSM, but this could be configurable
        
        // Create new user
        const newUser = {
          name: googleUser.name || `${googleUser.given_name} ${googleUser.family_name}`,
          email: email,
          role: userRole as 'admin' | 'team_lead' | 'csm',
          password: '', // no password for OAuth users
          created_at: new Date(),
          updated_at: new Date()
        };
        
        const result = await db.insert(users).values(newUser).returning();
        if (result && result.length > 0) {
          // Set user in session
          req.session.userId = result[0].id;
          req.session.userRole = userRole;
          
          return res.redirect('/');
        } else {
          return res.redirect('/auth/signup?error=user_creation_failed');
        }
      } else {
        // For login, redirect to signup with email prefilled
        return res.redirect(`/auth/signup?email=${encodeURIComponent(email)}`);
      }
    } else {
      // User exists, log them in
      const user = existingUsers[0];
      req.session.userId = user.id;
      return res.redirect('/');
    }
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.redirect('/auth/login?error=callback_failed');
  }
};

/**
 * Initiate Google OAuth flow for signup
 */
export const googleAuthSignup = async (req: Request, res: Response) => {
  try {
    // Initialize Google OAuth service
    const initResult = await googleOAuthService.initialize();
    if (!initResult.success) {
      return res.status(500).json({ error: initResult.error || 'Failed to initialize Google OAuth' });
    }
    
    // Get OAuth URL with appropriate scopes
    const authUrlResult = await googleOAuthService.getAuthUrl(['email', 'profile']);
    if (!authUrlResult.success || !authUrlResult.url) {
      return res.status(500).json({ error: authUrlResult.error || 'Failed to generate authorization URL' });
    }
    
    // Save OAuth flow information in session
    req.session.oauthFlow = 'signup';
    
    // Redirect to Google's OAuth page
    res.redirect(authUrlResult.url);
  } catch (error) {
    console.error('Google auth signup initiation error:', error);
    res.status(500).json({ error: 'An error occurred during OAuth initiation' });
  }
};

/**
 * Login with email and password
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email
    const userResult = await db.select().from(users).where(eq(users.email, email));
    
    if (!userResult || userResult.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = userResult[0];
    
    // Check if user has a password (might be OAuth-only user)
    if (!user.password) {
      return res.status(401).json({ 
        error: 'This account uses Google sign-in. Please login with Google.',
        useGoogle: true
      });
    }
    
    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Set user in session
    req.session.userId = user.id;
    
    // Return user info without password
    const { password: _, ...safeUser } = user;
    return res.json({ 
      success: true, 
      user: safeUser 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
};

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    // Check if email already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    
    if (existingUser && existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Determine role based on email domain
    const isReeloEmail = email.endsWith('@reelo.io');
    const role = isReeloEmail ? 'csm' : 'csm'; // Default to CSM, but this could be configurable
    
    // Create new user
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role: role as 'admin' | 'team_lead' | 'csm',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await db.insert(users).values(newUser).returning();
    
    if (!result || result.length === 0) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
    
    // Set user in session
    req.session.userId = result[0].id;
    
    // Return user without password
    const { password: _, ...safeUser } = result[0];
    return res.json({ 
      success: true, 
      user: safeUser 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
};

// Set up the routes
router.post('/login', login);
router.post('/register', register);
router.get('/google', googleAuthLogin);
router.get('/google/callback', googleAuthCallback);
router.get('/google/signup', googleAuthSignup);

export default router;