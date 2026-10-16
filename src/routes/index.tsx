import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookHeart,
  Check,
  Command,
  GitBranch,
  Keyboard,
  Network,
  NotebookPen,
  Plug,
  Search,
  SquareKanban,
  Timer,
  Waves,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

import { Backdrop } from '@/components/backdrop'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Reveal } from '@/components/reveal'
import { AppleIcon } from '@/components/brand-icons'
import { Button } from '@/components/ui/button'
import { HeatmapMock } from '@/components/heatmap-mock'
import {
  DockerIcon,
  GitHubIcon,
  LinearIcon,
  NotionIcon,
  OpenAIIcon,
  PostgresIcon,
  SlackIcon,
  SupabaseIcon,
  VercelIcon,
  ViteIcon,
} from '@/components/integration-logos'
import { THEMES } from '@/lib/themes'
import { useSession } from '@/lib/session'

export const Route = createFileRoute('/')({
  component: Landing,
})

type LogoIcon = ComponentType<SVGProps<SVGSVGElement>>

const INTEGRATIONS: Array<{ name: string; Icon: LogoIcon }> = [
  { name: 'GitHub', Icon: GitHubIcon },
  { name: 'Vercel', Icon: VercelIcon },
  { name: 'Supabase', Icon: SupabaseIcon },
  { name: 'Linear', Icon: LinearIcon },
  { name: 'Notion', Icon: NotionIcon },
  { name: 'Slack', Icon: SlackIcon },
  { name: 'Docker', Icon: DockerIcon },
  { name: 'Postgres', Icon: PostgresIcon },
  { name: 'OpenAI', Icon: OpenAIIcon },
  { name: 'Vite', Icon: ViteIcon },
]

const HERO_LOGOS = INTEGRATIONS.slice(0, 5)

const FEED = [
  { Icon: GitHubIcon, label: 'github', text: 'pushed 3 commits to main' },
  { Icon: VercelIcon, label: 'vercel', text: 'deployment ready — thread-web' },
  { Icon: SupabaseIcon, label: 'supabase', text: 'migration 014 applied' },
  { Icon: LinearIcon, label: 'linear', text: 'ENG-241 moved to Done' },
]

const FEATURES = [
  {
    icon: NotebookPen,
    title: 'Notes that link',
    body: 'Markdown notes with [[wikilinks]], backlinks and a graph of how your thinking connects.',
  },
  {
    icon: SquareKanban,
    title: 'Tasks that move',
    body: 'A fast kanban board with priorities, due dates and reminders that nudge while you work.',
  },
  {
    icon: BookHeart,
    title: 'A journal that stays',
    body: 'Write your day, tag a mood, and watch a streak build without any gamified noise.',
  },
  {
    icon: Timer,
    title: 'Focus sessions',
    body: 'Pomodoro cycles that log themselves, so deep work turns into visible progress.',
  },
  {
    icon: Waves,
    title: 'Soundscapes',
    body: 'A generative ambient mixer — rain, noise, café — to set the room for real focus.',
  },
  {
    icon: GitBranch,
    title: 'Connect everything',
    body: 'GitHub, Vercel, Supabase, Linear, Notion and any MCP server, feeding one activity grid.',
  },
]

const INTEGRATION_POINTS = [
  'One activity feed — commits, deploys, issues and pages in a single stream.',
  'MCP servers so Claude, Cursor or any client can read and write your workspace.',
  'Tokens encrypted server-side. Nothing sensitive ever reaches the browser.',
]

const DEV_POINTS = [
  {
    icon: Command,
    title: '⌘K command palette',
    body: 'Every action is one keystroke away — notes, tasks, sessions and settings, without the mouse.',
  },
  {
    icon: Network,
    title: 'Markdown, [[wikilinks]], graph',
    body: 'Write plain markdown, link with double brackets, and follow backlinks through the knowledge graph.',
  },
  {
    icon: Keyboard,
    title: 'Keyboard-first',
    body: 'J and K to move, Enter to open, Esc to bail. The whole app runs from the home row.',
  },
  {
    icon: Plug,
    title: 'MCP tools',
    body: 'Point an MCP client at Thread and let it capture notes, tasks and journal entries for you.',
  },
]

const PALETTE_ROWS = [
  { label: 'New note', shortcut: '⌘N' },
  { label: 'Start focus session', shortcut: '⌘F' },
  { label: 'Jump to knowledge graph', shortcut: '⌘G' },
  { label: 'Toggle soundscapes', shortcut: '⌘S' },
]

const TERMINAL_LINES = [
  { source: 'github', text: 'pushed 3 commits to main' },
  { source: 'vercel', text: 'deployment ready — thread-web' },
  { source: 'supabase', text: 'migration 014 applied' },
  { source: 'linear', text: 'ENG-241 moved to Done' },
]

const EDGE_MASK = {
  maskImage:
    'linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)',
  WebkitMaskImage:
    'linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)',
}

function Landing() {
  const { user } = useSession()

  return (
    <div className="relative min-h-screen">
      <Backdrop />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid items-center gap-14 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <Reveal className="flex flex-col items-center gap-5 text-center sm:items-start sm:text-left">
            <img
              src="/brand-lockup.png"
              alt="Thread"
              className="h-14 w-auto sm:h-16 md:h-18 lg:h-20"
            />

            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              <span className="sr-only">Thread — </span>
              Notes, tasks, journal, focus, activity.{' '}
              <span className="text-muted-foreground">
                For people who ship.
              </span>
            </h1>

            <p className="max-w-xl text-lg text-muted-foreground">
              One calm, fast workspace: markdown notes with{' '}
              <span className="mono text-foreground">[[wikilinks]]</span>, a
              kanban that moves, sessions that log themselves and a GitHub-style
              activity grid fed by your whole stack.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center rounded-full border border-border bg-card/60 px-3 py-1 text-xs tracking-wide text-muted-foreground backdrop-blur">
                All-in-one, quietly fast
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs tracking-wide text-muted-foreground backdrop-blur">
                <AppleIcon className="h-3.5 w-3.5" />
                macOS app — coming soon
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
              <Button asChild size="lg" className="px-6">
                <Link
                  to={user ? '/app' : '/auth'}
                  search={user ? undefined : { mode: 'signup' }}
                >
                  {user ? 'Open workspace' : 'Start free'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-6">
                <a href="#features">See what&apos;s inside</a>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Connects with
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {HERO_LOGOS.map(({ name, Icon }) => (
                  <span key={name} className="inline-flex items-center gap-1.5">
                    <Icon className="h-4 w-4" aria-hidden />
                    {name}
                  </span>
                ))}
                <span className="text-muted-foreground/70">and the rest…</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="surface relative overflow-hidden p-2 lift">
              <div
                className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full opacity-25 blur-3xl"
                style={{ background: 'var(--thread)' }}
              />
              <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/50">
                <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="mono ml-2 text-xs text-muted-foreground">
                    Thread — today
                  </span>
                </div>

                <div className="space-y-5 p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Good evening</p>
                      <p className="text-xs text-muted-foreground">
                        Here&apos;s your thread for today.
                      </p>
                    </div>
                    <span className="mono shrink-0 text-sm tabular-nums text-muted-foreground">
                      25:00
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <PreviewStat label="Notes written" value="3" />
                    <PreviewStat label="Tasks done" value="7" />
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Activity
                    </p>
                    <ul className="space-y-2">
                      {FEED.map(({ Icon, label, text }) => (
                        <li
                          key={label}
                          className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="mono min-w-0 flex-1 truncate text-xs">
                            <span className="text-muted-foreground">
                              {label}
                            </span>{' '}
                            <span className="text-foreground">{text}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Integrations ─────────────────────────────────────── */}
        <section className="pb-20 md:pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Integrations
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Connect your stack.
            </h2>
            <p className="mt-4 text-muted-foreground">
              GitHub, Vercel, Supabase, Linear, Notion, Slack, Docker, Postgres,
              OpenAI and Vite — all first-class. One activity feed, MCP servers
              for everything else, and tokens that stay on the server.
            </p>
          </Reveal>

          <Reveal delay={120} className="mt-12 space-y-4">
            <Marquee items={INTEGRATIONS} />
            <div aria-hidden>
              <Marquee items={INTEGRATIONS} reverse />
            </div>
          </Reveal>

          <Reveal delay={200}>
            <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
              {INTEGRATION_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3.5 text-sm text-muted-foreground"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-thread" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section id="features" className="pb-20 md:pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Everything in one place
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Six tools. One thread.
            </h2>
            <p className="mt-4 text-muted-foreground">
              No tab sprawl, no plugin maze — the six things you actually use,
              tuned to stay out of the way.
            </p>
          </Reveal>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <Reveal as="li" key={title} delay={i * 70} className="h-full">
                <div className="surface group h-full p-6 transition-colors lift">
                  <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ── Built for developers ─────────────────────────────── */}
        <section className="pb-20 md:pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Built for developers
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Keyboard-first. Markdown-native.
            </h2>
            <p className="mt-4 text-muted-foreground">
              The details you notice on day two, polished like features: a real
              palette, real markdown, real shortcuts — and a terminal that
              agrees.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <Reveal className="h-full">
              <div className="surface h-full p-6 sm:p-8">
                <ul className="space-y-6">
                  {DEV_POINTS.map(({ icon: Icon, title, body }) => (
                    <li key={title} className="flex gap-4">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-accent text-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold tracking-tight">
                          {title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={120} className="h-full">
              <div className="surface h-full overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="mono flex-1 text-sm text-muted-foreground">
                    Type a command or search…
                  </span>
                  <kbd className="mono rounded border border-border bg-accent px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground">
                    ⌘K
                  </kbd>
                </div>
                <ul className="p-2">
                  {PALETTE_ROWS.map((row, i) => (
                    <li
                      key={row.label}
                      className={`flex items-center justify-between gap-4 rounded-md px-3 py-2.5 text-sm ${
                        i === 0
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span className="mono truncate">{row.label}</span>
                      <kbd className="mono rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {row.shortcut}
                      </kbd>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border/60 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Press <span className="mono text-foreground">↑</span> and{' '}
                    <span className="mono text-foreground">↓</span> to move,{' '}
                    <span className="mono text-foreground">⏎</span> to run.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Reveal className="h-full">
              <div className="surface h-full overflow-hidden">
                <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="mono ml-2 text-xs text-muted-foreground">
                    zsh — thread logs
                  </span>
                </div>
                <div className="mono space-y-2 p-5 text-xs leading-relaxed">
                  <p>
                    <span className="text-thread">$</span> thread logs --follow
                  </p>
                  {TERMINAL_LINES.map((line) => (
                    <p key={line.source} className="text-muted-foreground">
                      <span className="text-thread">✓</span>{' '}
                      <span className="text-foreground">{line.source}</span> ·{' '}
                      {line.text}
                    </p>
                  ))}
                  <p className="flex items-center gap-2">
                    <span className="text-thread">$</span>
                    <span className="inline-block h-3.5 w-1.5 bg-foreground/70 animate-pulse-soft" />
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120} className="h-full">
              <div className="surface flex h-full flex-col p-6">
                <h3 className="text-lg font-semibold tracking-tight">
                  Twelve weeks of showing up
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Commits, sessions, notes and tasks roll into one grid.
                  Brighter means busier.
                </p>
                <div className="mt-5 overflow-x-auto pb-1">
                  <HeatmapMock />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <PreviewStat label="Notes" value="412" />
                  <PreviewStat label="Tasks" value="1,208" />
                  <PreviewStat label="Focus" value="96h" />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Themes ───────────────────────────────────────────── */}
        <section className="pb-20 md:pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Make it yours
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Six themes. Zero noise.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start monochrome and switch to a warmer or darker mood whenever
              you like — from your account settings.
            </p>
          </Reveal>

          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {THEMES.map((theme, i) => (
              <Reveal as="li" key={theme.id} delay={i * 60}>
                <div className="surface overflow-hidden p-2 transition-colors hover:border-foreground/25">
                  <span
                    className="flex h-20 flex-col justify-between rounded-lg border p-2.5"
                    style={{
                      background: theme.swatch.background,
                      borderColor: theme.swatch.border,
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: theme.swatch.accent }}
                      />
                      <span
                        className="h-1.5 w-8 rounded-full"
                        style={{
                          background: theme.swatch.foreground,
                          opacity: 0.85,
                        }}
                      />
                    </span>
                    <span
                      className="h-7 w-full rounded-md border"
                      style={{
                        background: theme.swatch.card,
                        borderColor: theme.swatch.border,
                      }}
                    />
                  </span>
                  <p className="mt-2 px-1 text-center text-xs font-medium">
                    {theme.name}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ── Final CTA ────────────────────────────────────────── */}
        <section className="pb-24">
          <Reveal>
            <div className="surface relative overflow-hidden px-8 py-14 text-center">
              <div
                className="pointer-events-none absolute inset-0 bg-radial-fade"
                aria-hidden
              />
              <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">
                Start writing your thread today.
              </h2>
              <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
                Free to begin, calm to use, and yours to keep. The desktop app
                is on the way.
              </p>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="px-6">
                  <Link
                    to={user ? '/app' : '/auth'}
                    search={user ? undefined : { mode: 'signup' }}
                  >
                    {user ? 'Open workspace' : 'Create your workspace'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-6">
                  <Link to="/auth" search={{ mode: 'signin' }}>
                    Sign in
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function Marquee({
  items,
  reverse = false,
}: {
  items: typeof INTEGRATIONS
  reverse?: boolean
}) {
  const loop = [...items, ...items]

  return (
    <div className="overflow-hidden py-1" style={EDGE_MASK}>
      <div
        className="flex w-max animate-marquee"
        style={reverse ? { animationDirection: 'reverse' } : undefined}
      >
        {loop.map(({ name, Icon }, i) => (
          <span
            key={`${name}-${i}`}
            className="surface mr-4 flex shrink-0 items-center gap-2.5 px-4 py-2.5"
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium tracking-tight">{name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-3">
      <p className="text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
