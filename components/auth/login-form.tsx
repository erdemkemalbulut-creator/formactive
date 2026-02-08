'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        let errorMessage = error.message;

        if (isSignUp) {
          if (errorMessage.toLowerCase().includes('already registered') ||
              errorMessage.toLowerCase().includes('already exists') ||
              errorMessage.toLowerCase().includes('duplicate')) {
            errorMessage = 'This email is already registered. Try signing in instead.';
          } else if (errorMessage.toLowerCase().includes('password')) {
            errorMessage = 'Password must be at least 6 characters.';
          } else if (errorMessage.toLowerCase().includes('email')) {
            errorMessage = 'Please enter a valid email address.';
          }
        } else {
          if (errorMessage.toLowerCase().includes('invalid') ||
              errorMessage.toLowerCase().includes('credentials')) {
            errorMessage = 'Invalid email or password. Please try again.';
          }
        }

        toast({
          title: isSignUp ? 'Could not create account' : 'Could not sign in',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Something went wrong',
        description: error.message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isSignUp
            ? 'Get started with FormActive in seconds'
            : 'Sign in to continue to your dashboard'}
        </p>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm text-slate-600">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-10 border-slate-200"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm text-slate-600">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
              className="h-10 border-slate-200"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>
          <Button
            type="submit"
            className="w-full h-10 bg-slate-900 hover:bg-slate-800"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
            ) : (
              <>{isSignUp ? 'Create account' : 'Sign in'}</>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-slate-900 font-medium hover:underline"
            disabled={isLoading}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
