import { createServerFn } from '@tanstack/react-start'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import type { Profile } from '@/lib/supabase/types'

export interface SessionPayload {
  user: { id: string; email: string | null } | null
  profile: Profile | null
}

/** Reads the current session + profile from cookies. Safe to call in beforeLoad. */
export const fetchSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionPayload> => {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { user: null, profile: null }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    return {
      user: { id: user.id, email: user.email ?? null },
      profile: (profile) ?? null,
    }
  },
)

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  return { ok: true as const }
})
