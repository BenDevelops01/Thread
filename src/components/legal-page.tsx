import type { ReactNode } from 'react'

import { Backdrop } from '@/components/backdrop'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Backdrop />
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="prose prose-sm mt-10 max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 prose-strong:text-foreground">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
