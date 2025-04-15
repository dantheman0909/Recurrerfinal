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