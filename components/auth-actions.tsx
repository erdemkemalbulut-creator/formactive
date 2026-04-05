'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function AuthActions() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return <div className="h-8 w-24 rounded-lg bg-white/5 animate-pulse" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-white/30 hidden sm:inline truncate max-w-[200px]">
        {user.email}
      </span>
      <button
        onClick={handleSignOut}
        className="text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
