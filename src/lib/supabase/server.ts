import { createServerClient } from '@supabase/ssr'
import { getCookies, setCookie } from '@tanstack/react-start/server'

import type { Database } from './types'

function readEnv() {
  const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase env vars for the server client.')
  }
  return { url, key }
}

/**
 * Cookie-bound Supabase client for server functions and route loaders.
 * Reads/writes the session cookie directly on each request (TanStack Start is SSR-first).
 */
export function createSupabaseServerClient() {
  const { url, key } = readEnv()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, options)
        }
      },
    },
  })
}

export type Client = ReturnType<typeof createSupabaseServerClient>

/**
 * Privileged client using the secret key. Bypasses RLS — server-only.
 * Use for admin operations (account deletion, integration token storage).
 */
export function createSupabaseAdminClient() {
  const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY

  if (!url || !secret) {
    throw new Error('Missing SUPABASE_SECRET_KEY — cannot create admin client.')
  }

  return createServerClient<Database>(url, secret, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
