'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoginForm } from '@/components/auth/login-form';
import { Sparkles } from 'lucide-react';

export default function SignInPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark relative overflow-hidden flex flex-col">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/8 rounded-full blur-[100px] pointer-events-none" />

      <header className="relative z-10 px-8 py-6">
        <button
          onClick={() => router.push('/')}
          className="text-lg font-bold tracking-tight text-gradient hover:opacity-80 transition-opacity"
        >
          formactive
        </button>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm -mt-16">
          <div className="glass-dark rounded-2xl p-8 glow-sm">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
