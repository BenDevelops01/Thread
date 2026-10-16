export type ThemeId = 'dark' | 'midnight' | 'slate' | 'starry' | 'light' | 'cream'

export type ThemeFamily = 'dark' | 'light'

export interface ThemeSwatch {
  background: string
  card: string
  foreground: string
  accent: string
  border: string
}

export interface ThemeDefinition {
  id: ThemeId
  name: string
  description: string
  family: ThemeFamily
  /** Premium themes require the `extra_themes` entitlement. */
  premium: boolean
  swatch: ThemeSwatch
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'dark',
    name: 'Dark',
    description: 'Monochrome black and graphite. The default.',
    family: 'dark',
    premium: false,
    swatch: {
      background: 'oklch(0.145 0 0)',
      card: 'oklch(0.185 0 0)',
      foreground: 'oklch(0.97 0 0)',
      accent: 'oklch(0.9 0 0)',
      border: 'oklch(1 0 0 / 10%)',
    },
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Crisp white with soft grey surfaces.',
    family: 'light',
    premium: false,
    swatch: {
      background: 'oklch(0.99 0 0)',
      card: 'oklch(1 0 0)',
      foreground: 'oklch(0.19 0 0)',
      accent: 'oklch(0.3 0 0)',
      border: 'oklch(0 0 0 / 11%)',
    },
  },
  {
    id: 'cream',
    name: 'Cream',
    description: 'Warm paper tones for long reading.',
    family: 'light',
    premium: false,
    swatch: {
      background: 'oklch(0.975 0.018 85)',
      card: 'oklch(0.995 0.012 88)',
      foreground: 'oklch(0.27 0.03 70)',
      accent: 'oklch(0.44 0.06 62)',
      border: 'oklch(0.4 0.04 70 / 18%)',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'True black for OLED displays.',
    family: 'dark',
    premium: true,
    swatch: {
      background: 'oklch(0.08 0 0)',
      card: 'oklch(0.12 0 0)',
      foreground: 'oklch(0.97 0 0)',
      accent: 'oklch(0.92 0 0)',
      border: 'oklch(1 0 0 / 9%)',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Cool blue-grey, calm and quiet.',
    family: 'dark',
    premium: true,
    swatch: {
      background: 'oklch(0.2 0.02 248)',
      card: 'oklch(0.24 0.022 248)',
      foreground: 'oklch(0.95 0.008 248)',
      accent: 'oklch(0.85 0.04 240)',
      border: 'oklch(1 0 0 / 11%)',
    },
  },
  {
    id: 'starry',
    name: 'Starry Night',
    description: 'Deep indigo with a touch of starlight.',
    family: 'dark',
    premium: true,
    swatch: {
      background: 'oklch(0.17 0.045 268)',
      card: 'oklch(0.21 0.05 268)',
      foreground: 'oklch(0.95 0.02 268)',
      accent: 'oklch(0.84 0.1 252)',
      border: 'oklch(1 0 0 / 12%)',
    },
  },
]

export const DEFAULT_THEME: ThemeId = 'dark'

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id))

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value)
}

export function themeById(id: string | null | undefined): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

export const THEME_STORAGE_KEY = 'thread-theme'

/**
 * The user's theme only applies inside the workspace (`/app/*`). Marketing and
 * auth pages always render in the default theme so the landing page can never be
 * re-coloured by an in-app preference.
 */
export function isAppPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/')
}

/** Applies a theme to <html>: sets data-theme and the .dark marker used by `dark:`. */
export function applyTheme(id: ThemeId) {
  if (typeof document === 'undefined') return
  const theme = themeById(id)
  const root = document.documentElement
  root.dataset.theme = theme.id
  root.classList.toggle('dark', theme.family === 'dark')
  root.style.colorScheme = theme.family
}

const DARK_THEME_USE = `(t==='midnight'||t==='slate'||t==='starry'||t==='dark')`

/** Inline script string injected before paint to avoid a flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var ids=${JSON.stringify(
  THEMES.map((t) => t.id),
)};var t=localStorage.getItem(k);if(ids.indexOf(t)===-1){t='${DEFAULT_THEME}';}var p=location.pathname;var isApp=p==='/app'||p.indexOf('/app/')===0;if(!isApp){t='${DEFAULT_THEME}';}var d=${DARK_THEME_USE};var r=document.documentElement;r.setAttribute('data-theme',t);r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`
