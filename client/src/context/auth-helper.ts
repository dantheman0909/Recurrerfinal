// Define the User type
export type User = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'team_lead' | 'csm';
  created_at: string;
  updated_at: string;
};

// Define the AuthContextType 
export type AuthContextType = {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  isAuthenticated: boolean; // Alias for authenticated, for consistency with other hooks
  isLoading: boolean; // Alias for loading, for consistency with other hooks
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: () => void;
  googleSignup: () => void;
  refreshUser: () => Promise<void>; // Function to refresh user data
};