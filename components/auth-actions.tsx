'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function AuthActions() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) return <div className="h-8 w-24 rounded-lg bg-[#E5E7EB]/50 animate-pulse" />;
  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-[#6B7280] hidden sm:inline truncate max-w-[200px]">{user.email}</span>
      <button onClick={async () => { await signOut(); router.push('/'); }} className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">
        Sign out
      </button>
    </div>
  );
}
