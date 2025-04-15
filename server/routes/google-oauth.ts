import { Router, Request, Response } from 'express';
import { googleOAuthService } from '../google-oauth-service';
import { z } from 'zod';
import { oauthScopeEnum } from '@shared/schema';
import * as expressSession from 'express-session';

// Extend Express Request to include session
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

// Define a typed request with session
interface RequestWithSession extends Request {
  session: expressSession.Session & expressSession.SessionData;
}

const router = Router();

// Validate OAuth config
const configSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  redirectUri: z.string().url('Must be a valid URL')
});

// Validate auth request
const authRequestSchema = z.object({
  scopes: z.array(z.enum(oauthScopeEnum.enumValues)).min(1, 'At least one scope is required')
});

// Validate token exchange
const exchangeCodeSchema = z.object({
  code: z.string().min(1, 'Authorization code is required')
});

/**
 * Store Google OAuth configuration
 * POST /api/oauth/google/config
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = configSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid configuration data',
        errors: validationResult.error.format()
      });
    }
    
    const { clientId, clientSecret, redirectUri } = validationResult.data;
    
    // Save configuration
    const result = await googleOAuthService.storeConfig(clientId, clientSecret, redirectUri);
    
    if (!result.success) {
      return res.status(500).json({
        message: result.message || 'Failed to store OAuth configuration',
        error: result.error
      });
    }
    
    return res.status(200).json({
      message: result.message,
      success: true
    });
  } catch (error) {
    console.error('Error saving Google OAuth config:', error);
    return res.status(500).json({
      message: 'An error occurred while saving the OAuth configuration',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get Google OAuth configuration status
 * GET /api/oauth/google/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const initResult = await googleOAuthService.initialize();
    
    return res.status(200).json({
      configured: initResult.success,
      message: initResult.message || (initResult.success 
        ? 'Google OAuth is properly configured' 
        : 'Google OAuth is not configured or has invalid configuration')
    });
  } catch (error) {
    console.error('Error checking Google OAuth status:', error);
    return res.status(500).json({
      message: 'An error occurred while checking OAuth status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Start Google OAuth authorization flow
 * POST /api/oauth/google/auth
 */
router.post('/auth', async (req: RequestWithSession, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }
    
    // Validate request
    const validationResult = authRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid request',
        errors: validationResult.error.format()
      });
    }
    
    const { scopes } = validationResult.data;
    
    // Get authorization URL
    const urlResult = await googleOAuthService.getAuthUrl(scopes);
    
    if (!urlResult.success || !urlResult.url) {
      return res.status(500).json({
        message: 'Failed to generate authorization URL',
        error: urlResult.error
      });
    }
    
    return res.status(200).json({
      authUrl: urlResult.url
    });
  } catch (error) {
    console.error('Error starting Google OAuth flow:', error);
    return res.status(500).json({
      message: 'An error occurred while starting the OAuth flow',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Exchange authorization code for tokens
 * POST /api/oauth/google/token
 */
router.post('/token', async (req: RequestWithSession, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }
    
    // Validate request
    const validationResult = exchangeCodeSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid request',
        errors: validationResult.error.format()
      });
    }
    
    const { code } = validationResult.data;
    const userId = req.session.userId;
    
    // Exchange code for tokens
    const tokenResult = await googleOAuthService.exchangeCodeForTokens(code, userId);
    
    if (!tokenResult.success) {
      return res.status(500).json({
        message: tokenResult.message || 'Failed to exchange code for tokens',
        error: tokenResult.error
      });
    }
    
    return res.status(200).json({
      message: tokenResult.message,
      success: true
    });
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return res.status(500).json({
      message: 'An error occurred while exchanging the code for tokens',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Revoke Google OAuth access
 * POST /api/oauth/google/revoke
 */
router.post('/revoke', async (req: RequestWithSession, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }
    
    const userId = req.session.userId;
    
    // Revoke access
    const revokeResult = await googleOAuthService.revokeAccess(userId);
    
    if (!revokeResult.success) {
      return res.status(500).json({
        message: revokeResult.message || 'Failed to revoke access',
        error: revokeResult.error
      });
    }
    
    return res.status(200).json({
      message: revokeResult.message,
      success: true
    });
  } catch (error) {
    console.error('Error revoking Google access:', error);
    return res.status(500).json({
      message: 'An error occurred while revoking Google access',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;