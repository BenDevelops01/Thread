import { cn } from '@/lib/utils'

const LEVELS = [0, 1, 2, 3, 1, 0, 2, 4, 1, 2, 0, 3, 2, 1, 4, 0, 2, 3, 1, 0, 2, 4, 1, 3] as const

const HEAT_CLASS = [
  'bg-heat-0',
  'bg-heat-1',
  'bg-heat-2',
  'bg-heat-3',
  'bg-heat-4',
] as const

export function HeatmapMock({ className }: { className?: string }) {
  return (
    <div className={cn('grid w-full max-w-sm grid-cols-12 gap-1.5', className)}>
      {Array.from({ length: 84 }).map((_, i) => {
        const level = LEVELS[i % LEVELS.length] ?? 0
        return (
          <span
            key={i}
            className={cn(
              'aspect-square rounded-[4px] border border-border/40 transition-transform hover:scale-110',
              HEAT_CLASS[level],
            )}
          />
        )
      })}
    </div>
  )
}
