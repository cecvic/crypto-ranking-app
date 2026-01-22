'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SearchIcon,
  BellIcon,
  MenuIcon,
  BotIcon,
  CoinsIcon,
} from 'lucide-react';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-6">
          <Image
            src="https://media.licdn.com/dms/image/v2/D560BAQHqjfvEKywCaA/company-logo_200_200/company-logo_200_200/0/1700268040211?e=1769644800&v=beta&t=2eshwxS2veQKNMM6qzGG6DLdBnJ_l0SfIHQeCQU0Yo4"
            alt="Trendhubs"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="font-bold text-lg hidden sm:inline-block">
            Trendhubs
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/dashboard"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/rankings"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            Rankings
          </Link>
          <Link
            href="/dashboard/screener"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            Screener
          </Link>
          <Link
            href="/dashboard/signals"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            Signals
          </Link>
          <Link
            href="/dashboard/whale-alerts"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            Whale Alerts
          </Link>
          <Link
            href="/dashboard/tokens"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            Tokens
          </Link>
        </nav>

        {/* Search */}
        <div className="flex-1 flex items-center justify-end gap-4">
          <div className="relative hidden sm:block w-64">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search coins..."
              className="pl-9 h-9 w-full"
            />
          </div>

          {/* AI Chat Button - prominent placement with glow effect */}
          <Button
            variant="ghost"
            size="icon"
            className="relative group"
            asChild
          >
            <Link href="/dashboard/chat">
              <BotIcon className="h-5 w-5 text-primary group-hover:text-primary/80 transition-colors" />
              {/* Animated pulse indicator for feature highlight */}
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </Link>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8',
              },
            }}
          />

          {/* Mobile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/chat">
                  <BotIcon className="mr-2 h-4 w-4" />
                  AI Chat
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/rankings">Rankings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/screener">Screener</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/signals">Signals</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/whale-alerts">Whale Alerts</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/tokens">
                  <CoinsIcon className="mr-2 h-4 w-4" />
                  Tokens
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
