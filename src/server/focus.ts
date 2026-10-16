import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import type { FocusSession } from '@/lib/supabase/types'

async function requireUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

export const listFocusSessions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FocusSession[]> => {
    const { supabase, userId } = await requireUser()
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return data
  },
)

export const logFocusSession = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      mode: z.enum(['focus', 'short', 'long']).default('focus'),
      duration_seconds: z.number().int().min(1),
      label: z.string().max(200).nullable().optional(),
      completed: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }): Promise<FocusSession> => {
    const { supabase, userId } = await requireUser()
    const { data: session, error } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: userId,
        mode: data.mode,
        duration_seconds: data.duration_seconds,
        label: data.label ?? null,
        completed: data.completed,
        ended_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return session
  })
