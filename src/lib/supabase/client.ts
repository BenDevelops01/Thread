import { createBrowserClient } from '@supabase/ssr'

import type { Database } from './types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local',
    )
  }

  browserClient = createBrowserClient<Database>(url, key)
  return browserClient
}
