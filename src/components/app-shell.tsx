import { useState  } from 'react'
import type {ReactNode} from 'react';
import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  NotebookPen,
  SquareKanban,
  BookHeart,
  Timer,
  Waves,
  GitBranch,
  Activity,
  ScrollText,
  Plug,
  Settings,
  LayoutDashboard,
  Search,
  Menu,
  LogOut,
} from 'lucide-react'

import { Logo } from '@/components/logo'
import { CommandPalette } from '@/components/command-palette'
import { PremiumBadge } from '@/components/premium-gate'
import { FocusTimerChip, SoundscapeChip } from '@/components/workspace-chips'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { signOutClient } from '@/lib/auth'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

const SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { label: 'Home', to: '/app', icon: LayoutDashboard },
      { label: 'Notes', to: '/app/notes', icon: NotebookPen },
      { label: 'Tasks', to: '/app/tasks', icon: SquareKanban },
      { label: 'Journal', to: '/app/journal', icon: BookHeart },
      { label: 'Graph', to: '/app/graph', icon: GitBranch },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Focus', to: '/app/focus', icon: Timer },
      { label: 'Soundscapes', to: '/app/soundscapes', icon: Waves },
      { label: 'Activity', to: '/app/activity', icon: Activity },
      { label: 'Logs', to: '/app/logs', icon: ScrollText },
    ],
  },
  {
    label: 'Extend',
    items: [
      { label: 'Plugins', to: '/app/plugins', icon: Plug },
      { label: 'Settings', to: '/app/settings', icon: Settings },
    ],
  },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border/60 bg-sidebar md:flex">
        <div className="flex h-14 items-center px-5">
          <Link to="/app">
            <Logo />
          </Link>
        </div>
        <NavSections className="flex-1 overflow-y-auto px-3 pb-4" />
        <UserCard />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 px-4 glass">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[268px] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-14 items-center px-5">
                <Logo />
              </div>
              <NavSections
                className="px-3 pb-4"
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-3 text-sm text-muted-foreground transition-colors hover:border-thread/40 hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="mono hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] sm:inline-block">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-2">
            <SoundscapeChip />
            <FocusTimerChip />
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

function NavSections({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className={cn('space-y-6', className)}>
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map(({ label, to, icon: Icon }) => {
              const active = to === '/app' ? pathname === '/app' : pathname.startsWith(to)
              return (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-4 w-4', active && 'text-thread')} />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function UserCard() {
  const { user, profile } = useSession()
  const router = useRouter()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const name = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'You'
  const initials = name.slice(0, 2).toUpperCase()

  async function handleSignOut() {
    await signOutClient()
    await router.invalidate()
    queryClient.clear()
    void navigate({ to: '/' })
  }

  return (
    <div className="border-t border-border/60 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent/60">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-thread/20 text-xs text-thread">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{name}</span>
                <PremiumBadge />
              </span>
              <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/app/settings">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSignOut} variant="destructive">
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
