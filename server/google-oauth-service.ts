import { google, Auth } from 'googleapis';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { googleOAuthConfig, userOAuthTokens, oauthScopeEnum } from '@shared/schema';

type GoogleOAuthScope = typeof oauthScopeEnum.enumValues[number];

/**
 * Service for handling Google OAuth2 authentication flows
 */
export class GoogleOAuthService {
  private oAuth2Client: Auth.OAuth2Client | null = null;
  private configId: number | null = null;
  
  /**
   * Initialize the OAuth2 client with config from the database
   */
  async initialize(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Get OAuth configuration from the database
      const config = await db.select().from(googleOAuthConfig).limit(1);
      
      if (!config || config.length === 0) {
        return { 
          success: false, 
          message: 'No Google OAuth configuration found in the database',
          error: 'Configuration not found'
        };
      }
      
      const { client_id, client_secret, redirect_uri, id } = config[0];
      
      if (!client_id || !client_secret || !redirect_uri) {
        return { 
          success: false,
          message: 'Invalid Google OAuth configuration',
          error: 'Missing required fields in configuration'
        };
      }
      
      // Create OAuth2 client
      this.oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uri
      );
      
      this.configId = id;
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing Google OAuth service:', error);
      return { 
        success: false,
        message: 'Failed to initialize Google OAuth service',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Check if the OAuth service is initialized
   */
  isInitialized(): boolean {
    return this.oAuth2Client !== null;
  }
  
  /**
   * Get authorization URL for Google OAuth flow
   */
  async getAuthUrl(scopes: GoogleOAuthScope[]): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Always reinitialize to make sure we have the latest config
      const result = await this.initialize();
      if (!result.success) {
        return { 
          success: false, 
          error: result.error || 'Failed to initialize Google OAuth service'
        };
      }
      
      if (!this.oAuth2Client) {
        return { 
          success: false, 
          error: 'OAuth2 client not initialized'
        };
      }
      
      // Map our internal scope names to Google's OAuth scope URLs
      const googleScopes: string[] = scopes.map(scope => {
        switch (scope) {
          case 'email':
            return 'https://www.googleapis.com/auth/userinfo.email';
          case 'profile':
            return 'https://www.googleapis.com/auth/userinfo.profile';
          case 'gmail':
            return 'https://www.googleapis.com/auth/gmail.readonly';
          case 'calendar':
            return 'https://www.googleapis.com/auth/calendar.readonly';
          default:
            return '';
        }
      }).filter(scope => scope !== '');
      
      if (googleScopes.length === 0) {
        return {
          success: false,
          error: 'No valid scopes provided'
        };
      }
      
      console.log('Using scopes:', googleScopes);
      
      // Generate auth URL with specified scopes
      const authUrl = this.oAuth2Client.generateAuthUrl({
        access_type: 'offline', // Need offline access for refresh token
        scope: googleScopes,
        prompt: 'consent' // Force consent screen to ensure refresh token
      });
      
      return { success: true, url: authUrl };
    } catch (error) {
      console.error('Error generating auth URL:', error);
      return { 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, userId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!this.isInitialized()) {
        const result = await this.initialize();
        if (!result.success) {
          return { 
            success: false, 
            error: result.error || 'Failed to initialize Google OAuth service'
          };
        }
      }
      
      if (!this.oAuth2Client) {
        return { 
          success: false, 
          error: 'OAuth2 client not initialized'
        };
      }

      // Exchange code for tokens
      const { tokens } = await this.oAuth2Client.getToken(code);
      
      if (!tokens || !tokens.access_token) {
        return { 
          success: false, 
          error: 'Failed to obtain tokens from Google'
        };
      }
      
      // Set credentials for the client
      this.oAuth2Client.setCredentials(tokens);
      
      // Get user's profile information to verify the token
      const oauth2 = google.oauth2({
        auth: this.oAuth2Client,
        version: 'v2'
      });
      
      const userInfo = await oauth2.userinfo.get();
      
      if (!userInfo.data || !userInfo.data.email) {
        return { 
          success: false, 
          error: 'Failed to validate user identity with Google'
        };
      }
      
      // Calculate token expiry time
      const expiresAt = tokens.expiry_date 
        ? new Date(tokens.expiry_date) 
        : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
      
      // Determine the granted scopes
      const grantedScopes = (tokens.scope || '')
        .split(' ')
        .map(scope => {
          if (scope.includes('userinfo.email')) return 'email';
          if (scope.includes('userinfo.profile')) return 'profile'; 
          if (scope.includes('gmail')) return 'gmail';
          if (scope.includes('calendar')) return 'calendar';
          return null;
        })
        .filter((scope): scope is GoogleOAuthScope => scope !== null);
      
      // Check if token already exists for this user
      const existingTokens = await db
        .select()
        .from(userOAuthTokens)
        .where(eq(userOAuthTokens.user_id, userId))
        .where(eq(userOAuthTokens.provider, 'google'));
      
      if (existingTokens.length > 0) {
        // Update existing token
        await db
          .update(userOAuthTokens)
          .set({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || existingTokens[0].refresh_token,
            token_type: tokens.token_type || 'Bearer',
            scopes: grantedScopes,
            expires_at: expiresAt,
            updated_at: new Date()
          })
          .where(eq(userOAuthTokens.id, existingTokens[0].id));
      } else {
        // Insert new token
        await db
          .insert(userOAuthTokens)
          .values({
            user_id: userId,
            provider: 'google',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_type: tokens.token_type || 'Bearer',
            scopes: grantedScopes,
            expires_at: expiresAt
          });
      }
      
      return { 
        success: true, 
        message: 'Successfully authenticated with Google' 
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      return { 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get authenticated client for a user
   */
  async getAuthenticatedClient(userId: number): Promise<{ success: boolean; client?: Auth.OAuth2Client; error?: string }> {
    try {
      if (!this.isInitialized()) {
        const result = await this.initialize();
        if (!result.success) {
          return { 
            success: false, 
            error: result.error || 'Failed to initialize Google OAuth service'
          };
        }
      }
      
      if (!this.oAuth2Client) {
        return { 
          success: false, 
          error: 'OAuth2 client not initialized'
        };
      }
      
      // Get user's token
      const tokens = await db
        .select()
        .from(userOAuthTokens)
        .where(eq(userOAuthTokens.user_id, userId))
        .where(eq(userOAuthTokens.provider, 'google'));
      
      if (!tokens || tokens.length === 0) {
        return { 
          success: false, 
          error: 'No Google token found for user'
        };
      }
      
      const userToken = tokens[0];
      
      // Check if token is expired
      if (userToken.expires_at && userToken.expires_at < new Date()) {
        // Token is expired, need to refresh
        if (!userToken.refresh_token) {
          return { 
            success: false, 
            error: 'Token expired and no refresh token available'
          };
        }
        
        // Set refresh token and refresh
        this.oAuth2Client.setCredentials({
          refresh_token: userToken.refresh_token
        });
        
        // Refresh token
        const { credentials } = await this.oAuth2Client.refreshAccessToken();
        
        if (!credentials || !credentials.access_token) {
          return { 
            success: false, 
            error: 'Failed to refresh token'
          };
        }
        
        // Calculate new expiry time
        const expiresAt = credentials.expiry_date 
          ? new Date(credentials.expiry_date) 
          : new Date(Date.now() + (credentials.expires_in || 3600) * 1000);
        
        // Update token in database
        await db
          .update(userOAuthTokens)
          .set({
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token || userToken.refresh_token,
            expires_at: expiresAt,
            updated_at: new Date()
          })
          .where(eq(userOAuthTokens.id, userToken.id));
        
        // Use updated credentials
        this.oAuth2Client.setCredentials(credentials);
      } else {
        // Token is valid, set credentials
        this.oAuth2Client.setCredentials({
          access_token: userToken.access_token,
          refresh_token: userToken.refresh_token,
          token_type: userToken.token_type
        });
      }
      
      return { success: true, client: this.oAuth2Client };
    } catch (error) {
      console.error('Error getting authenticated client:', error);
      return { 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Revoke access for a user
   */
  async revokeAccess(userId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Get user's token
      const tokens = await db
        .select()
        .from(userOAuthTokens)
        .where(eq(userOAuthTokens.user_id, userId))
        .where(eq(userOAuthTokens.provider, 'google'));
      
      if (!tokens || tokens.length === 0) {
        return { 
          success: false, 
          error: 'No Google token found for user'
        };
      }
      
      if (!this.isInitialized()) {
        const result = await this.initialize();
        if (!result.success) {
          return { 
            success: false, 
            error: result.error || 'Failed to initialize Google OAuth service'
          };
        }
      }
      
      if (!this.oAuth2Client) {
        return { 
          success: false, 
          error: 'OAuth2 client not initialized'
        };
      }
      
      // Revoke token at Google
      if (tokens[0].access_token) {
        try {
          await this.oAuth2Client.revokeToken(tokens[0].access_token);
        } catch (revokeError) {
          console.warn('Error revoking token:', revokeError);
          // Continue to delete from database even if revoke fails
        }
      }
      
      // Delete from database
      await db
        .delete(userOAuthTokens)
        .where(eq(userOAuthTokens.id, tokens[0].id));
      
      return { 
        success: true, 
        message: 'Successfully revoked Google access'
      };
    } catch (error) {
      console.error('Error revoking access:', error);
      return { 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Store OAuth configuration in the database
   */
  async storeConfig(
    clientId: string, 
    clientSecret: string, 
    redirectUri: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const existingConfigs = await db
        .select()
        .from(googleOAuthConfig);
      
      if (existingConfigs.length > 0) {
        // Update existing config
        await db
          .update(googleOAuthConfig)
          .set({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            updated_at: new Date()
          })
          .where(eq(googleOAuthConfig.id, existingConfigs[0].id));
      } else {
        // Insert new config
        await db
          .insert(googleOAuthConfig)
          .values({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            enabled: true
          });
      }
      
      // Reinitialize the client with new config
      this.oAuth2Client = null;
      this.configId = null;
      await this.initialize();
      
      return { 
        success: true, 
        message: 'Google OAuth configuration updated successfully'
      };
    } catch (error) {
      console.error('Error storing OAuth config:', error);
      return { 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Singleton instance
export const googleOAuthService = new GoogleOAuthService();