import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Flame, CalendarCheck, Activity, Loader2 } from 'lucide-react'

import { PageHeader, PageBody } from '@/components/page-header'
import { Heatmap } from '@/components/heatmap'
import { PremiumGate, usePremium } from '@/components/premium-gate'
import { activityQuery } from '@/lib/queries/activity'

export const Route = createFileRoute('/app/activity')({
  loader: ({ context }) => context.queryClient.ensureQueryData(activityQuery(182)),
  component: ActivityPage,
})

function ActivityPage() {
  const { data, isLoading } = useQuery(activityQuery(182))
  const { isPremium } = usePremium()

  return (
    <>
      <PageHeader
        title="Activity"
        description="Every note, task, journal entry and focus session, in one grid."
      />
      <PageBody className="space-y-6 px-6 py-6">
        {isLoading || !data ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat icon={Flame} label="Current streak" value={`${data.streak} ${data.streak === 1 ? 'day' : 'days'}`} />
              <Stat icon={CalendarCheck} label="Active days" value={String(data.days.filter((d) => d.score > 0).length)} />
              <Stat icon={Activity} label="Total points" value={String(data.total)} />
            </div>

            <div className="surface p-6">
              <Heatmap days={data.days} />
            </div>
          </>
        )}

        {isPremium ? (
          <div className="surface p-6">
            <h2 className="font-semibold tracking-tight">Insights</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your best day logged {data?.best ?? 0} points. Keep the thread going.
            </p>
          </div>
        ) : (
          <PremiumGate feature="activity_insights" />
        )}
      </PageBody>
    </>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame
  label: string
  value: string
}) {
  return (
    <div className="surface flex items-center gap-4 p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-thread">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-2xl font-semibold tracking-tight">{value}</span>
        <span className="block text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}
