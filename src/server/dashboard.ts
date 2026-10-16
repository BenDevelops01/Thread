import { createServerFn } from '@tanstack/react-start'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { computeActivity } from '@/server/activity'
import type { ActivityResult } from '@/server/activity'

export interface UpNextTask {
  id: string
  title: string
  priority: string
  due_at: string | null
}

export interface RecentNote {
  id: string
  title: string
  emoji: string | null
  updated_at: string
}

export interface OnboardingState {
  hasNote: boolean
  hasTask: boolean
  hasJournal: boolean
  hasFocus: boolean
  hasIntegration: boolean
  complete: boolean
}

export interface DashboardData {
  notesCount: number
  tasksOpen: number
  tasksDone: number
  focusTodayMinutes: number
  focusWeekMinutes: number
  journalStreak: number
  upNext: UpNextTask[]
  recentNotes: RecentNote[]
  activity: ActivityResult
  onboarding: OnboardingState
}

export const getDashboard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DashboardData> => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const userId = user.id

    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [
      notesCountRes,
      tasksCountRes,
      upNextRes,
      recentNotesRes,
      focusRes,
      journalRes,
      integrationsRes,
      activity,
    ] = await Promise.all([
      supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('tasks').select('id, completed').eq('user_id', userId),
      supabase
        .from('tasks')
        .select('id, title, priority, due_at')
        .eq('user_id', userId)
        .eq('completed', false)
        .not('due_at', 'is', null)
        .order('due_at', { ascending: true })
        .limit(5),
      supabase
        .from('notes')
        .select('id, title, emoji, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase
        .from('focus_sessions')
        .select('started_at, duration_seconds')
        .eq('user_id', userId)
        .gte('started_at', weekAgo),
      supabase
        .from('journal_entries')
        .select('entry_date')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })
        .limit(400),
      supabase
        .from('integrations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'connected'),
      computeActivity(supabase, userId, 182),
    ])

    const tasks = tasksCountRes.data ?? []
    const tasksDone = tasks.filter((t) => t.completed).length
    const tasksOpen = tasks.length - tasksDone

    const focusSessions = focusRes.data ?? []
    const focusTodayMinutes = Math.round(
      focusSessions
        .filter((f) => new Date(f.started_at).getTime() >= startOfToday.getTime())
        .reduce((sum, f) => sum + f.duration_seconds, 0) / 60,
    )
    const focusWeekMinutes = Math.round(
      focusSessions.reduce((sum, f) => sum + f.duration_seconds, 0) / 60,
    )

    const journalDates = new Set((journalRes.data ?? []).map((j) => j.entry_date))
    let journalStreak = 0
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    for (let i = 0; i < 400; i += 1) {
      const key = cursor.toISOString().slice(0, 10)
      if (journalDates.has(key)) {
        journalStreak += 1
      } else if (i === 0) {
        // allow today to be unlogged without breaking yesterday's streak
      } else {
        break
      }
      cursor.setDate(cursor.getDate() - 1)
    }

    const hasIntegration = (integrationsRes.count ?? 0) > 0
    const onboarding: OnboardingState = {
      hasNote: (notesCountRes.count ?? 0) > 0,
      hasTask: tasks.length > 0,
      hasJournal: journalDates.size > 0,
      hasFocus: focusSessions.length > 0 || focusWeekMinutes > 0,
      hasIntegration,
      complete: false,
    }
    onboarding.complete =
      onboarding.hasNote && onboarding.hasTask && onboarding.hasJournal && onboarding.hasFocus

    return {
      notesCount: notesCountRes.count ?? 0,
      tasksOpen,
      tasksDone,
      focusTodayMinutes,
      focusWeekMinutes,
      journalStreak,
      upNext: upNextRes.data ?? [],
      recentNotes: recentNotesRes.data ?? [],
      activity,
      onboarding,
    }
  },
)
