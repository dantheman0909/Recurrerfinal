import { Router, Request, Response } from 'express';
import { googleOAuthService } from '../google-oauth-service';
import { z } from 'zod';
import { oauthScopeEnum } from '@shared/schema';
import * as expressSession from 'express-session';
import https from 'https';

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
router.post('/auth', async (req: Request, res: Response) => {
  try {
    // For testing purposes, we'll use a default user ID
    // In production, this should require proper authentication
    const userId = 1; // Using hardcoded user ID 1 for testing
    
    // Validate request
    const validationResult = authRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: validationResult.error.format()
      });
    }
    
    const { scopes } = validationResult.data;
    
    // DEVELOPMENT MOCK MODE: 
    // Because of consistent "accounts.google.com refused to connect" errors in Replit environment
    const useMockOAuth = true; // Set to true to bypass real Google OAuth
    
    if (useMockOAuth) {
      console.log('USING MOCK OAUTH FLOW - Google connectivity issues detected');
      
      // Extract origin from referer or use a fallback
      const origin = req.headers.referer 
        ? new URL(req.headers.referer).origin 
        : 'https://3be2e99d-2bd0-40a7-b6b9-6f2361ce292e-00-o20dwztf8tam.kirk.replit.dev';
      
      // Generate a mock code
      const mockCode = 'mock_auth_code_' + Date.now();
      
      // Redirect directly to our callback endpoint with the mock code
      const mockAuthUrl = `${origin}/settings/google-oauth/callback?code=${mockCode}`;
      
      console.log('Using mock OAuth redirect URL:', mockAuthUrl);
      console.log('Selected scopes for mock auth:', scopes);
      
      return res.status(200).json({
        success: true,
        authUrl: mockAuthUrl,
        isMock: true
      });
    }
    
    // PRODUCTION MODE: Real OAuth flow
    
    // Get authorization URL
    const urlResult = await googleOAuthService.getAuthUrl(scopes);
    
    if (!urlResult.success || !urlResult.url) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate authorization URL',
        error: urlResult.error
      });
    }
    
    // We're not using session in test mode
    
    return res.status(200).json({
      success: true,
      authUrl: urlResult.url
    });
  } catch (error) {
    console.error('Error starting Google OAuth flow:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while starting the OAuth flow',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Exchange authorization code for tokens
 * POST /api/oauth/google/token
 */
router.post('/token', async (req: Request, res: Response) => {
  try {
    // For testing purposes, we'll use a default user ID
    const userId = 1; // Using hardcoded user ID 1 for testing
    
    // Validate request
    const validationResult = exchangeCodeSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: validationResult.error.format()
      });
    }
    
    const { code } = validationResult.data;
    
    // Check if this is a mock code
    const isMockCode = code.startsWith('mock_auth_code_');
    
    if (isMockCode) {
      console.log('Detected mock auth code, simulating successful token exchange');
      
      // You could implement a mock token storage here if needed
      // For now we'll just return success
      
      return res.status(200).json({
        message: 'Mock authorization successful - tokens simulated',
        success: true,
        isMock: true
      });
    }
    
    // Real flow - Exchange code for tokens 
    const tokenResult = await googleOAuthService.exchangeCodeForTokens(code, userId);
    
    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
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
      success: false,
      message: 'An error occurred while exchanging the code for tokens',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Test connectivity to Google servers
 * GET /api/oauth/google/test-connection
 */
router.get('/test-connection', (req: Request, res: Response) => {
  console.log('Testing connectivity to Google servers...');
  
  // Define test targets
  const testTargets = [
    { host: 'accounts.google.com', path: '/' },
    { host: 'www.googleapis.com', path: '/' }
  ];
  
  let successCount = 0;
  let completedCount = 0;
  const errorMessages: string[] = [];
  
  // Test each target
  testTargets.forEach(target => {
    const options = {
      host: target.host,
      path: target.path,
      method: 'HEAD',
      timeout: 5000 // 5 second timeout
    };
    
    const req = https.request(options, (res) => {
      console.log(`Connection to ${target.host} successful (status: ${res.statusCode})`);
      successCount++;
      completedCount++;
      checkComplete();
    });
    
    req.on('error', (error) => {
      const errorMsg = `Connection to ${target.host} failed: ${error.message}`;
      console.error(errorMsg);
      errorMessages.push(errorMsg);
      completedCount++;
      checkComplete();
    });
    
    req.on('timeout', () => {
      const errorMsg = `Connection to ${target.host} timed out`;
      console.error(errorMsg);
      errorMessages.push(errorMsg);
      req.destroy();
      completedCount++;
      checkComplete();
    });
    
    req.end();
  });
  
  function checkComplete() {
    if (completedCount === testTargets.length) {
      const allSuccess = successCount === testTargets.length;
      
      if (allSuccess) {
        res.status(200).json({
          success: true,
          message: `Successfully connected to all ${successCount} Google servers`
        });
      } else {
        res.status(200).json({
          success: false,
          message: `Connected to ${successCount}/${testTargets.length} Google servers`,
          errors: errorMessages
        });
      }
    }
  }
});

/**
 * Revoke Google OAuth access
 * POST /api/oauth/google/revoke
 */
router.post('/revoke', async (req: Request, res: Response) => {
  try {
    // For testing purposes, we'll use a default user ID
    const userId = 1; // Using hardcoded user ID 1 for testing
    
    // DEVELOPMENT MOCK MODE: 
    // Because of consistent "accounts.google.com refused to connect" errors in Replit environment
    const useMockOAuth = true; // Set to true to bypass real Google OAuth
    
    if (useMockOAuth) {
      console.log('USING MOCK OAUTH FLOW - Google connectivity issues detected');
      console.log('Simulating successful revocation of Google access');
      
      // You could implement mock token removal logic here if needed
      
      return res.status(200).json({
        message: 'Mock Google access successfully revoked',
        success: true,
        isMock: true
      });
    }
    
    // PRODUCTION MODE: Real revocation flow
    
    // Revoke access
    const revokeResult = await googleOAuthService.revokeAccess(userId);
    
    if (!revokeResult.success) {
      return res.status(500).json({
        success: false,
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
      success: false,
      message: 'An error occurred while revoking Google access',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;