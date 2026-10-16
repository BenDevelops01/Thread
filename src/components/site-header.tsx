import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/session'

export function SiteHeader() {
  const { user } = useSession()

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link to="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          {user ? (
            <Button asChild size="sm">
              <Link to="/app">Open workspace</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: 'signin' }}>
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: 'signup' }}>
                  Start free
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
