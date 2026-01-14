'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { LayoutDashboard, GitBranch, List, BarChart3, Users, Key, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Request Paths', href: '/paths', icon: GitBranch },
  { name: 'Logs', href: '/logs', icon: List },
  { name: 'Metrics', href: '/metrics', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'API Keys', href: '/keys', icon: Key },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Path Tracker</div>
            <div className="text-xs text-muted-foreground">by Pathwave.io</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t p-4">
        <SignedIn>
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/sign-in" />
            <div className="flex-1 truncate text-sm">
              <div className="font-medium">Account</div>
              <div className="text-xs text-muted-foreground">Manage your account</div>
            </div>
          </div>
        </SignedIn>
        <SignedOut>
          <div className="flex items-center gap-3">
            <SignInButton mode="modal">
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Sign In
              </button>
            </SignInButton>
          </div>
        </SignedOut>
      </div>
    </div>
  );
}
