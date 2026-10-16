import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { EventRow } from '@/lib/supabase/types'

async function requireUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

export interface LogsResult {
  events: EventRow[]
  sources: string[]
  total: number
}

export const listEvents = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      source: z.string().optional(),
      limit: z.number().min(1).max(200).optional(),
      sinceDays: z.number().min(1).max(3650).optional(),
    }),
  )
  .handler(async ({ data }): Promise<LogsResult> => {
    const { supabase, userId } = await requireUser()

    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .limit(data.limit ?? 80)

    if (data.source) query = query.eq('source', data.source)
    if (data.sinceDays) {
      const since = new Date(Date.now() - data.sinceDays * 86_400_000).toISOString()
      query = query.gte('occurred_at', since)
    }

    const { data: events } = await query

    const { data: sourceRows } = await supabase
      .from('events')
      .select('source')
      .eq('user_id', userId)
      .limit(1000)

    const sources = [...new Set((sourceRows ?? []).map((r) => r.source))].sort()

    return { events: events ?? [], sources, total: events?.length ?? 0 }
  })
