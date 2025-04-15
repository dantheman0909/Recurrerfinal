import { apiRequest } from '@/lib/queryClient';

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleOAuthScope = 'email' | 'profile' | 'gmail' | 'calendar';

export type GoogleOAuthStatus = {
  configured: boolean;
  connected?: boolean;
  scopes?: string[];
};

export type GoogleOAuthUrlResponse = {
  success: boolean;
  authUrl?: string;
  error?: string;
};

export type GoogleOAuthResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export const GoogleOAuthService = {
  /**
   * Save Google OAuth configuration
   */
  saveConfig: async (config: GoogleOAuthConfig): Promise<GoogleOAuthResponse> => {
    const response = await apiRequest('POST', '/api/oauth/google/config', config);
    return response.json();
  },

  /**
   * Check if Google OAuth is configured
   */
  getStatus: async (): Promise<GoogleOAuthStatus> => {
    const response = await apiRequest('GET', '/api/oauth/google/status');
    return response.json();
  },
  
  /**
   * Get Google OAuth configuration details
   */
  getConfig: async (): Promise<GoogleOAuthConfig> => {
    const response = await apiRequest('GET', '/api/oauth/google/config');
    return response.json();
  },
  
  /**
   * Test the connection to Google servers
   * Checks connectivity to multiple Google endpoints from the server-side
   */
  testConnection: async (): Promise<GoogleOAuthResponse> => {
    try {
      // Use our server-side test endpoint that does an actual connection test
      // This is more reliable than client-side testing
      console.log('Testing connection to Google servers via server endpoint...');
      const response = await apiRequest('GET', '/api/oauth/google/test-connection');
      const result = await response.json();
      
      console.log('Connection test result:', result);
      
      return {
        success: result.success,
        message: result.message,
        error: result.errors ? result.errors.join(', ') : undefined
      };
    } catch (error) {
      console.error('Test connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Could not perform connection test to Google servers'
      };
    }
  },

  /**
   * Get authorization URL for Google OAuth
   */
  getAuthUrl: async (scopes: GoogleOAuthScope[]): Promise<GoogleOAuthUrlResponse> => {
    const response = await apiRequest('POST', '/api/oauth/google/auth', { scopes });
    return response.json();
  },

  /**
   * Exchange authorization code for tokens
   */
  exchangeCode: async (code: string): Promise<GoogleOAuthResponse> => {
    const response = await apiRequest('POST', '/api/oauth/google/token', { code });
    return response.json();
  },

  /**
   * Revoke Google OAuth access
   */
  revokeAccess: async (): Promise<GoogleOAuthResponse> => {
    const response = await apiRequest('POST', '/api/oauth/google/revoke');
    return response.json();
  },
};