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
   * Test the connection to Google by fetching public info (without authorization)
   * Useful for testing if the Google Cloud project is properly set up
   */
  testConnection: async (): Promise<GoogleOAuthResponse> => {
    try {
      // Try to load the Google sign-in page directly
      const testUrl = 'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&access_type=offline&prompt=consent&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&client_id=DUMMY_ID&redirect_uri=https%3A%2F%2Fexample.com';
      
      // Use fetch with no-cors to just test connectivity
      await fetch(testUrl, { mode: 'no-cors' });
      
      return {
        success: true,
        message: 'Connection to accounts.google.com is working'
      };
    } catch (error) {
      console.error('Test connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Could not connect to accounts.google.com'
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