import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'
import { providerMeta } from '@/lib/integrations'
import { mcpHandshake, verifyToken } from '@/server/integration-providers'
import { syncGithub, syncSupabase, syncVercel } from '@/server/integration-sync'

async function requireUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

export interface IntegrationView {
  provider: string
  status: string
  account_label: string | null
  scopes: string | null
  updated_at: string
}

export interface McpView {
  id: string
  name: string
  url: string
  enabled: boolean
  toolCount: number | null
}

export interface BuiltinView {
  id: string
  enabled: boolean
}

export const listIntegrations = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{
    integrations: IntegrationView[]
    mcp: McpView[]
    builtins: BuiltinView[]
  }> => {
    const { supabase, userId } = await requireUser()

    const [{ data: integrations }, { data: plugins }] = await Promise.all([
      supabase
        .from('integrations')
        .select('provider, status, account_label, scopes, updated_at')
        .eq('user_id', userId),
      supabase
        .from('plugins')
        .select('id, kind, name, enabled, config, provider')
        .eq('user_id', userId),
    ])

    const mcp: McpView[] = []
    const builtins: BuiltinView[] = []
    for (const p of plugins ?? []) {
      if (p.kind === 'mcp') {
        const config = (p.config ?? {}) as { url?: string; tools?: string[] }
        mcp.push({
          id: p.id,
          name: p.name,
          url: config.url ?? '',
          enabled: p.enabled,
          toolCount: config.tools ? config.tools.length : null,
        })
      } else {
        builtins.push({ id: p.provider, enabled: p.enabled })
      }
    }

    return { integrations: integrations ?? [], mcp, builtins }
  },
)

export const connectIntegration = createServerFn({ method: 'POST' })
  .validator(z.object({ provider: z.string(), token: z.string().min(8) }))
  .handler(async ({ data }): Promise<{ ok: true; label: string }> => {
    const { supabase, userId } = await requireUser()
    if (!providerMeta(data.provider)) throw new Error('Unknown provider.')

    const verified = await verifyToken(data.provider, data.token)
    const admin = createSupabaseAdminClient()

    const { data: row, error } = await supabase
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          provider: data.provider,
          status: 'connected',
          account_label: verified.label,
          scopes: verified.scopes ?? null,
          metadata: verified.meta,
        },
        { onConflict: 'user_id,provider' },
      )
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    const { error: secretError } = await admin.from('integration_secrets').upsert({
      integration_id: row.id,
      access_token: data.token,
      updated_at: new Date().toISOString(),
    })
    if (secretError) throw new Error(secretError.message)

    return { ok: true as const, label: verified.label }
  })

export const disconnectIntegration = createServerFn({ method: 'POST' })
  .validator(z.object({ provider: z.string() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase, userId } = await requireUser()
    const admin = createSupabaseAdminClient()

    const { data: row } = await supabase
      .from('integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', data.provider)
      .maybeSingle()

    if (row) {
      await admin.from('integration_secrets').delete().eq('integration_id', row.id)
    }
    await supabase
      .from('integrations')
      .update({ status: 'disconnected', account_label: null, scopes: null })
      .eq('user_id', userId)
      .eq('provider', data.provider)

    return { ok: true as const }
  })

export const addMcpServer = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().min(1).max(60), url: z.string().url() }))
  .handler(async ({ data }): Promise<{ ok: true; reachable: boolean }> => {
    const { supabase, userId } = await requireUser()
    const handshake = await mcpHandshake(data.url)

    const provider = `mcp:${data.url}`
    const { error } = await supabase.from('plugins').upsert(
      {
        user_id: userId,
        kind: 'mcp',
        provider,
        name: data.name,
        enabled: handshake.reachable,
        config: {
          url: data.url,
          reachable: handshake.reachable,
          server: handshake.server ?? null,
          tools: handshake.tools ?? [],
        },
      },
      { onConflict: 'user_id,provider' },
    )
    if (error) throw new Error(error.message)
    return { ok: true as const, reachable: handshake.reachable }
  })

export const removeMcpServer = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase, userId } = await requireUser()
    await supabase.from('plugins').delete().eq('id', data.id).eq('user_id', userId)
    return { ok: true as const }
  })

export const toggleBuiltinPlugin = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), name: z.string(), enabled: z.boolean() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase, userId } = await requireUser()
    const { error } = await supabase.from('plugins').upsert(
      {
        user_id: userId,
        kind: 'builtin',
        provider: data.id,
        name: data.name,
        enabled: data.enabled,
        config: {},
      },
      { onConflict: 'user_id,provider' },
    )
    if (error) throw new Error(error.message)
    return { ok: true as const }
  })

export const syncActivity = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ inserted: number; synced: string[] }> => {
    const { supabase, userId } = await requireUser()
    const admin = createSupabaseAdminClient()

    const { data: integrations } = await supabase
      .from('integrations')
      .select('id, provider, account_label')
      .eq('user_id', userId)
      .eq('status', 'connected')

    let inserted = 0
    const synced: string[] = []

    for (const integration of integrations ?? []) {
      const { data: secret } = await admin
        .from('integration_secrets')
        .select('access_token')
        .eq('integration_id', integration.id)
        .maybeSingle()
      const token = secret?.access_token
      if (!token) continue

      if (integration.provider === 'github') {
        inserted += await syncGithub(supabase, userId, token, integration.account_label)
        synced.push('github')
      } else if (integration.provider === 'vercel') {
        inserted += await syncVercel(supabase, userId, token)
        synced.push('vercel')
      } else if (integration.provider === 'supabase') {
        inserted += await syncSupabase(supabase, userId, token, integration.account_label)
        synced.push('supabase')
      }
    }

    return { inserted, synced }
  },
)
