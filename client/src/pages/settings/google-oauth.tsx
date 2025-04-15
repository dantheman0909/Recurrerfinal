import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GoogleOAuthService, GoogleOAuthScope } from '@/lib/googleOAuthClient';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { SettingsLayout } from '@/components/settings/settings-layout';

const configSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  redirectUri: z.string().url('Must be a valid URL')
});

const scopeOptions: { id: GoogleOAuthScope; label: string; description: string }[] = [
  { id: 'email', label: 'Email', description: 'View your email address' },
  { id: 'profile', label: 'Profile', description: 'View your basic profile info' },
  { id: 'gmail', label: 'Gmail', description: 'Read and send emails on your behalf' },
  { id: 'calendar', label: 'Calendar', description: 'View and manage your calendar' }
];

export default function GoogleOAuthPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [showSecret, setShowSecret] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<GoogleOAuthScope[]>(['email', 'profile']);
  const [isAuthFlow, setIsAuthFlow] = useState(false);

  // Get OAuth configuration status
  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: ['/api/oauth/google/status'],
    queryFn: async () => GoogleOAuthService.getStatus()
  });
  
  // Get OAuth configuration details 
  const { data: configData } = useQuery({
    queryKey: ['/api/oauth/google/config'],
    queryFn: async () => GoogleOAuthService.getConfig()
  });

  // Generate proper redirect URI for Replit environment
  const getRedirectUri = () => {
    // For Replit domains, we need to ensure we have the proper format
    const origin = window.location.origin;
    console.log('Current origin:', origin);
    
    // Create and return the full redirect URI
    const redirectUri = `${origin}/settings/google-oauth/callback`;
    
    // Show help message about the URI in the console
    console.log('Important: Add this exact redirect URI to your Google Cloud Console project:');
    console.log(redirectUri);
    console.log('Instructions:');
    console.log('1. Go to https://console.cloud.google.com/apis/credentials');
    console.log('2. Edit your OAuth 2.0 Client ID');
    console.log('3. Add the above URI to "Authorized redirect URIs"');
    console.log('4. Make sure APIs for Gmail and Calendar are enabled in your project');
    
    return redirectUri;
  };

  // Update form values when config data is fetched
  useEffect(() => {
    if (configData) {
      form.reset({
        clientId: configData.clientId || '',
        clientSecret: configData.clientSecret || '',
        redirectUri: configData.redirectUri || getRedirectUri()
      });
    }
  }, [configData]);

  // Load saved scopes from user token status
  useEffect(() => {
    if (statusData?.scopes?.length) {
      setSelectedScopes(statusData.scopes as GoogleOAuthScope[]);
    }
  }, [statusData]);

  const form = useForm({
    resolver: zodResolver(configSchema),
    defaultValues: {
      clientId: '',
      clientSecret: '',
      redirectUri: getRedirectUri()
    }
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: GoogleOAuthService.saveConfig,
    onSuccess: () => {
      toast({
        title: 'Configuration Saved',
        description: 'Google OAuth configuration has been successfully saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/oauth/google/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save configuration',
        variant: 'destructive',
      });
    }
  });

  // Get Auth URL mutation
  const getAuthUrlMutation = useMutation({
    mutationFn: GoogleOAuthService.getAuthUrl,
    onSuccess: (data) => {
      console.log('Auth URL response:', data);
      
      if (data.success && data.authUrl) {
        // Log the URL we're redirecting to
        console.log('Redirecting to auth URL:', data.authUrl);
        
        // Check if it's a valid URL
        try {
          new URL(data.authUrl); // Will throw if invalid
          
          // Add a small delay before redirecting to ensure logs are displayed
          toast({
            title: 'Redirecting',
            description: 'Opening Google authorization page...',
          });
          
          // Use a non-null assertion to fix the TypeScript error
          const authUrl = data.authUrl!;
          
          setTimeout(() => {
            window.location.href = authUrl;
          }, 500);
        } catch (e) {
          console.error('Invalid URL format:', e);
          toast({
            title: 'Error',
            description: 'Invalid authorization URL format',
            variant: 'destructive',
          });
        }
      } else {
        console.error('Failed to get valid auth URL:', data);
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate authorization URL',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Authentication error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start authorization flow',
        variant: 'destructive',
      });
    }
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: GoogleOAuthService.revokeAccess,
    onSuccess: () => {
      toast({
        title: 'Access Revoked',
        description: 'Google OAuth access has been successfully revoked.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/oauth/google/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke access',
        variant: 'destructive',
      });
    }
  });

  // Handle URL code parameter for authorization callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (code) {
      setIsAuthFlow(true);
      // Exchange code for tokens
      GoogleOAuthService.exchangeCode(code)
        .then(() => {
          toast({
            title: 'Authorization Successful',
            description: 'Google account has been successfully connected.',
          });
          queryClient.invalidateQueries({ queryKey: ['/api/oauth/google/status'] });
          // Remove code from URL
          navigate('/settings/google-oauth', { replace: true });
          setIsAuthFlow(false);
        })
        .catch(err => {
          toast({
            title: 'Authorization Failed',
            description: err.message || 'Failed to complete authorization',
            variant: 'destructive',
          });
          setIsAuthFlow(false);
        });
    } else if (error) {
      toast({
        title: 'Authorization Cancelled',
        description: 'The Google authorization was cancelled or failed.',
        variant: 'destructive',
      });
      navigate('/settings/google-oauth', { replace: true });
    }
  }, [toast, queryClient, navigate]);

  const onSubmit = (data: z.infer<typeof configSchema>) => {
    saveConfigMutation.mutate(data);
  };

  // Test Google connectivity without full OAuth
  const testConnectionMutation = useMutation({
    mutationFn: GoogleOAuthService.testConnection,
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Connection Test Successful',
          description: 'Successfully connected to Google servers. You should be able to complete the OAuth flow.',
        });
      } else {
        toast({
          title: 'Connection Test Failed',
          description: data.message || 'Failed to connect to Google servers.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Connection Test Failed',
        description: error.message || 'Failed to connect to Google servers.',
        variant: 'destructive',
      });
    }
  });
  
  const testConnection = () => {
    testConnectionMutation.mutate();
  };

  const startAuthFlow = () => {
    if (selectedScopes.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one scope',
        variant: 'destructive',
      });
      return;
    }
    
    // Log for debugging
    console.log('Starting auth flow with scopes:', selectedScopes);
    
    try {
      getAuthUrlMutation.mutate(selectedScopes);
    } catch (error) {
      console.error('Error in startAuthFlow:', error);
      toast({
        title: 'Error',
        description: 'Failed to start authorization flow',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeAccess = () => {
    revokeAccessMutation.mutate();
  };

  const toggleScope = (scope: GoogleOAuthScope) => {
    setSelectedScopes(prev => 
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const configuredStatus = statusData?.configured;

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Google OAuth Integration</h2>
          <div className="flex gap-2">
            {statusData?.connected && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="mr-1 h-3 w-3" /> Connected
              </Badge>
            )}
            {configuredStatus !== undefined && (
              <Badge variant={configuredStatus ? "secondary" : "outline"}>
                {configuredStatus ? "Configured" : "Not Configured"}
              </Badge>
            )}
          </div>
        </div>
        
        <p className="text-muted-foreground">
          Connect your Google account to enable Gmail and Calendar integration features.
        </p>
      
      <Card>
        <CardHeader>
          <CardTitle>OAuth Configuration</CardTitle>
          <CardDescription>
            Enter your Google OAuth credentials from the Google Cloud Console
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Google OAuth Client ID" {...field} />
                    </FormControl>
                    <FormDescription>
                      The client ID from your Google Cloud Console project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="clientSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Secret</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <Input 
                          type={showSecret ? "text" : "password"} 
                          placeholder="Your Google OAuth Client Secret" 
                          {...field} 
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          className="ml-2"
                          onClick={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? <X className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      The client secret from your Google Cloud Console project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="redirectUri"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Redirect URI</FormLabel>
                    <FormControl>
                      <Input placeholder="Redirect URI for OAuth callbacks" {...field} />
                    </FormControl>
                    <FormDescription>
                      The URI where Google will redirect after authorization. Add this URL to your authorized redirect URIs in Google Cloud Console.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                disabled={saveConfigMutation.isPending}
              >
                {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {configuredStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Google Account Connection</CardTitle>
            <CardDescription>
              Connect your Google account to enable integration features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Permissions (Scopes)</h3>
              <div className="grid gap-2">
                {scopeOptions.map((scope) => (
                  <div key={scope.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`scope-${scope.id}`} 
                      checked={selectedScopes.includes(scope.id)}
                      onCheckedChange={() => toggleScope(scope.id)}
                    />
                    <label
                      htmlFor={`scope-${scope.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {scope.label}
                      <p className="text-xs text-muted-foreground">{scope.description}</p>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                You will be redirected to Google to authorize these permissions. Make sure to select the correct Google account that you want to use for integration.
              </AlertDescription>
            </Alert>
            
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Troubleshooting</AlertTitle>
              <AlertDescription>
                <p>If you see "accounts.google.com refused to connect" error, follow these steps:</p>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>In Google Cloud Console, verify OAuth consent screen is configured</li>
                  <li>Make sure your OAuth 2.0 Client ID has the exact redirect URI (see above)</li>
                  <li>Enable Gmail and Google Calendar APIs in your project</li>
                  <li>Make sure your Google account has access to the project</li>
                  <li>Try a different browser if the issue persists</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <div className="w-full flex justify-between">
              <Button 
                onClick={handleRevokeAccess} 
                variant="outline" 
                disabled={revokeAccessMutation.isPending || isAuthFlow || !statusData?.connected}
              >
                {revokeAccessMutation.isPending ? 'Revoking...' : 'Revoke Access'}
              </Button>
              
              {statusData?.connected ? (
                <Button 
                  variant="secondary"
                  disabled
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Connected
                </Button>
              ) : (
                <Button 
                  onClick={startAuthFlow} 
                  disabled={getAuthUrlMutation.isPending || isAuthFlow}
                >
                  {getAuthUrlMutation.isPending || isAuthFlow ? 'Connecting...' : 'Connect Google Account'}
                </Button>
              )}
            </div>
            
            <div className="w-full border-t pt-3">
              <Button
                onClick={testConnection}
                variant="secondary"
                className="w-full"
                disabled={testConnectionMutation.isPending}
              >
                {testConnectionMutation.isPending ? 'Testing...' : 'Test Google Connection'}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                If you have connection issues, click here to test basic connectivity to Google servers
              </p>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
    </SettingsLayout>
  );
}