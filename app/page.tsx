'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-8 py-6">
        <span className="text-xl font-bold text-slate-900 tracking-tight">formactive</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-xl text-center -mt-20">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
            AI conversational forms that ask and adapt.
          </h1>
          <p className="mt-5 text-lg text-slate-500 leading-relaxed">
            Create AI-powered chat forms to collect structured answers.
          </p>
          <button
            onClick={() => router.push('/signin')}
            className="mt-10 inline-flex items-center justify-center h-12 px-8 text-base font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Sign in
          </button>
        </div>
      </main>
    </div>
  );
}
