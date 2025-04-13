import { createClient } from '@supabase/supabase-js';

// Fallback to mock mode when no Supabase credentials are provided
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

// Create a Supabase client if credentials are available
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Function to check if Supabase is available
export const isSupabaseAvailable = () => {
  return !!supabase;
};

// Auth functions with mock fallbacks
export async function signInWithGoogle() {
  if (!supabase) {
    console.warn('Supabase not configured. Using mock auth.');
    // Return mock successful sign-in in development
    return {
      data: {
        user: {
          id: 'user-1',
          email: 'admin@recurrer.com',
          user_metadata: {
            full_name: 'Alex Morgan',
            avatar_url: null
          }
        },
        session: { access_token: 'mock-token' }
      },
      error: null
    };
  }
  
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
}

export async function signOut() {
  if (!supabase) {
    console.warn('Supabase not configured. Using mock auth.');
    // Mock sign out (would clear session in real implementation)
    return { error: null };
  }
  
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  if (!supabase) {
    console.warn('Supabase not configured. Using mock auth.');
    // Return mock user in development
    return {
      data: {
        user: {
          id: 'user-1',
          email: 'admin@recurrer.com',
          user_metadata: {
            full_name: 'Alex Morgan',
            avatar_url: null
          }
        }
      },
      error: null
    };
  }
  
  return await supabase.auth.getUser();
}

export async function getSession() {
  if (!supabase) {
    console.warn('Supabase not configured. Using mock auth.');
    // Return mock session in development
    return {
      data: {
        session: {
          access_token: 'mock-token',
          expires_at: Date.now() + 3600,
          user: {
            id: 'user-1',
            email: 'admin@recurrer.com',
            user_metadata: {
              full_name: 'Alex Morgan',
              avatar_url: null
            }
          }
        }
      },
      error: null
    };
  }
  
  return await supabase.auth.getSession();
}
