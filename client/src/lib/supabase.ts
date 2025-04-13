import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY || '';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// Create Supabase client for client-side usage (with anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create Supabase admin client for server-side operations that need additional permissions
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Google OAuth configuration
export const googleAuthConfig = {
  provider: 'google',
  options: {
    redirectTo: getRedirectURL(),
    scopes: 'email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly'
  }
};

// Helper function to handle login with Google
export async function signInWithGoogle() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials missing. Using mock mode.');
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth(googleAuthConfig);
  
  if (error) {
    throw error;
  }
  
  return data;
}

// Helper function to get the user's session
export async function getSession() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Helper function to get the current user
export async function getCurrentUser() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// Helper function to sign out
export async function signOut() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return;
  }
  
  await supabase.auth.signOut();
}

// Helper function to get redirect URL based on environment
function getRedirectURL() {
  // Use environment variable if available
  const domains = process.env.REPLIT_DOMAINS?.split(',');
  
  if (domains && domains.length > 0) {
    return `https://${domains[0]}/auth/callback`;
  }
  
  // Fallback for local development
  return `${window.location.origin}/auth/callback`;
}

// Check if we're running in mock mode (no Supabase credentials)
export const isMockMode = !supabaseUrl || !supabaseAnonKey;
