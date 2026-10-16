import { createSupabaseBrowserClient } from '@/lib/supabase/client'

function callbackUrl() {
  if (typeof window === 'undefined') return undefined
  return `${window.location.origin}/auth/callback`
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUpWithPassword(email: string, password: string, fullName: string) {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: callbackUrl(),
    },
  })
  if (error) throw error
}

export async function signOutClient() {
  const supabase = createSupabaseBrowserClient()
  await supabase.auth.signOut()
}
