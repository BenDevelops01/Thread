import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import {
  applyTheme,
  DEFAULT_THEME,
  isThemeId,
  THEME_STORAGE_KEY,
} from '@/lib/themes'
import type { ThemeId } from '@/lib/themes'
import {
  ACTIVITY_COLOR_STORAGE_KEY,
  DEFAULT_ACTIVITY_COLOR,
  applyActivityColor,
  isActivityColorId,
} from '@/lib/activity-color'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
  activityColor: string
  setActivityColor: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  activityColor: DEFAULT_ACTIVITY_COLOR,
  setActivityColor: () => {},
})

function readStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(stored)) return stored
  } catch {
    // ignore storage access errors (private mode, etc.)
  }
  return DEFAULT_THEME
}

function readStoredActivityColor(): string {
  if (typeof window === 'undefined') return DEFAULT_ACTIVITY_COLOR
  try {
    const stored = window.localStorage.getItem(ACTIVITY_COLOR_STORAGE_KEY)
    if (isActivityColorId(stored)) return stored
  } catch {
    // ignore storage access errors
  }
  return DEFAULT_ACTIVITY_COLOR
}

export function ThemeProvider({
  children,
  savedTheme,
  themeEnabled = true,
}: {
  children: ReactNode
  savedTheme?: string | null
  /** When false (marketing/auth pages), the default theme is forced. */
  themeEnabled?: boolean
}) {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme)
  const [activityColor, setActivityColorState] = useState<string>(readStoredActivityColor)
  const lastSavedTheme = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    applyTheme(themeEnabled ? theme : DEFAULT_THEME)
  }, [theme, themeEnabled])

  useEffect(() => {
    applyActivityColor(themeEnabled ? activityColor : DEFAULT_ACTIVITY_COLOR)
  }, [activityColor, themeEnabled])

  useEffect(() => {
    // Only adopt the account theme when the server value itself changes. A local
    // pick must never be clobbered by a stale profile value.
    if (lastSavedTheme.current === savedTheme) return
    lastSavedTheme.current = savedTheme
    if (isThemeId(savedTheme)) {
      setThemeState((current) => (current === savedTheme ? current : savedTheme))
    }
  }, [savedTheme])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id)
    } catch {
      // ignore storage access errors
    }
  }, [])

  const setActivityColor = useCallback((id: string) => {
    setActivityColorState(id)
    try {
      window.localStorage.setItem(ACTIVITY_COLOR_STORAGE_KEY, id)
    } catch {
      // ignore storage access errors
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, activityColor, setActivityColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
