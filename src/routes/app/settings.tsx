import { useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Sparkles, Check, Trash2 } from 'lucide-react'

import { PageHeader, PageBody } from '@/components/page-header'
import { PremiumBadge, usePremium } from '@/components/premium-gate'
import { ThemePicker } from '@/components/theme-picker'
import { ActivityColorPicker } from '@/components/activity-color-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { redeemCode } from '@/server/premium'
import { deleteAccount, updateProfile } from '@/server/account'
import { useSession } from '@/lib/session'
import { signOutClient } from '@/lib/auth'

export const Route = createFileRoute('/app/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Your account, plan and workspace." />
      <PageBody className="px-6 py-6">
        <Tabs defaultValue="profile" className="max-w-2xl">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-6">
            <ProfileForm />
          </TabsContent>
          <TabsContent value="appearance" className="mt-6">
            <AppearancePanel />
          </TabsContent>
          <TabsContent value="premium" className="mt-6">
            <PremiumPanel />
          </TabsContent>
          <TabsContent value="account" className="mt-6">
            <DangerZone />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  )
}

function ProfileForm() {
  const { user, profile } = useSession()
  const router = useRouter()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await updateProfile({ data: { full_name: fullName } })
      if (!result.ok) throw new Error(result.message)
      await router.invalidate()
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="surface space-y-5 p-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user?.email ?? ''} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">Name</Label>
        <Input
          id="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Save changes
      </Button>
    </form>
  )
}

function AppearancePanel() {
  const { can } = usePremium()

  return (
    <div className="space-y-6">
      <div className="surface space-y-5 p-6">
        <div>
          <h2 className="font-semibold tracking-tight">Theme</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the mood that suits you. Your choice syncs to your account.
            {!can('extra_themes') ? ' Some themes are part of Premium.' : ''}
          </p>
        </div>
        <ThemePicker />
      </div>

      <div className="surface space-y-5 p-6">
        <div>
          <h2 className="font-semibold tracking-tight">Activity colour</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the colour of your activity grid and heatmap — from graphite to a vivid hue.
          </p>
        </div>
        <ActivityColorPicker />
      </div>
    </div>
  )
}

function PremiumPanel() {
  const { profile, user } = useSession()
  const { isPremium } = usePremium()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  async function redeem(e: React.FormEvent) {
    e.preventDefault()
    setRedeeming(true)
    try {
      const result = await redeemCode({ data: { code } })
      if (!result.ok) throw new Error(result.message)
      toast.success(result.message)
      setCode('')
      // Drop the cached session first, otherwise the router reload below would
      // happily re-read the still-stale free plan from the query cache.
      queryClient.removeQueries({ queryKey: ['session'] })
      await router.invalidate()
      await queryClient.invalidateQueries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not redeem code')
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div id="redeem" className="surface space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold tracking-tight">
            Plan
            <PremiumBadge />
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPremium
              ? `Premium is active${profile?.plan_source ? ` (${profile.plan_source})` : ''}.`
              : 'You are on the free plan.'}
          </p>
        </div>
        <span className="mono text-xs uppercase tracking-wide text-muted-foreground">
          {profile?.plan ?? 'free'}
        </span>
      </div>

      {!isPremium ? (
        <form onSubmit={redeem} className="space-y-3">
          <Label htmlFor="code">Redeem a code</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="THREAD-XXXX-XXXX"
              className="mono uppercase"
              autoComplete="off"
            />
            <Button type="submit" disabled={redeeming || code.trim().length === 0}>
              {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Unlock
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Codes are verified on the server. {user?.email ? `Signed in as ${user.email}.` : ''}
          </p>
        </form>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-thread/30 bg-thread/10 px-4 py-3 text-sm text-thread">
          <Sparkles className="h-4 w-4" />
          Premium features are unlocked across your workspace.
        </div>
      )}
    </div>
  )
}

function DangerZone() {
  const router = useRouter()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const result = await deleteAccount({ data: { confirm: 'DELETE' } })
      if (!result.ok) throw new Error(result.message)
      await signOutClient()
      queryClient.clear()
      await router.invalidate()
      toast.success('Account deleted')
      void navigate({ to: '/' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="surface space-y-4 border-destructive/30 p-6">
      <div>
        <h2 className="font-semibold tracking-tight text-destructive">Delete account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently removes your account and all notes, tasks, journal entries and history. This
          cannot be undone.
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4" />
            Delete my account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Type <span className="mono font-medium text-foreground">DELETE</span> to confirm. This
              is permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="mono"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirm !== 'DELETE' || deleting}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
