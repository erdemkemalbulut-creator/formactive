'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoginForm } from '@/components/auth/login-form';

export default function SignInPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#E5E7EB] border-t-[#7C3AED] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="px-8 py-5">
        <button onClick={() => router.push('/')} className="text-lg font-bold tracking-tight text-[#111111] hover:opacity-70 transition-opacity">
          formactive
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm -mt-12">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-soft-md p-8">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
