import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface SavedMix {
  layers: Partial<Record<string, { enabled: boolean; volume: number }>>
  master: number
}

async function requireUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

export const getSoundscape = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SavedMix | null> => {
    const { supabase, userId } = await requireUser()
    const { data } = await supabase
      .from('soundscapes')
      .select('layers')
      .eq('user_id', userId)
      .eq('name', 'default')
      .maybeSingle()
    if (!data) return null
    const layers = (data.layers ?? {}) as SavedMix['layers']
    return { layers, master: (layers as { __master?: number }).__master ?? 0.7 }
  },
)

export const saveSoundscape = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      layers: z.record(z.string(), z.object({ enabled: z.boolean(), volume: z.number() })),
      master: z.number().min(0).max(1),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase, userId } = await requireUser()
    const payload = { ...data.layers, __master: data.master }

    const { data: existing } = await supabase
      .from('soundscapes')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'default')
      .maybeSingle()

    if (existing) {
      await supabase.from('soundscapes').update({ layers: payload }).eq('id', existing.id)
    } else {
      await supabase
        .from('soundscapes')
        .insert({ user_id: userId, name: 'default', layers: payload })
    }
    return { ok: true as const }
  })
