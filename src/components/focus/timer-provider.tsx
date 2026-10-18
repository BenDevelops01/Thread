import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { logFocusSession } from '@/server/focus'

export type FocusMode = 'focus' | 'short' | 'long'

export const MODES: { id: FocusMode; label: string; seconds: number }[] = [
  { id: 'focus', label: 'Focus', seconds: 25 * 60 },
  { id: 'short', label: 'Short break', seconds: 5 * 60 },
  { id: 'long', label: 'Long break', seconds: 15 * 60 },
]

export function fmt(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface FocusTimerValue {
  mode: FocusMode
  running: boolean
  secondsLeft: number
  total: number
  progress: number
  round: number
  idle: boolean
  toggle: () => void
  start: () => void
  pause: () => void
  reset: () => void
  switchMode: (m: FocusMode) => void
  skip: () => void
}

const FocusTimerContext = createContext<FocusTimerValue | null>(null)

export function useFocusTimer(): FocusTimerValue {
  const ctx = useContext(FocusTimerContext)
  if (!ctx) throw new Error('useFocusTimer must be used within a FocusTimerProvider')
  return ctx
}

/**
 * Owns the focus timer for the whole workspace.
 *
 * Two things matter here:
 *
 * 1. It lives in the app layout, so switching tabs / notes / tasks never
 *    unmounts it — the countdown keeps going while you work elsewhere in Thread.
 * 2. Time is derived from a wall-clock `endsAt` timestamp rather than a
 *    decremented counter, so throttling in a background browser tab cannot make
 *    the timer drift or stall. Ticks only update `now`; they never decide time.
 */
export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<FocusMode>('focus')
  const [round, setRound] = useState(1)
  const [running, setRunning] = useState(false)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(MODES[0].seconds)
  const [now, setNow] = useState(() => Date.now())

  const total = useMemo(() => MODES.find((m) => m.id === mode)!.seconds, [mode])

  const secondsLeft =
    running && endsAt != null ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : remaining
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - secondsLeft / total)) : 0

  const logMutation = useMutation({
    mutationFn: (vars: { mode: FocusMode; seconds: number }) =>
      logFocusSession({
        data: { mode: vars.mode, duration_seconds: vars.seconds, completed: true },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['focus-sessions'] })
      void queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  // Refs so the tick effect never sees a stale closure.
  const modeRef = useRef(mode)
  modeRef.current = mode
  const roundRef = useRef(round)
  roundRef.current = round
  const totalRef = useRef(total)
  totalRef.current = total

  const finishRef = useRef<() => void>(() => {})
  finishRef.current = () => {
    setRunning(false)
    setEndsAt(null)
    const current = modeRef.current
    if (current === 'focus') {
      logMutation.mutate({ mode: current, seconds: totalRef.current })
      toast.success('Focus session complete', { description: 'Take a breath.' })
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Focus complete', { body: 'Nice work — time for a break.' })
      }
    } else {
      toast.success('Break over', { description: 'Ready for another round?' })
    }
    const oldRound = roundRef.current
    if (current === 'focus') setRound((r) => (r + 1) % 4)
    const next: FocusMode =
      current === 'focus' ? (oldRound % 4 === 0 ? 'long' : 'short') : 'focus'
    setMode(next)
    setRemaining(MODES.find((m) => m.id === next)!.seconds)
  }

  // Tick + catch up when the tab becomes visible again.
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 500)
    const wake = () => setNow(Date.now())
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
    }
  }, [running])

  // Fire the finish logic exactly when the wall clock passes the deadline.
  useEffect(() => {
    if (!running || endsAt == null) return
    if (now >= endsAt) finishRef.current()
  }, [now, running, endsAt])

  // Live countdown in the tab title, even on other pages.
  useEffect(() => {
    const base = 'Thread — one calm place to think and ship'
    if (running) {
      document.title = `${fmt(secondsLeft)} · Thread`
      return () => {
        document.title = base
      }
    }
    document.title = base
    return undefined
  }, [running, secondsLeft])

  const start = useCallback(() => {
    setNow(Date.now())
    setEndsAt(Date.now() + Math.max(0, remaining) * 1000)
    setRunning(true)
  }, [remaining])

  const pause = useCallback(() => {
    if (endsAt != null) {
      setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    }
    setEndsAt(null)
    setRunning(false)
  }, [endsAt])

  const toggle = useCallback(() => {
    if (running) pause()
    else start()
  }, [running, pause, start])

  const reset = useCallback(() => {
    setRunning(false)
    setEndsAt(null)
    setRemaining(total)
  }, [total])

  const switchMode = useCallback((next: FocusMode) => {
    setRunning(false)
    setEndsAt(null)
    setMode(next)
    setRemaining(MODES.find((m) => m.id === next)!.seconds)
  }, [])

  const skip = useCallback(() => {
    finishRef.current()
  }, [])

  const value = useMemo<FocusTimerValue>(
    () => ({
      mode,
      running,
      secondsLeft,
      total,
      progress,
      round,
      idle: !running && secondsLeft === total,
      toggle,
      start,
      pause,
      reset,
      switchMode,
      skip,
    }),
    [mode, running, secondsLeft, total, progress, round, toggle, start, pause, reset, switchMode, skip],
  )

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>
}
