import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export interface ActivityCounts {
  notes: number
  tasks: number
  journal: number
  focus: number
}

export interface ActivityDay {
  day: string
  counts: ActivityCounts
  score: number
}

export interface ActivityResult {
  days: ActivityDay[]
  total: number
  streak: number
  best: number
}

const emptyCounts = (): ActivityCounts => ({ notes: 0, tasks: 0, journal: 0, focus: 0 })

function dayKey(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10)
}

function scoreOf(counts: ActivityCounts) {
  return counts.notes * 2 + counts.tasks + counts.journal * 2 + counts.focus
}

async function requireUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

export const getActivity = createServerFn({ method: 'GET' })
  .validator(z.object({ days: z.number().int().min(30).max(400).optional() }).optional())
  .handler(async ({ data }): Promise<ActivityResult> => {
    const { supabase, userId } = await requireUser()
    return computeActivity(supabase, userId, data?.days ?? 182)
  })

export async function computeActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  span: number,
): Promise<ActivityResult> {
    const since = new Date()
    since.setDate(since.getDate() - span)
    const sinceIso = since.toISOString()

    const [notesRes, tasksRes, journalRes, focusRes] = await Promise.all([
      supabase.from('notes').select('created_at').eq('user_id', userId).gte('created_at', sinceIso),
      supabase
        .from('tasks')
        .select('updated_at, completed')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('updated_at', sinceIso),
      supabase
        .from('journal_entries')
        .select('entry_date')
        .eq('user_id', userId)
        .gte('entry_date', sinceIso.slice(0, 10)),
      supabase
        .from('focus_sessions')
        .select('started_at, duration_seconds, completed')
        .eq('user_id', userId)
        .gte('started_at', sinceIso),
    ])

    const map = new Map<string, ActivityCounts>()
    const ensure = (key: string) => {
      let c = map.get(key)
      if (!c) {
        c = emptyCounts()
        map.set(key, c)
      }
      return c
    }

    for (const n of notesRes.data ?? []) ensure(dayKey(n.created_at)).notes += 1
    for (const t of tasksRes.data ?? []) ensure(dayKey(t.updated_at)).tasks += 1
    for (const j of journalRes.data ?? []) ensure(dayKey(j.entry_date)).journal += 1
    for (const f of focusRes.data ?? []) {
      const minutes = Math.round(f.duration_seconds / 60)
      if (minutes > 0) ensure(dayKey(f.started_at)).focus += minutes
    }

    const days: ActivityDay[] = []
    const cursor = new Date(sinceIso)
    const todayTime = new Date()
    cursor.setHours(0, 0, 0, 0)
    todayTime.setHours(0, 0, 0, 0)

    while (cursor.getTime() <= todayTime.getTime()) {
      const key = dayKey(cursor)
      const counts = map.get(key) ?? emptyCounts()
      days.push({ day: key, counts, score: scoreOf(counts) })
      cursor.setDate(cursor.getDate() + 1)
    }

    const total = days.reduce((sum, d) => sum + d.score, 0)
    const best = days.reduce((max, d) => Math.max(max, d.score), 0)

    let streak = 0
    for (let i = days.length - 1; i >= 0; i -= 1) {
      if (days[i].score > 0) streak += 1
      else if (i === days.length - 1) continue
      else break
    }

    return { days, total, streak, best }
}
