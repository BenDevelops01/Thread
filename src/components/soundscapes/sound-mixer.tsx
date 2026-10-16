import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Power, Volume2, Waves } from 'lucide-react'

import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { getSoundscape, saveSoundscape } from '@/server/soundscapes'
import { LAYERS, SoundscapeEngine } from '@/lib/audio/soundscape-engine'
import type { LayerId } from '@/lib/audio/soundscape-engine'
import { cn } from '@/lib/utils'

type LayerState = Record<LayerId, boolean>

const defaultVolumes = () =>
  Object.fromEntries(LAYERS.map((l) => [l.id, l.defaultVolume])) as Record<LayerId, number>

export function SoundMixer() {
  const engineRef = useRef<SoundscapeEngine | null>(null)
  const [enabled, setEnabled] = useState<LayerState>(() =>
    Object.fromEntries(LAYERS.map((l) => [l.id, false])) as LayerState,
  )
  const [volumes, setVolumes] = useState<Record<LayerId, number>>(defaultVolumes)
  const [master, setMaster] = useState(0.7)
  const [rendering, setRendering] = useState<LayerId | null>(null)
  const loadedRef = useRef(false)

  const { data: saved } = useQuery({ queryKey: ['soundscape'], queryFn: () => getSoundscape() })

  const engine = () => {
    if (!engineRef.current) engineRef.current = new SoundscapeEngine()
    return engineRef.current
  }

  useEffect(() => {
    if (!saved || loadedRef.current) return
    loadedRef.current = true
    setEnabled(() => {
      const next = Object.fromEntries(LAYERS.map((l) => [l.id, false])) as LayerState
      return next
    })
    setVolumes((prev) => {
      const next = { ...prev }
      for (const layer of LAYERS) {
        const entry = saved.layers[layer.id]
        if (entry) next[layer.id] = entry.volume
      }
      return next
    })
    setMaster(saved.master)
  }, [saved])

  useEffect(() => {
    return () => engineRef.current?.dispose()
  }, [])

  const saveMutation = useMutation({
    mutationFn: () => saveSoundscape({ data: { layers: toLayerPayload(enabled, volumes), master } }),
  })

  useEffect(() => {
    if (!loadedRef.current) return
    const timer = setTimeout(() => saveMutation.mutate(), 900)
    return () => clearTimeout(timer)
  }, [enabled, volumes, master])

  async function toggle(id: LayerId) {
    const next = !enabled[id]
    setEnabled((prev) => ({ ...prev, [id]: next }))
    if (next) {
      setRendering(id)
      try {
        await engine().enable(id)
        engine().setVolume(id, volumes[id])
      } finally {
        setRendering(null)
      }
    } else {
      engine().disable(id)
    }
  }

  function changeVolume(id: LayerId, value: number) {
    setVolumes((prev) => ({ ...prev, [id]: value }))
    engine().setVolume(id, value)
  }

  function changeMaster(value: number) {
    setMaster(value)
    engine().setMaster(value)
  }

  function stopAll() {
    engine().stopAll()
    setEnabled(Object.fromEntries(LAYERS.map((l) => [l.id, false])) as LayerState)
  }

  const activeCount = useMemo(() => Object.values(enabled).filter(Boolean).length, [enabled])

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
                  onClick={() => toggle(layer.id)}
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

function toLayerPayload(enabled: LayerState, volumes: Record<LayerId, number>) {
  return Object.fromEntries(
    LAYERS.map((l) => [l.id, { enabled: enabled[l.id], volume: volumes[l.id] }]),
  )
}
