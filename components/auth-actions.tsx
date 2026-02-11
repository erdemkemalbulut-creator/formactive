'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthActions() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return <Skeleton className="h-8 w-24 rounded-lg" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-slate-500 hidden sm:inline truncate max-w-[200px]">
        {user.email}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        Sign out
      </Button>
    </div>
  );
}
