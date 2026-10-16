import { useRouteContext } from '@tanstack/react-router'

import type { SessionPayload } from '@/server/auth'
import type { Profile } from '@/lib/supabase/types'

/** Current session + profile, provided by the root route's beforeLoad. */
export function useSession(): SessionPayload {
  return useRouteContext({ from: '__root__' }).session
}

export function useProfile(): Profile | null {
  return useSession().profile
}
