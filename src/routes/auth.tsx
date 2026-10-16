import { useState } from 'react'
import { createFileRoute, Link, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Mail } from 'lucide-react'

import { Logo } from '@/components/logo'
import { Backdrop } from '@/components/backdrop'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HeatmapMock } from '@/components/heatmap-mock'
import { signInWithPassword, signUpWithPassword } from '@/lib/auth'

const searchSchema = z.object({
  mode: z.enum(['signin', 'signup']).catch('signin'),
})

export const Route = createFileRoute('/auth')({
  validateSearch: searchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.session.user) throw redirect({ to: '/' })
    return { mode: search.mode }
  },
  head: () => ({
    meta: [
      { title: 'Sign in — Thread' },
      { name: 'description', content: 'Sign in to your Thread workspace.' },
    ],
  }),
  component: AuthPage,
})

type Loading = 'email' | null

function AuthPage() {
  const { mode } = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<Loading>(null)

  const isSignup = mode === 'signup'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading('email')
    try {
      if (isSignup) {
        await signUpWithPassword(email, password, fullName)
        toast.success('Account created. Check your email to confirm, then sign in.')
      } else {
        await signInWithPassword(email, password)
      }
      await router.invalidate()
      await navigate({ to: '/' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <Backdrop className="lg:hidden" />

      <div className="relative flex items-center justify-center px-6 py-16">
        <div className="relative z-10 w-full max-w-md">
          <Link
            to="/"
            className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Logo />
          </Link>

          <h1 className="mt-12 text-3xl font-semibold tracking-tight sm:text-4xl">
            {isSignup ? 'Create your workspace' : 'Welcome back'}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {isSignup
              ? 'Notes, tasks, journal and focus — in one calm place.'
              : 'Sign in to pick up your thread.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="What should we call you?"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading !== null}>
              {loading === 'email' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            {isSignup ? 'Already have an account?' : 'New to Thread?'}{' '}
            <Link
              to="/auth"
              search={{ mode: isSignup ? 'signin' : 'signup' }}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </Link>
          </p>

          <p className="mt-6 text-xs text-muted-foreground">
            By continuing you agree to our{' '}
            <Link to="/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="relative hidden items-center justify-center overflow-hidden border-l border-border px-10 lg:flex">
        <Backdrop />
        <div className="relative z-10 max-w-md">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Your year, in squares
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            Every day you show up, the grid brightens.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Notes, tasks, journal entries and focus sessions all feed one quiet, honest picture of
            your momentum.
          </p>
          <div className="mt-8 surface p-5">
            <HeatmapMock />
          </div>
        </div>
      </div>
    </div>
  )
}
