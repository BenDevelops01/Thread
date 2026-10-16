import { Check } from 'lucide-react'

import { useTheme } from '@/components/theme-provider'
import { ACTIVITY_COLORS } from '@/lib/activity-color'
import { cn } from '@/lib/utils'

const HEAT = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'] as const

export function ActivityColorPicker() {
  const { activityColor, setActivityColor } = useTheme()

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
      {ACTIVITY_COLORS.map((def) => {
        const active = def.id === activityColor
        return (
          <button
            key={def.id}
            type="button"
            onClick={() => setActivityColor(def.id)}
            aria-pressed={active}
            className={cn(
              'group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all',
              active
                ? 'border-foreground/50 ring-2 ring-ring/50'
                : 'border-border hover:border-foreground/30',
            )}
          >
            <span className="flex items-center gap-0.5">
              {def.swatch
                ? [0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="h-3.5 w-2.5 rounded-[3px] first:rounded-l-md last:rounded-r-md"
                      style={{ background: def.swatch!, opacity: 0.3 + i * 0.175 }}
                    />
                  ))
                : HEAT.map((cls, i) => (
                    <span
                      key={i}
                      className={cn('h-3.5 w-2.5 rounded-[3px] first:rounded-l-md last:rounded-r-md', cls)}
                    />
                  ))}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium">
              {def.name}
              {active ? (
                <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-foreground text-background">
                  <Check className="h-2.5 w-2.5" />
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
