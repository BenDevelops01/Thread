import { Link } from '@tanstack/react-router'

import { Logo } from '@/components/logo'

const PRODUCT_LINKS = [
  { label: 'Notes', to: '/app/notes' as const },
  { label: 'Tasks', to: '/app/tasks' as const },
  { label: 'Journal', to: '/app/journal' as const },
  { label: 'Focus', to: '/app/focus' as const },
]

const COMPANY_LINKS = [
  { label: 'Privacy', to: '/privacy' as const },
  { label: 'Terms', to: '/terms' as const },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo size={24} />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              One calm place to think and ship — notes, tasks, journal, focus and an activity grid
              that rewards showing up.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
              macOS app — coming soon
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
              Product
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
              Company
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p suppressHydrationWarning>© {new Date().getFullYear()} Thread. All rights reserved.</p>
          <p>Built for consistent, quiet momentum.</p>
        </div>
      </div>
    </footer>
  )
}
