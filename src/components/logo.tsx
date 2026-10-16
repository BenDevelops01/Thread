import { cn } from '@/lib/utils'

/** The Thread brand mark, rendered in `currentColor` via a CSS mask. */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('brand-mark inline-block shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden
    />
  )
}

export function Logo({
  className,
  size = 24,
  showWord = true,
}: {
  className?: string
  size?: number
  showWord?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandMark size={size} className="text-foreground" />
      {showWord ? (
        <span className="text-[1.05rem] font-semibold tracking-tight text-foreground">Thread</span>
      ) : null}
    </span>
  )
}
