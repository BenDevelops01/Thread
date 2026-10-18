import { Loader2, Power, Volume2, Waves } from 'lucide-react'

import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { useSoundscape } from '@/components/soundscapes/soundscape-provider'
import { LAYERS } from '@/lib/audio/soundscape-engine'
import { cn } from '@/lib/utils'

export function SoundMixer() {
  const { enabled, volumes, master, rendering, activeCount, toggle, changeVolume, changeMaster, stopAll } =
    useSoundscape()

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="surface flex flex-wrap items-center gap-5 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-thread">
          <Waves className="h-5 w-5" />
        </span>
        <div className="min-w-40 flex-1">
          <p className="text-sm font-medium">
            {activeCount === 0 ? 'Silent' : `${activeCount} layer${activeCount > 1 ? 's' : ''} playing`}
          </p>
          <p className="text-xs text-muted-foreground">
            Generative noise, shaped into ambience — no music, just room.
          </p>
        </div>
        <div className="flex min-w-[200px] items-center gap-3">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[master]}
            max={1}
            step={0.01}
            onValueChange={([v]) => changeMaster(v)}
          />
        </div>
        <Button variant="outline" onClick={stopAll} disabled={activeCount === 0}>
          <Power className="h-4 w-4" />
          Stop all
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LAYERS.map((layer) => {
          const on = enabled[layer.id]
          const isRendering = rendering === layer.id
          return (
            <div
              key={layer.id}
              className={cn(
                'surface flex flex-col gap-4 p-5 transition-colors',
                on && 'border-thread/40',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{layer.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{layer.description}</p>
                </div>
                <button
                  onClick={() => void toggle(layer.id)}
                  disabled={isRendering}
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors',
                    on
                      ? 'border-thread bg-thread/15 text-thread'
                      : 'border-border text-muted-foreground hover:border-thread/50',
                  )}
                  aria-label={on ? `Stop ${layer.name}` : `Play ${layer.name}`}
                >
                  {isRendering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                </button>
              </div>

              <Slider
                value={[volumes[layer.id]]}
                max={1}
                step={0.01}
                disabled={!on}
                onValueChange={([v]) => changeVolume(layer.id, v)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
