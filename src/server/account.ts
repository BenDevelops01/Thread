import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'

export const updateProfile = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      full_name: z.string().max(80).optional(),
      avatar_url: z.string().url().max(500).optional().nullable(),
      theme: z.string().max(40).optional(),
      onboarded: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, message: 'Not signed in.' }

    const { error } = await supabase.from('profiles').update(data).eq('id', user.id)
    if (error) return { ok: false as const, message: error.message }
    return { ok: true as const }
  })

/** Permanently deletes the account and all associated data. */
export const deleteAccount = createServerFn({ method: 'POST' })
  .validator(z.object({ confirm: z.literal('DELETE') }))
  .handler(async () => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, message: 'Not signed in.' }

    const admin = createSupabaseAdminClient()
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return { ok: false as const, message: error.message }

    await supabase.auth.signOut()
    return { ok: true as const }
  })
