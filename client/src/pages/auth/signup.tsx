import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FiMail, FiUser } from 'react-icons/fi';
import { SiGoogle } from 'react-icons/si';

const SignupPage = () => {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isReeloEmail, setIsReeloEmail] = useState(false);
  
  // Parse email from URL if present (from OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
      // Check if it's a reelo.io email
      setIsReeloEmail(emailParam.endsWith('@reelo.io'));
    }
  }, []);
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle traditional signup (to be implemented)
    // For now, just navigate to dashboard as if signup was successful
    setLocation('/');
  };
  
  const handleGoogleSignup = () => {
    // Redirect to Google OAuth signup endpoint
    window.location.href = '/api/auth/google/signup';
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
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>
              Sign up to start using Recurrer
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isReeloEmail && (
              <Alert className="mb-4 bg-blue-50 border-blue-200 text-blue-800">
                <AlertDescription>
                  We detected you're using a reelo.io email. You'll be automatically assigned a CSM role.
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe" 
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsReeloEmail(e.target.value.endsWith('@reelo.io'));
                  }}
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
                <FiUser className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </form>
            
            <div className="flex items-center my-4">
              <Separator className="flex-grow" />
              <span className="px-3 text-sm text-gray-500">OR</span>
              <Separator className="flex-grow" />
            </div>
            
            <Button 
              onClick={handleGoogleSignup}
              type="button" 
              variant="outline" 
              className="w-full"
            >
              <SiGoogle className="mr-2 h-4 w-4" />
              Sign up with Google
            </Button>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/auth/login">
                <a className="text-primary hover:underline">
                  Sign in
                </a>
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;