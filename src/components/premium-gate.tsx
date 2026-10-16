import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Lock, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FEATURES, can, isPremium  } from '@/lib/entitlements'
import type {Feature} from '@/lib/entitlements';
import { useProfile } from '@/lib/session'
import { cn } from '@/lib/utils'

export function usePremium() {
  const profile = useProfile()
  return {
    isPremium: isPremium(profile),
    can: (feature: Feature) => can(profile, feature),
  }
}

/** Renders children if the feature is unlocked, otherwise a premium upsell. */
export function PremiumGate({
  feature,
  children,
  className,
}: {
  feature: Feature
  children?: ReactNode
  className?: string
}) {
  const { can: canFeature } = usePremium()
  if (canFeature(feature)) return <>{children}</>
  return <UpgradePanel feature={feature} className={className} />
}

export function UpgradePanel({ feature, className }: { feature: Feature; className?: string }) {
  const meta = FEATURES[feature]
  return (
    <div
      className={cn(
        'surface relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(600px 300px at 50% 0%, color-mix(in oklab, var(--thread) 30%, transparent), transparent 70%)',
        }}
      />
      <span className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-thread">
        <Lock className="h-5 w-5" />
      </span>
      <h3 className="relative text-lg font-semibold tracking-tight">
        {meta.label} is a Premium feature
      </h3>
      <p className="relative mt-2 max-w-sm text-sm text-muted-foreground">{meta.description}</p>
      <Button asChild className="relative mt-6">
        <Link to="/app/settings" hash="redeem">
          <Sparkles className="h-4 w-4" />
          Unlock Premium
        </Link>
      </Button>
    </div>
  )
}

export function PremiumBadge({ className }: { className?: string }) {
  const { isPremium: premium } = usePremium()
  if (!premium) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-thread/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-thread',
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      Premium
    </span>
  )
}
