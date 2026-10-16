import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import type { JournalEntry } from '@/lib/supabase/types'

export const MOODS = [
  { value: 'great', label: 'Great', emoji: '🤩' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'low', label: 'Low', emoji: '😔' },
  { value: 'rough', label: 'Rough', emoji: '😣' },
] as const

async function requireUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export const listJournal = createServerFn({ method: 'GET' }).handler(
  async (): Promise<JournalEntry[]> => {
    const { supabase, userId } = await requireUser()
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  },
)

export const saveJournal = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      entry_date: z.string().optional(),
      title: z.string().max(200).nullable().optional(),
      content: z.string().optional(),
      mood: z.string().max(20).nullable().optional(),
    }),
  )
  .handler(async ({ data }): Promise<JournalEntry> => {
    const { supabase, userId } = await requireUser()
    const date = data.entry_date ?? today()

    let existingId = data.id
    if (!existingId) {
      const { data: existing } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('entry_date', date)
        .maybeSingle()
      existingId = existing?.id
    }

    const patch = {
      title: data.title ?? null,
      content: data.content ?? '',
      mood: data.mood ?? null,
    }

    if (existingId) {
      const { data: entry, error } = await supabase
        .from('journal_entries')
        .update(patch)
        .eq('id', existingId)
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return entry
    }

    const { data: entry, error } = await supabase
      .from('journal_entries')
      .insert({ user_id: userId, entry_date: date, ...patch })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return entry
  })

export const deleteJournal = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase } = await requireUser()
    const { error } = await supabase.from('journal_entries').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true as const }
  })
