export interface ActivityColorDefinition {
  id: string
  name: string
  /** CSS color used for the brightest cells; null means "follow the theme". */
  swatch: string | null
}

export const ACTIVITY_COLORS: ActivityColorDefinition[] = [
  { id: 'graphite', name: 'Graphite', swatch: null },
  { id: 'green', name: 'Green', swatch: 'oklch(0.78 0.17 150)' },
  { id: 'blue', name: 'Blue', swatch: 'oklch(0.72 0.14 250)' },
  { id: 'cyan', name: 'Cyan', swatch: 'oklch(0.8 0.13 210)' },
  { id: 'purple', name: 'Purple', swatch: 'oklch(0.68 0.18 300)' },
  { id: 'pink', name: 'Pink', swatch: 'oklch(0.74 0.16 350)' },
  { id: 'red', name: 'Red', swatch: 'oklch(0.66 0.21 25)' },
  { id: 'orange', name: 'Orange', swatch: 'oklch(0.76 0.16 55)' },
  { id: 'yellow', name: 'Yellow', swatch: 'oklch(0.85 0.15 95)' },
]

export const DEFAULT_ACTIVITY_COLOR = 'graphite'

const IDS = new Set(ACTIVITY_COLORS.map((c) => c.id))

export function isActivityColorId(value: unknown): value is string {
  return typeof value === 'string' && IDS.has(value)
}

export function activityColorById(id: string | null | undefined): ActivityColorDefinition {
  return ACTIVITY_COLORS.find((c) => c.id === id) ?? ACTIVITY_COLORS[0]
}

export const ACTIVITY_COLOR_STORAGE_KEY = 'thread-activity-color'

/** Applies an activity colour to <html> via data-activity. */
export function applyActivityColor(id: string) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (id === DEFAULT_ACTIVITY_COLOR) delete root.dataset.activity
  else root.dataset.activity = id
}

/** Inline script string injected before paint so the grid colour never flashes. */
export const ACTIVITY_COLOR_INIT_SCRIPT = `(function(){try{var k='${ACTIVITY_COLOR_STORAGE_KEY}';var ids=${JSON.stringify(
  ACTIVITY_COLORS.map((c) => c.id),
)};var p=location.pathname;var isApp=p==='/app'||p.indexOf('/app/')===0;if(!isApp)return;var v=localStorage.getItem(k);if(ids.indexOf(v)!==-1&&v!=='${DEFAULT_ACTIVITY_COLOR}'){document.documentElement.setAttribute('data-activity',v);}}catch(e){}})();`
