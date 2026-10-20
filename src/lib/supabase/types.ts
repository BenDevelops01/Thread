export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Plan = 'free' | 'premium'
export type PlanSource = 'free' | 'founder' | 'redeem' | 'billing'

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  plan: Plan
  plan_source: PlanSource
  plan_expires_at: string | null
  theme: string
  onboarded: boolean
  created_at: string
  updated_at: string
}

export type Note = {
  id: string
  user_id: string
  title: string
  content: string
  emoji: string | null
  pinned: boolean
  created_at: string
  updated_at: string
}

export type Tag = {
  id: string
  user_id: string
  name: string
  color: string | null
}

export type NoteTag = {
  note_id: string
  tag_id: string
}

export type NoteLink = {
  id: string
  user_id: string
  source_note_id: string
  target_title: string
  target_note_id: string | null
  created_at: string
}

export type Board = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type Column = {
  id: string
  user_id: string
  board_id: string
  name: string
  position: number
}

export type Task = {
  id: string
  user_id: string
  board_id: string
  column_id: string
  title: string
  description: string | null
  priority: string
  due_at: string | null
  reminder_at: string | null
  completed: boolean
  position: number
  created_at: string
  updated_at: string
}

export type JournalEntry = {
  id: string
  user_id: string
  entry_date: string
  title: string | null
  content: string
  mood: string | null
  created_at: string
  updated_at: string
}

export type FocusSession = {
  id: string
  user_id: string
  task_id: string | null
  label: string | null
  mode: string
  duration_seconds: number
  completed: boolean
  started_at: string
  ended_at: string | null
}

export type Soundscape = {
  id: string
  user_id: string
  name: string
  layers: Json
  created_at: string
}

export type ActivityDay = {
  id: string
  user_id: string
  day: string
  score: number
  counts: Json
}

export type Integration = {
  id: string
  user_id: string
  provider: string
  status: string
  account_label: string | null
  scopes: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export type IntegrationSecret = {
  integration_id: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  updated_at: string
}

export type EventRow = {
  id: string
  user_id: string
  source: string
  type: string | null
  title: string
  description: string | null
  url: string | null
  meta: Json
  occurred_at: string
  created_at: string
}

export type Plugin = {
  id: string
  user_id: string
  kind: string
  provider: string
  name: string
  enabled: boolean
  config: Json
  created_at: string
}

export type RedeemCode = {
  id: string
  code_hash: string
  grants: string
  max_uses: number | null
  uses: number
  is_founder: boolean
  note: string | null
  active: boolean
  created_at: string
}

export type Redemption = {
  id: string
  user_id: string
  code_id: string
  created_at: string
}

export type Subscription = {
  id: string
  user_id: string
  provider: string | null
  provider_customer_id: string | null
  provider_subscription_id: string | null
  status: string
  price_id: string | null
  current_period_end: string | null
  created_at: string
}

type TableDef<T> = {
  Row: T
  Insert: Partial<T>
  Update: Partial<T>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>
      notes: TableDef<Note>
      tags: TableDef<Tag>
      note_tags: TableDef<NoteTag>
      note_links: TableDef<NoteLink>
      boards: TableDef<Board>
      columns: TableDef<Column>
      tasks: TableDef<Task>
      journal_entries: TableDef<JournalEntry>
      focus_sessions: TableDef<FocusSession>
      soundscapes: TableDef<Soundscape>
      activity_days: TableDef<ActivityDay>
      integrations: TableDef<Integration>
      integration_secrets: TableDef<IntegrationSecret>
      events: TableDef<EventRow>
      plugins: TableDef<Plugin>
      redeem_codes: TableDef<RedeemCode>
      redemptions: TableDef<Redemption>
      subscriptions: TableDef<Subscription>
      stripe_customers: TableDef<StripeCustomer>
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type StripeCustomer = {
  user_id: string
  stripe_customer_id: string
  created_at: string
}
