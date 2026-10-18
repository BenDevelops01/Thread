import { Link } from '@tanstack/react-router'
import { Pause, Play, Power, Timer, Waves } from 'lucide-react'

import { fmt, useFocusTimer } from '@/components/focus/timer-provider'
import { useSoundscape } from '@/components/soundscapes/soundscape-provider'

/**
 * Always-visible workspace status chips.
 *
 * These are rendered in the shell header, so a running focus timer or a
 * playing soundscape stays visible and controllable no matter which tab you
 * are on — evidence that both keep running in the background.
 */
export function FocusTimerChip() {
  const { running, secondsLeft, idle, toggle } = useFocusTimer()
  if (idle) return null

  return (
    <div className="flex h-8 items-center gap-1 rounded-md border border-thread/40 bg-thread/10 pl-2.5 pr-1">
      <Timer className="h-3.5 w-3.5 text-thread" />
      <Link
        to="/app/focus"
        className="mono text-xs tabular-nums text-thread outline-none hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {fmt(secondsLeft)}
      </Link>
      <button
        type="button"
        onClick={toggle}
        aria-label={running ? 'Pause focus timer' : 'Start focus timer'}
        className="grid h-6 w-6 place-items-center rounded text-thread transition-colors hover:bg-thread/20"
      >
        {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

export function SoundscapeChip() {
  const { activeCount, stopAll } = useSoundscape()
  if (activeCount === 0) return null

  return (
    <div className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card/60 pl-2.5 pr-1">
      <Link
        to="/app/soundscapes"
        className="flex items-center gap-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Waves className="h-3.5 w-3.5 text-thread" />
        <span className="text-xs">
          {activeCount} layer{activeCount > 1 ? 's' : ''}
        </span>
      </Link>
      <button
        type="button"
        onClick={stopAll}
        aria-label="Stop all soundscape layers"
        className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Power className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
