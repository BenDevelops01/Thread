import type { Plan, Profile } from '@/lib/supabase/types'

export type Feature =
  | 'soundscapes'
  | 'graph'
  | 'integrations'
  | 'logs_history'
  | 'activity_insights'
  | 'export'
  | 'unlimited_boards'
  | 'extra_themes'

export interface FeatureMeta {
  label: string
  description: string
}

/** Human-readable catalog of everything that can be gated. */
export const FEATURES: Record<Feature, FeatureMeta> = {
  soundscapes: {
    label: 'Soundscapes',
    description: 'Generative ambient mixer — rain, noise, café and more, with saved presets.',
  },
  graph: {
    label: 'Notes graph',
    description: 'Interactive graph of every note and [[link]] between them.',
  },
  integrations: {
    label: 'Integrations',
    description: 'Connect GitHub, Vercel, Supabase, Linear, Notion and any MCP server.',
  },
  logs_history: {
    label: 'Full logs history',
    description: 'Unified timeline of commits, deploys and account activity, forever.',
  },
  activity_insights: {
    label: 'Activity insights',
    description: 'Trends and breakdowns behind your productivity heatmap.',
  },
  export: {
    label: 'Data export',
    description: 'Export notes, tasks and journal as Markdown or JSON.',
  },
  unlimited_boards: {
    label: 'Unlimited boards',
    description: 'Create as many task boards and columns as you need.',
  },
  extra_themes: {
    label: 'Extra themes',
    description: 'Additional colour themes beyond the default Thread dark.',
  },
}

export interface PlanLimits {
  /** null = unlimited */
  notes: number | null
  boards: number | null
}

export interface PlanDefinition {
  id: Plan
  name: string
  tagline: string
  features: Feature[]
  limits: PlanLimits
}

export const FREE_PLAN: PlanDefinition = {
  id: 'free',
  name: 'Free',
  tagline: 'Everything you need to get started.',
  features: [],
  limits: { notes: 50, boards: 1 },
}

export const PREMIUM_PLAN: PlanDefinition = {
  id: 'premium',
  name: 'Premium',
  tagline: 'The full Thread workspace.',
  features: [
    'soundscapes',
    'graph',
    'integrations',
    'logs_history',
    'activity_insights',
    'export',
    'unlimited_boards',
    'extra_themes',
  ],
  limits: { notes: null, boards: null },
}

export const FEATURE_LIST: Feature[] = Object.keys(FEATURES) as Feature[]

export function planOf(profile: Pick<Profile, 'plan'> | null | undefined): Plan {
  if (!profile) return 'free'
  return profile.plan === 'premium' ? 'premium' : 'free'
}

export function isPremium(profile: Pick<Profile, 'plan'> | null | undefined): boolean {
  return planOf(profile) === 'premium'
}

export function can(profile: Pick<Profile, 'plan'> | null | undefined, feature: Feature): boolean {
  return isPremium(profile) || FREE_PLAN.features.includes(feature)
}

export function limitsFor(profile: Pick<Profile, 'plan'> | null | undefined): PlanLimits {
  return isPremium(profile) ? PREMIUM_PLAN.limits : FREE_PLAN.limits
}
