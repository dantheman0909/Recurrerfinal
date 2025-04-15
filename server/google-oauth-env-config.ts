import { db } from "./db";
import { googleOAuthConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Initialize the Google OAuth configuration using environment variables
 * This ensures that the Google OAuth service always uses the latest credentials
 * even in environments where the database might be reset
 */
async function initializeGoogleOAuthConfig() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // Only proceed if we have the required environment variables
    if (!clientId || !clientSecret) {
      console.log("Google OAuth environment variables not found. Skipping configuration.");
      return;
    }
    
    console.log("Initializing Google OAuth configuration from environment variables...");
    
    // Define redirect URI based on environment
    // In production, this should come from an environment variable as well
    const baseUrl = process.env.BASE_URL || 
                    (process.env.NODE_ENV === 'production' 
                     ? 'https://your-production-domain.com' 
                     : 'https://3be2e99d-2bd0-40a7-b6b9-6f2361ce292e-00-o20dwztf8tam.kirk.replit.dev');
    
    const redirectUri = `${baseUrl}/settings/google-oauth/callback`;
    
    // Check if there's an existing configuration
    const existingConfigs = await db
      .select()
      .from(googleOAuthConfig);
    
    if (existingConfigs.length > 0) {
      // Update existing configuration
      await db
        .update(googleOAuthConfig)
        .set({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          updated_at: new Date()
        })
        .where(eq(googleOAuthConfig.id, existingConfigs[0].id));
      
      console.log("Updated existing Google OAuth configuration with environment variables.");
    } else {
      // Insert new configuration
      await db
        .insert(googleOAuthConfig)
        .values({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          enabled: true
        });
      
      console.log("Created new Google OAuth configuration from environment variables.");
    }
  } catch (error) {
    console.error("Error initializing Google OAuth configuration:", error);
  }
}

export default initializeGoogleOAuthConfig;