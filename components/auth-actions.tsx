'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutDashboard, User, CreditCard, LogOut } from 'lucide-react';

export function AuthActions() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-sm text-slate-600 hover:text-slate-900"
          onClick={() => {
            const el = document.getElementById('get-started');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              router.push('/#get-started');
            }
          }}
        >
          Sign in
        </Button>
        <Button
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => {
            const el = document.getElementById('get-started');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              router.push('/#get-started');
            }
          }}
        >
          Create a form
        </Button>
      </div>
    );
  }

  const initials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U';

  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-slate-400">
          <Avatar className="h-8 w-8 cursor-pointer">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
            <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-slate-900 truncate">
            {user.user_metadata?.full_name || user.email}
          </p>
          {user.user_metadata?.full_name && (
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          <LayoutDashboard className="w-4 h-4 mr-2" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          <User className="w-4 h-4 mr-2" />
          My profile
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Billing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
