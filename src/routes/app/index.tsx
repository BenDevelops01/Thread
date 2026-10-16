import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowUpRight,
  BookHeart,
  CalendarClock,
  CheckCircle2,
  Circle,
  NotebookPen,
  SquareKanban,
  Timer,
} from 'lucide-react'

import { PageHeader, PageBody } from '@/components/page-header'
import { Heatmap } from '@/components/heatmap'
import { Button } from '@/components/ui/button'
import { dashboardQuery } from '@/lib/queries/dashboard'
import { formatShortDate } from '@/lib/dates'
import { priorityMeta, formatDue } from '@/lib/priority'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/app/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery()),
  component: Dashboard,
})

function Dashboard() {
  const { profile, user } = useSession()
  const { data } = useSuspenseQuery(dashboardQuery())
  const name = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'there'
  const greeting = useGreeting()

  const stats = [
    { label: 'Notes written', value: String(data.notesCount), icon: NotebookPen, to: '/app/notes' },
    { label: 'Tasks done', value: String(data.tasksDone), icon: SquareKanban, to: '/app/tasks' },
    {
      label: 'Focus (7 days)',
      value: `${data.focusWeekMinutes}m`,
      icon: Timer,
      to: '/app/focus',
    },
    {
      label: 'Journal streak',
      value: `${data.journalStreak}d`,
      icon: BookHeart,
      to: '/app/journal',
    },
  ]

  return (
    <>
      <PageHeader title={`${greeting}, ${name}`} description="Here's your thread for today." />

      <PageBody className="space-y-6 px-6 py-6">
        {!data.onboarding.complete && <Onboarding state={data.onboarding} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="surface group flex items-center gap-4 p-5 transition-colors hover:border-thread/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-thread">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-2xl font-semibold tracking-tight">{value}</span>
                <span className="block text-xs text-muted-foreground">{label}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight">Momentum</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/app/activity">View activity</Link>
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Brighter squares mean busier days. A {data.activity.streak}-day streak.
            </p>
            <div className="mt-6">
              <Heatmap days={data.activity.days} />
            </div>
          </div>

          <div className="surface flex flex-col p-6">
            <h2 className="font-semibold tracking-tight">Up next</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.tasksOpen} open {data.tasksOpen === 1 ? 'task' : 'tasks'}.
            </p>
            <div className="mt-4 flex-1 space-y-2">
              {data.upNext.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled. Add a due date to a task to see it here.
                </p>
              ) : (
                data.upNext.map((task) => {
                  const priority = priorityMeta(task.priority)
                  const due = formatDue(task.due_at)
                  return (
                    <Link
                      key={task.id}
                      to="/app/tasks"
                      className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:border-thread/40 hover:bg-accent/40"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: priority.color }}
                      />
                      <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      <span
                        className={cn(
                          'flex shrink-0 items-center gap-1 text-xs',
                          due.overdue ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        <CalendarClock className="h-3 w-3" />
                        {due.label}
                      </span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight">Recent notes</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/app/notes">All notes</Link>
              </Button>
            </div>
            <div className="mt-4 space-y-1">
              {data.recentNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet — start your first.</p>
              ) : (
                data.recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    to="/app/notes/$noteId"
                    params={{ noteId: note.id }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/40"
                  >
                    <span className="text-base">{note.emoji ?? '📄'}</span>
                    <span className="min-w-0 flex-1 truncate">{note.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatShortDate(note.updated_at)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="surface flex flex-col p-6">
            <h2 className="font-semibold tracking-tight">Quick capture</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Jump straight into whatever's next.
            </p>
            <div className="mt-5 grid flex-1 grid-cols-2 gap-3">
              <QuickAction to="/app/notes" label="New note" icon={NotebookPen} />
              <QuickAction to="/app/tasks" label="New task" icon={SquareKanban} />
              <QuickAction to="/app/journal" label="Journal" icon={BookHeart} />
              <QuickAction to="/app/focus" label="Start focus" icon={Timer} />
            </div>
          </div>
        </div>
      </PageBody>
    </>
  )
}

function useGreeting() {
  const [greeting, setGreeting] = useState('Hello')
  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')
  }, [])
  return greeting
}

function Onboarding({ state }: { state: DashboardDataState }) {
  const steps = [
    { done: state.hasNote, label: 'Write your first note', to: '/app/notes' },
    { done: state.hasTask, label: 'Add a task to your board', to: '/app/tasks' },
    { done: state.hasJournal, label: 'Log a journal entry', to: '/app/journal' },
    { done: state.hasFocus, label: 'Run a focus session', to: '/app/focus' },
  ]
  return (
    <div className="surface p-6">
      <h2 className="font-semibold tracking-tight">Get started</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A few steps to weave your first thread.
      </p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {steps.map((step) => (
          <Link
            key={step.label}
            to={step.to}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
              step.done
                ? 'border-moss/40 bg-moss/10 text-moss'
                : 'border-border/60 hover:border-thread/40 hover:bg-accent/40',
            )}
          >
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={cn(!step.done && 'text-foreground')}>{step.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

type DashboardDataState = {
  hasNote: boolean
  hasTask: boolean
  hasJournal: boolean
  hasFocus: boolean
  hasIntegration: boolean
  complete: boolean
}

function QuickAction({
  to,
  label,
  icon: Icon,
}: {
  to: string
  label: string
  icon: typeof NotebookPen
}) {
  return (
    <Link
      to={to}
      className="flex flex-col justify-between rounded-xl border border-border/70 bg-card/50 p-4 text-sm transition-colors hover:border-thread/40 hover:bg-accent/40"
    >
      <Icon className="h-5 w-5 text-thread" />
      <span className="mt-6 font-medium">{label}</span>
    </Link>
  )
}
