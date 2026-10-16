import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { graphQuery } from '@/lib/queries/notes'

const WIDTH = 1000
const HEIGHT = 640

interface P {
  x: number
  y: number
  vx: number
  vy: number
}

export function GraphView() {
  const navigate = useNavigate()
  const { data } = useQuery(graphQuery())
  const [positions, setPositions] = useState<(P | undefined)[]>([])
  const [hover, setHover] = useState<string | null>(null)
  const simRef = useRef<P[]>([])

  const index = useMemo(() => {
    const map = new Map<string, number>()
    data?.nodes.forEach((n, i) => map.set(n.id, i))
    return map
  }, [data])

  useEffect(() => {
    if (!data || data.nodes.length === 0) {
      setPositions([])
      return
    }
    const n = data.nodes.length
    const points: P[] = Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * Math.PI * 2
      const radius = 180 + Math.random() * 80
      return {
        x: WIDTH / 2 + Math.cos(angle) * radius,
        y: HEIGHT / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      }
    })
    simRef.current = points

    let frame = 0
    let raf = 0
    const step = () => {
      const pts = simRef.current
      const alpha = Math.max(0.02, 0.9 - frame / 400)

      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const dist2 = dx * dx + dy * dy || 0.01
          const dist = Math.sqrt(dist2)
          const force = (2600 / dist2) * alpha
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          pts[i].vx += fx
          pts[i].vy += fy
          pts[j].vx -= fx
          pts[j].vy -= fy
        }
      }

      for (const edge of data.edges) {
        const a = pts[index.get(edge.source)!]
        const b = pts[index.get(edge.target)!]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        const desired = 130
        const force = (dist - desired) * 0.02 * alpha
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }

      for (const p of pts) {
        p.vx += (WIDTH / 2 - p.x) * 0.002 * alpha
        p.vy += (HEIGHT / 2 - p.y) * 0.002 * alpha
        p.vx *= 0.82
        p.vy *= 0.82
        p.x += p.vx
        p.y += p.vy
        p.x = Math.max(40, Math.min(WIDTH - 40, p.x))
        p.y = Math.max(40, Math.min(HEIGHT - 40, p.y))
      }

      setPositions(pts.map((p) => ({ ...p })))
      frame += 1
      if (frame < 500) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [data, index])

  if (!data) return null

  if (data.nodes.length === 0) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
        Create notes with [[wikilinks]] to grow your graph.
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-full w-full">
        <g>
          {data.edges.map((edge, i) => {
            const a = positions[index.get(edge.source)!]
            const b = positions[index.get(edge.target)!]
            if (!a || !b) return null
            const active = hover === edge.source || hover === edge.target
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={active ? 'var(--thread)' : 'var(--border)'}
                strokeWidth={active ? 1.6 : 1}
                opacity={active ? 0.9 : 0.45}
              />
            )
          })}
        </g>
        <g>
          {data.nodes.map((node) => {
            const p = positions[index.get(node.id)!]
            if (!p) return null
            const r = 4 + Math.min(node.links, 8) * 1.4
            const active = hover === node.id
            return (
              <g
                key={node.id}
                transform={`translate(${p.x}, ${p.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHover(node.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => navigate({ to: '/app/notes/$noteId', params: { noteId: node.id } })}
              >
                {active && <circle r={r + 6} fill="var(--thread)" opacity={0.18} />}
                <circle r={r} fill={active ? 'var(--thread)' : 'var(--moss)'} />
                <text
                  x={r + 6}
                  y={4}
                  fontSize={13}
                  fill="var(--foreground)"
                  opacity={active ? 1 : 0.7}
                  className="select-none"
                >
                  {node.title.length > 28 ? `${node.title.slice(0, 28)}…` : node.title}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
