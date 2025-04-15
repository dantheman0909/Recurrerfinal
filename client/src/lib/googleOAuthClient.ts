import { apiRequest } from '@/lib/queryClient';

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleOAuthScope = 'email' | 'profile' | 'gmail' | 'calendar';

export const GoogleOAuthService = {
  /**
   * Save Google OAuth configuration
   */
  saveConfig: async (config: GoogleOAuthConfig) => {
    return apiRequest('/api/oauth/google/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  /**
   * Check if Google OAuth is configured
   */
  getStatus: async () => {
    return apiRequest('/api/oauth/google/status');
  },

  /**
   * Get authorization URL for Google OAuth
   */
  getAuthUrl: async (scopes: GoogleOAuthScope[]) => {
    return apiRequest('/api/oauth/google/auth', {
      method: 'POST',
      body: JSON.stringify({ scopes }),
    });
  },

  /**
   * Exchange authorization code for tokens
   */
  exchangeCode: async (code: string) => {
    return apiRequest('/api/oauth/google/token', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  /**
   * Revoke Google OAuth access
   */
  revokeAccess: async () => {
    return apiRequest('/api/oauth/google/revoke', {
      method: 'POST',
    });
  },
};