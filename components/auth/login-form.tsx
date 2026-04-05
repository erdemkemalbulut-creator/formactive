'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
      const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
      if (error) {
        let msg = error.message;
        if (isSignUp) {
          if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) msg = 'This email is already registered. Try signing in instead.';
          else if (msg.toLowerCase().includes('password')) msg = 'Password must be at least 6 characters.';
          else if (msg.toLowerCase().includes('email')) msg = 'Please enter a valid email address.';
        } else {
          if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) msg = 'Invalid email or password.';
        }
        toast({ title: isSignUp ? 'Could not create account' : 'Could not sign in', description: msg, variant: 'destructive' });
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({ title: 'Something went wrong', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-7">
        <h2 className="text-xl font-semibold text-[#111111]">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-sm text-[#6B7280] mt-1">
          {isSignUp ? 'Get started with Formactive' : 'Sign in to your dashboard'}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-[#6B7280]">Email</label>
          <input
            id="email" type="email" placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} autoComplete="email"
            className="w-full h-10 px-3.5 rounded-xl bg-[#FAFAFB] border border-[#E5E7EB] text-[#111111] text-sm placeholder-[#6B7280]/40 focus:outline-none focus:border-[#7C3AED]/40 focus:ring-2 focus:ring-[#7C3AED]/10 transition-all disabled:opacity-50"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium text-[#6B7280]">Password</label>
          <input
            id="password" type="password" placeholder="At least 6 characters" value={password}
            onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} minLength={6}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            className="w-full h-10 px-3.5 rounded-xl bg-[#FAFAFB] border border-[#E5E7EB] text-[#111111] text-sm placeholder-[#6B7280]/40 focus:outline-none focus:border-[#7C3AED]/40 focus:ring-2 focus:ring-[#7C3AED]/10 transition-all disabled:opacity-50"
          />
        </div>
        <button
          type="submit" disabled={isLoading}
          className="w-full h-10 rounded-xl bg-[#111111] hover:bg-[#222222] text-white text-sm font-medium transition-all shadow-soft hover:shadow-soft-md disabled:opacity-50 mt-1"
        >
          {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : <>{isSignUp ? 'Create account' : 'Sign in'}</>}
        </button>
      </form>
      <p className="text-center text-sm text-[#6B7280] mt-4">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button type="button" onClick={() => setIsSignUp(!isSignUp)} disabled={isLoading}
          className="text-[#7C3AED] font-medium hover:text-[#6D28D9] transition-colors"
        >
          {isSignUp ? 'Sign in' : 'Sign up'}
        </button>
      </p>
    </div>
  );
}
