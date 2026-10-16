/**
 * Generative ambient soundscape engine.
 * Layers are produced by shaping noise through filters and baked envelopes —
 * there is no musical note or oscillator playback anywhere here.
 */

export type LayerId = 'rain' | 'ocean' | 'wind' | 'fire' | 'stream' | 'white'

export interface LayerDef {
  id: LayerId
  name: string
  description: string
  defaultVolume: number
}

export const LAYERS: LayerDef[] = [
  { id: 'rain', name: 'Rain', description: 'Steady rainfall on a window', defaultVolume: 0.5 },
  { id: 'ocean', name: 'Ocean', description: 'Slow rolling waves', defaultVolume: 0.45 },
  { id: 'wind', name: 'Wind', description: 'Low, distant wind', defaultVolume: 0.4 },
  { id: 'fire', name: 'Fireplace', description: 'Crackling embers', defaultVolume: 0.4 },
  { id: 'stream', name: 'Stream', description: 'Shallow running water', defaultVolume: 0.4 },
  { id: 'white', name: 'White noise', description: 'Flat, focus-friendly hush', defaultVolume: 0.3 },
]

const LOOP_SECONDS = 16

function fillNoise(channel: Float32Array, type: 'white' | 'pink' | 'brown') {
  if (type === 'white') {
    for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1
    return
  }
  if (type === 'brown') {
    let last = 0
    for (let i = 0; i < channel.length; i += 1) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      channel[i] = last * 3.5
    }
    return
  }
  // pink (Paul Kellet's economy filter)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < channel.length; i += 1) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    channel[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
}

function makeEnvelope(kind: 'waves' | 'crackle' | 'steady', duration: number) {
  const points = 512
  const curve = new Float32Array(points)
  for (let i = 0; i < points; i += 1) {
    const t = i / points
    if (kind === 'steady') {
      curve[i] = 0.85 + 0.15 * Math.sin(t * Math.PI * 2)
    } else if (kind === 'waves') {
      const cycles = Math.max(1, Math.round(duration / 6))
      curve[i] = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * cycles))
    } else {
      curve[i] = Math.random() < 0.02 ? 0.6 + Math.random() * 0.4 : 0.12 + Math.random() * 0.08
    }
  }
  return curve
}

interface LayerRecipe {
  noise: 'white' | 'pink' | 'brown'
  filters: { type: BiquadFilterType; frequency: number; Q?: number }[]
  envelope: 'waves' | 'crackle' | 'steady'
  gain: number
}

const RECIPES: Record<LayerId, LayerRecipe> = {
  rain: {
    noise: 'white',
    filters: [
      { type: 'highpass', frequency: 800 },
      { type: 'lowpass', frequency: 9000 },
    ],
    envelope: 'steady',
    gain: 0.7,
  },
  ocean: {
    noise: 'brown',
    filters: [{ type: 'lowpass', frequency: 600 }],
    envelope: 'waves',
    gain: 0.9,
  },
  wind: {
    noise: 'pink',
    filters: [{ type: 'lowpass', frequency: 450 }],
    envelope: 'waves',
    gain: 0.9,
  },
  fire: {
    noise: 'brown',
    filters: [{ type: 'bandpass', frequency: 1600, Q: 0.6 }],
    envelope: 'crackle',
    gain: 0.9,
  },
  stream: {
    noise: 'white',
    filters: [{ type: 'bandpass', frequency: 2600, Q: 0.8 }],
    envelope: 'steady',
    gain: 0.6,
  },
  white: {
    noise: 'white',
    filters: [{ type: 'lowpass', frequency: 12000 }],
    envelope: 'steady',
    gain: 0.5,
  },
}

async function renderLayer(id: LayerId, sampleRate: number): Promise<AudioBuffer> {
  const recipe = RECIPES[id]
  const offline = new OfflineAudioContext(2, Math.floor(sampleRate * LOOP_SECONDS), sampleRate)

  const buffer = offline.createBuffer(2, offline.length, sampleRate)
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch)
    fillNoise(data, recipe.noise)
  }

  const source = offline.createBufferSource()
  source.buffer = buffer
  source.loop = true

  let node: AudioNode = source
  for (const f of recipe.filters) {
    const filter = offline.createBiquadFilter()
    filter.type = f.type
    filter.frequency.value = f.frequency
    if (f.Q) filter.Q.value = f.Q
    node.connect(filter)
    node = filter
  }

  const gain = offline.createGain()
  const scale = recipe.gain * 0.35
  const curve = makeEnvelope(recipe.envelope, LOOP_SECONDS)
  for (let i = 0; i < curve.length; i += 1) curve[i] *= scale
  gain.gain.value = 0
  gain.gain.setValueCurveAtTime(curve, 0, LOOP_SECONDS)
  node.connect(gain)
  gain.connect(offline.destination)

  source.start(0)
  return offline.startRendering()
}

export class SoundscapeEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private buffers = new Map<LayerId, AudioBuffer>()
  private nodes = new Map<LayerId, { src: AudioBufferSourceNode; gain: GainNode }>()
  private volumes = new Map<LayerId, number>()
  private masterVolume = 0.7

  private async init() {
    if (this.ctx) return
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.masterVolume
    this.master.connect(this.ctx.destination)
  }

  async enable(id: LayerId) {
    await this.init()
    if (!this.ctx || !this.master || this.nodes.has(id)) return
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    if (!this.buffers.has(id)) {
      this.buffers.set(id, await renderLayer(id, this.ctx.sampleRate))
    }

    const src = this.ctx.createBufferSource()
    src.buffer = this.buffers.get(id)!
    src.loop = true
    const gain = this.ctx.createGain()
    const target = this.volumes.get(id) ?? 0.5
    gain.gain.value = 0
    src.connect(gain)
    gain.connect(this.master)
    src.start()
    gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.6)
    this.nodes.set(id, { src, gain })
  }

  disable(id: LayerId) {
    const node = this.nodes.get(id)
    if (!node || !this.ctx) return
    node.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2)
    const src = node.src
    const gain = node.gain
    setTimeout(() => {
      try {
        src.stop()
      } catch {
        /* already stopped */
      }
      src.disconnect()
      gain.disconnect()
    }, 800)
    this.nodes.delete(id)
  }

  setVolume(id: LayerId, value: number) {
    this.volumes.set(id, value)
    const node = this.nodes.get(id)
    if (node && this.ctx) node.gain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.1)
  }

  setMaster(value: number) {
    this.masterVolume = value
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.1)
  }

  stopAll() {
    for (const id of [...this.nodes.keys()]) this.disable(id)
  }

  dispose() {
    this.stopAll()
    void this.ctx?.close()
    this.ctx = null
    this.master = null
    this.buffers.clear()
  }
}
