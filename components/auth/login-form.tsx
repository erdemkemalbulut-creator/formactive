'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';

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
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-sm text-white/40 mt-1">
          {isSignUp
            ? 'Get started with Formactive in seconds'
            : 'Sign in to continue to your dashboard'}
        </p>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-white/50 uppercase tracking-wider">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-white/50 uppercase tracking-wider">Password</label>
            <input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:hover:bg-indigo-500 disabled:hover:shadow-none mt-1"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              <>{isSignUp ? 'Create account' : 'Sign in'}</>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-white/30">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
            disabled={isLoading}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
