import { cn } from '@/lib/utils'

const STARS = Array.from({ length: 46 }, (_, i) => {
  const x = ((i * 97) % 100)
  const y = ((i * 53 + 11) % 100)
  const size = i % 7 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5
  const delay = ((i * 137) % 40) / 10
  const duration = 3 + ((i * 71) % 30) / 10
  return { x, y, size, delay, duration }
})

/**
 * Ambient animated background: drifting light blooms, a masked grid and
 * faint stars. Reads theme tokens so it adapts to every theme automatically.
 */
export function Backdrop({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 bg-background" />

      <div
        className="backdrop-blob h-[42rem] w-[42rem] opacity-60"
        style={{
          top: '-14rem',
          left: '-10rem',
          background:
            'radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--thread) 22%, transparent), transparent 62%)',
          animation: 'drift-a 26s ease-in-out infinite',
        }}
      />
      <div
        className="backdrop-blob h-[38rem] w-[38rem] opacity-50"
        style={{
          top: '-6rem',
          right: '-12rem',
          background:
            'radial-gradient(circle at 60% 40%, color-mix(in oklab, var(--thread-soft) 26%, transparent), transparent 64%)',
          animation: 'drift-b 32s ease-in-out infinite',
        }}
      />
      <div
        className="backdrop-blob h-[34rem] w-[34rem] opacity-40"
        style={{
          bottom: '-16rem',
          left: '22%',
          background:
            'radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--foreground) 10%, transparent), transparent 66%)',
          animation: 'drift-c 29s ease-in-out infinite',
        }}
      />

      <div className="backdrop-grid" />

      {STARS.map((s, i) => (
        <span
          key={i}
          className="backdrop-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            opacity: 0.4,
          }}
        />
      ))}

      <div className="absolute inset-x-0 top-0 h-40 bg-radial-fade" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 0%, transparent 55%, color-mix(in oklab, var(--background) 85%, transparent) 100%)',
        }}
      />
    </div>
  )
}
