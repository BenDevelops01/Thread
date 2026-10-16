import { Check, Lock } from 'lucide-react'
import { toast } from 'sonner'

import { usePremium } from '@/components/premium-gate'
import { useTheme } from '@/components/theme-provider'
import { updateProfile } from '@/server/account'
import { THEMES } from '@/lib/themes'
import type { ThemeDefinition } from '@/lib/themes'
import { cn } from '@/lib/utils'

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const { can } = usePremium()
  const canThemes = can('extra_themes')

  function choose(def: ThemeDefinition) {
    if (def.premium && !canThemes) {
      toast.error(`${def.name} is a Premium theme. Unlock it to use it.`)
      return
    }
    setTheme(def.id)
    void updateProfile({ data: { theme: def.id } }).catch(() => {})
    toast.success(`${def.name} applied`)
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {THEMES.map((def) => {
        const locked = def.premium && !canThemes
        const active = def.id === theme
        return (
          <button
            key={def.id}
            type="button"
            onClick={() => choose(def)}
            aria-pressed={active}
            className={cn(
              'group relative overflow-hidden rounded-xl border p-2 text-left transition-all',
              active
                ? 'border-foreground/50 ring-2 ring-ring/50'
                : 'border-border hover:border-foreground/30',
            )}
          >
            <span
              className="block h-20 w-full overflow-hidden rounded-lg border"
              style={{ background: def.swatch.background, borderColor: def.swatch.border }}
            >
              <span className="flex h-full flex-col justify-between p-2.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: def.swatch.accent }}
                  />
                  <span
                    className="h-1.5 w-8 rounded-full"
                    style={{ background: def.swatch.foreground, opacity: 0.85 }}
                  />
                  <span
                    className="h-1.5 w-5 rounded-full"
                    style={{ background: def.swatch.foreground, opacity: 0.4 }}
                  />
                </span>
                <span
                  className="h-7 w-full rounded-md border"
                  style={{ background: def.swatch.card, borderColor: def.swatch.border }}
                />
              </span>
            </span>

            <span className="mt-2 flex items-center justify-between gap-2 px-0.5">
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {def.name}
                  {locked ? <Lock className="h-3 w-3 text-muted-foreground" /> : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {def.description}
                </span>
              </span>
              {active ? (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-foreground text-background">
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
