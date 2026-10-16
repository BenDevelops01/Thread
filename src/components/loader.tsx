import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { BrandMark } from '@/components/logo'
import { OpencodeIcon, SupabaseIcon, VercelIcon } from '@/components/brand-icons'
import { GitHubIcon } from '@/components/integration-logos'
import { cn } from '@/lib/utils'

const ORBIT = [
  { Icon: SupabaseIcon, angle: -90 },
  { Icon: GitHubIcon, angle: 0 },
  { Icon: VercelIcon, angle: 90 },
  { Icon: OpencodeIcon, angle: 180 },
] as const

export function OrbitLoader({
  size = 180,
  label,
  className,
}: {
  size?: number
  label?: string
  className?: string
}) {
  const radius = size * 0.36
  const chip = size * 0.22

  return (
    <div className={cn('orbit-loader', className)} style={{ width: size, height: size }}>
      <div className="orbit-ring" />
      <div className="orbit-ring-dashed" />
      <div className="orbit-glow" />

      <div className="orbit-spin">
        {ORBIT.map(({ Icon, angle }, i) => {
          const rad = (angle * Math.PI) / 180
          return (
            <span
              key={i}
              className="orbit-slot"
              style={{
                left: `calc(50% + ${Math.round(Math.cos(rad) * radius)}px)`,
                top: `calc(50% + ${Math.round(Math.sin(rad) * radius)}px)`,
              }}
            >
              <span className="orbit-chip" style={{ width: chip, height: chip }}>
                <Icon style={{ width: chip * 0.5, height: chip * 0.5 }} />
              </span>
            </span>
          )
        })}
      </div>

      <span className="orbit-core">
        <span className="orbit-core-ring" />
        <BrandMark size={size * 0.24} />
      </span>

      {label ? (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  )
}

/** Full-screen loader shown on first paint and during slow transitions. */
export function PageLoader({ label = 'Threading it together…' }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] w-full place-items-center px-6 py-16">
      <div className="flex flex-col items-center gap-8">
        <OrbitLoader size={190} />
        <p className="text-sm tracking-wide text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/**
 * Overlay rendered on first paint (SSR) so slow loads still feel alive. It fades
 * out once React has mounted on the client.
 */
export function AppLoader() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const minDisplay = setTimeout(() => setHidden(true), 120)
    const safety = setTimeout(() => setHidden(true), 4000)
    return () => {
      clearTimeout(minDisplay)
      clearTimeout(safety)
    }
  }, [])

  return (
    <div className={cn('app-loader', hidden && 'is-hidden')} aria-hidden={hidden}>
      <div className="flex flex-col items-center gap-8">
        <OrbitLoader size={190} />
        <p className="text-sm tracking-wide text-muted-foreground">Threading it together…</p>
      </div>
    </div>
  )
}

/** Thin indeterminate bar shown while route loaders are running. */
export function NavProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading })
  if (!isLoading) return null
  return <div className="nav-progress" />
}

