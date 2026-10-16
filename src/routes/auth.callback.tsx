import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'

export const Route = createFileRoute('/auth/callback')({
  head: () => ({ meta: [{ title: 'Signing in — Thread' }] }),
  component: AuthCallback,
})

function AuthCallback() {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('Finishing sign-in…')

  useEffect(() => {
    let cancelled = false

    async function run() {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        setMessage(error.message)
        return
      }

      if (!data.session) {
        setMessage('No session found. Redirecting to sign in…')
        setTimeout(() => void navigate({ to: '/auth', search: { mode: 'signin' } }), 1200)
        return
      }

      if (cancelled) return
      await queryClient.invalidateQueries()
      await router.invalidate()
      await navigate({ to: '/' })
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [navigate, router, queryClient])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Logo />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {message}
      </div>
    </div>
  )
}
