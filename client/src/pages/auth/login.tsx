import React from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FiMail } from 'react-icons/fi';
import { SiGoogle } from 'react-icons/si';

const LoginPage = () => {
  const [, setLocation] = useLocation();
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle traditional login (to be implemented)
    // For now, just navigate to dashboard as if login was successful
    setLocation('/');
  };
  
  const handleGoogleLogin = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = '/api/auth/google';
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Recurrer</h1>
          <p className="text-gray-500">Customer Success OS</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com" 
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  required
                />
              </div>
              
              <Button type="submit" className="w-full">
                <FiMail className="mr-2 h-4 w-4" />
                Sign in with Email
              </Button>
            </form>
            
            <div className="flex items-center my-4">
              <Separator className="flex-grow" />
              <span className="px-3 text-sm text-gray-500">OR</span>
              <Separator className="flex-grow" />
            </div>
            
            <Button 
              onClick={handleGoogleLogin}
              type="button" 
              variant="outline" 
              className="w-full"
            >
              <SiGoogle className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link href="/auth/signup">
                <a className="text-primary hover:underline">
                  Sign up
                </a>
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;