import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { signInWithGoogle, signOut as supabaseSignOut, getCurrentUser } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: "admin" | "team_lead" | "csm";
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    async function loadUser() {
      try {
        setIsLoading(true);
        const { data, error } = await getCurrentUser();
        
        if (error) {
          console.error("Error getting current user:", error);
          return;
        }
        
        if (data?.user) {
          // Try to get user profile from our API
          try {
            const response = await fetch(`/api/users/${data.user.id}`);
            
            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
            } else {
              // User exists in Supabase but not in our database
              // Create user profile
              const newUser = {
                id: data.user.id,
                email: data.user.email || "",
                fullName: data.user.user_metadata?.full_name || null,
                avatarUrl: data.user.user_metadata?.avatar_url || null,
                role: "csm" // Default role
              };
              
              const createResponse = await apiRequest("POST", "/api/users", newUser);
              if (createResponse.ok) {
                const createdUser = await createResponse.json();
                setUser(createdUser);
              } else {
                throw new Error("Failed to create user profile");
              }
            }
          } catch (err) {
            // If we can't reach our API, at least set basic user data 
            console.error("Error fetching user profile:", err);
            setUser({
              id: data.user.id,
              email: data.user.email || "",
              fullName: data.user.user_metadata?.full_name || null,
              avatarUrl: data.user.user_metadata?.avatar_url || null,
              role: "csm" // Default role
            });
          }
        } else {
          setUser(null);
          // Redirect to auth if not on auth page
          if (window.location.pathname !== "/auth") {
            navigate("/auth");
          }
        }
      } catch (err) {
        console.error("Error in loadUser:", err);
        setError("Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [navigate]);

  const signIn = async () => {
    try {
      setIsLoading(true);
      const { error } = await signInWithGoogle();
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Will automatically redirect to the callback URL
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err.message || "Failed to sign in");
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabaseSignOut();
      setUser(null);
      navigate("/auth");
    } catch (err: any) {
      console.error("Sign out error:", err);
      setError(err.message || "Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, isLoading, error, signIn, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserContextProvider");
  }
  return context;
}
