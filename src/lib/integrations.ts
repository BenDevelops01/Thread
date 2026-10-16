export type ProviderId = 'github' | 'vercel' | 'supabase' | 'linear' | 'notion'

export interface ProviderMeta {
  id: ProviderId
  name: string
  blurb: string
  /** What kind of credential the user pastes. */
  tokenLabel: string
  tokenPlaceholder: string
  /** Where to create the token. */
  helpUrl: string
  /** Accent colour used on the card. */
  accent: string
  /** Whether we can pull activity into Logs automatically. */
  syncs: boolean
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: 'github',
    name: 'GitHub',
    blurb: 'Commits, pull requests and releases flow into your Logs.',
    tokenLabel: 'Personal access token',
    tokenPlaceholder: 'ghp_… or github_pat_…',
    helpUrl: 'https://github.com/settings/tokens',
    accent: '#e6edf3',
    syncs: true,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    blurb: 'Deployments appear in your Logs as they ship.',
    tokenLabel: 'Access token',
    tokenPlaceholder: 'vercel token',
    helpUrl: 'https://vercel.com/account/tokens',
    accent: '#ffffff',
    syncs: true,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    blurb: 'Link projects to keep your workspace and data in one thread.',
    tokenLabel: 'Personal access token',
    tokenPlaceholder: 'sbp_…',
    helpUrl: 'https://supabase.com/dashboard/account/tokens',
    accent: '#3ecf8e',
    syncs: true,
  },
  {
    id: 'linear',
    name: 'Linear',
    blurb: 'Issues and cycles, ready to reference from notes.',
    tokenLabel: 'API key',
    tokenPlaceholder: 'lin_api_…',
    helpUrl: 'https://linear.app/settings/api',
    accent: '#5e6ad2',
    syncs: false,
  },
  {
    id: 'notion',
    name: 'Notion',
    blurb: 'Import pages and databases as notes.',
    tokenLabel: 'Integration token',
    tokenPlaceholder: 'secret_… or ntn_…',
    helpUrl: 'https://www.notion.so/my-integrations',
    accent: '#e6e6e6',
    syncs: false,
  },
]

export function providerMeta(id: string): ProviderMeta | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

export interface BuiltinPlugin {
  id: string
  name: string
  blurb: string
  defaultEnabled: boolean
}

export const BUILTINS: BuiltinPlugin[] = [
  {
    id: 'reminders',
    name: 'Task reminders',
    blurb: 'Browser notifications for tasks that have a due time.',
    defaultEnabled: true,
  },
  {
    id: 'daily-journal',
    name: 'Daily journal nudge',
    blurb: 'A gentle prompt to write at the end of the day.',
    defaultEnabled: false,
  },
  {
    id: 'weekly-review',
    name: 'Weekly review',
    blurb: 'A Sunday digest of your activity and open tasks.',
    defaultEnabled: false,
  },
]

export function builtinMeta(id: string): BuiltinPlugin | undefined {
  return BUILTINS.find((b) => b.id === id)
}

