import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { getSoundscape, saveSoundscape } from '@/server/soundscapes'
import { LAYERS, SoundscapeEngine } from '@/lib/audio/soundscape-engine'
import type { LayerId } from '@/lib/audio/soundscape-engine'

type LayerState = Record<LayerId, boolean>

const allOff = () =>
  Object.fromEntries(LAYERS.map((l) => [l.id, false])) as LayerState

const defaultVolumes = () =>
  Object.fromEntries(LAYERS.map((l) => [l.id, l.defaultVolume])) as Record<LayerId, number>

interface SoundscapeValue {
  enabled: LayerState
  volumes: Record<LayerId, number>
  master: number
  rendering: LayerId | null
  activeCount: number
  toggle: (id: LayerId) => Promise<void>
  changeVolume: (id: LayerId, value: number) => void
  changeMaster: (value: number) => void
  stopAll: () => void
}

const SoundscapeContext = createContext<SoundscapeValue | null>(null)

export function useSoundscape(): SoundscapeValue {
  const ctx = useContext(SoundscapeContext)
  if (!ctx) throw new Error('useSoundscape must be used within a SoundscapeProvider')
  return ctx
}

/**
 * Owns the audio engine for the whole workspace.
 *
 * The engine is created lazily and only disposed when the workspace itself
 * unmounts — never on tab changes — so a soundscape keeps playing while you
 * jump between notes, tasks and focus. Web Audio keeps rendering in a
 * background browser tab too, so this survives tab switches as well.
 */
export function SoundscapeProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<SoundscapeEngine | null>(null)
  const [enabled, setEnabled] = useState<LayerState>(allOff)
  const [volumes, setVolumes] = useState(defaultVolumes)
  const [master, setMaster] = useState(0.7)
  const [rendering, setRendering] = useState<LayerId | null>(null)
  const loadedRef = useRef(false)

  const engine = () => {
    if (!engineRef.current) engineRef.current = new SoundscapeEngine()
    return engineRef.current
  }

  const { data: saved } = useQuery({ queryKey: ['soundscape'], queryFn: () => getSoundscape() })

  // Hydrate volumes + master from the account once. `enabled` is deliberately
  // left alone: browsers can't resume audio without a gesture, so we never
  // start playing on our own — but we also never clobber what IS playing when
  // a saved payload lands after the user has started something.
  useEffect(() => {
    if (!saved || loadedRef.current) return
    loadedRef.current = true
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

  // Teardown only when the whole app unmounts (sign out / leave the workspace).
  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  const saveMutation = useMutation({
    mutationFn: () =>
      saveSoundscape({ data: { layers: toLayerPayload(enabled, volumes), master } }),
  })

  useEffect(() => {
    if (!loadedRef.current) return
    const timer = setTimeout(() => saveMutation.mutate(), 900)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setEnabled(allOff())
  }

  const value: SoundscapeValue = {
    enabled,
    volumes,
    master,
    rendering,
    activeCount: Object.values(enabled).filter(Boolean).length,
    toggle,
    changeVolume,
    changeMaster,
    stopAll,
  }

  return <SoundscapeContext.Provider value={value}>{children}</SoundscapeContext.Provider>
}

function toLayerPayload(enabled: LayerState, volumes: Record<LayerId, number>) {
  return Object.fromEntries(
    LAYERS.map((l) => [l.id, { enabled: enabled[l.id], volume: volumes[l.id] }]),
  )
}
