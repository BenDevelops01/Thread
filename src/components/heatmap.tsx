import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { parseYmd, shortMonth, weekdayShortDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

import type { ActivityDay } from '@/server/activity'

const HEAT_CLASS = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'] as const

function levelFor(score: number, max: number) {
  if (score <= 0) return 0
  if (max <= 0) return 1
  const ratio = score / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

export function Heatmap({ days, max }: { days: ActivityDay[]; max?: number }) {
  const { weeks, monthLabels, peak } = useMemo(() => {
    const peakScore = max ?? days.reduce((m, d) => Math.max(m, d.score), 0)
    // Pad the start so the first column begins on Sunday
    const first = days.length > 0 ? parseYmd(days[0].day) : new Date()
    const pad = first.getUTCDay()
    const padded: (ActivityDay | null)[] = [...Array(pad).fill(null), ...days]

    const cols: (ActivityDay | null)[][] = []
    for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7))

    const labels: { index: number; label: string }[] = []
    let lastMonth = -1
    cols.forEach((col, index) => {
      const cell = col.find((c) => c)
      if (!cell) return
      const month = parseYmd(cell.day).getUTCMonth()
      if (month !== lastMonth) {
        lastMonth = month
        labels.push({ index, label: shortMonth(cell.day) })
      }
    })

    return { weeks: cols, monthLabels: labels, peak: peakScore }
  }, [days, max])

  return (
    <div className="flex gap-2 overflow-x-auto">
      <div className="flex flex-col justify-between py-0.5 pr-1 text-[10px] text-muted-foreground">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="h-3 leading-3">
            {d}
          </span>
        ))}
      </div>

      <div>
        <div className="mb-1 flex gap-[3px] text-[10px] text-muted-foreground">
          {weeks.map((_, i) => {
            const label = monthLabels.find((m) => m.index === i)
            return (
              <span key={i} className="w-3">
                {label ? label.label : ''}
              </span>
            )
          })}
        </div>

        <div className="flex gap-[3px]">
          {weeks.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, ri) => {
                const cell = col[ri]
                if (!cell) {
                  return <span key={ri} className="h-3 w-3" />
                }
                const level = levelFor(cell.score, peak)
                return (
                  <Tooltip key={ri}>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          'h-3 w-3 rounded-[3px] border border-border/30',
                          HEAT_CLASS[level],
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <span className="text-xs">
                        {weekdayShortDate(cell.day)}
                        {' · '}
                        {cell.score} pts
                      </span>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Less</span>
          {HEAT_CLASS.map((c) => (
            <span key={c} className={cn('h-3 w-3 rounded-[3px] border border-border/30', c)} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
