import { useEffect, useState } from 'react'

import type { ReactNode } from 'react'

/**
 * Renders `children` only after the client has mounted. Use for values that
 * depend on the user's locale/timezone so the server and client agree.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: () => ReactNode
  fallback?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return <>{mounted ? children() : fallback}</>
}
