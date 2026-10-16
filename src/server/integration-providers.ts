import type { Json } from '@/lib/supabase/types'

export interface Verified {
  label: string
  scopes?: string
  meta: Json
}

export async function verifyToken(provider: string, token: string): Promise<Verified> {
  switch (provider) {
    case 'github': {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'thread-app',
        },
      })
      if (!res.ok) throw new Error('GitHub rejected that token.')
      const user = (await res.json()) as {
        login: string
        name: string | null
        avatar_url: string
      }
      return {
        label: user.login,
        scopes: res.headers.get('x-oauth-scopes') ?? undefined,
        meta: { login: user.login, name: user.name, avatar: user.avatar_url },
      }
    }
    case 'vercel': {
      const res = await fetch('https://api.vercel.com/v2/user', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Vercel rejected that token.')
      const { user } = (await res.json()) as {
        user: { id: string; username?: string; email?: string }
      }
      return {
        label: user.username ?? user.email ?? 'Vercel account',
        meta: { id: user.id, username: user.username, email: user.email },
      }
    }
    case 'supabase': {
      const res = await fetch('https://api.supabase.com/v1/projects', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Supabase rejected that token.')
      const projects = (await res.json()) as { name: string }[]
      return {
        label: `${projects.length} project${projects.length === 1 ? '' : 's'}`,
        meta: { projects: projects.map((p) => p.name) },
      }
    }
    case 'linear': {
      const res = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'query { viewer { name email } }' }),
      })
      if (!res.ok) throw new Error('Linear rejected that key.')
      const json = (await res.json()) as {
        data?: { viewer?: { name?: string; email?: string } }
      }
      const viewer = json.data?.viewer
      if (!viewer) throw new Error('Linear rejected that key.')
      return {
        label: viewer.name ?? viewer.email ?? 'Linear account',
        meta: { name: viewer.name, email: viewer.email },
      }
    }
    case 'notion': {
      const res = await fetch('https://api.notion.com/v1/users/me', {
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
      })
      if (!res.ok) throw new Error('Notion rejected that token.')
      const me = (await res.json()) as {
        id: string
        name?: string
        bot?: { owner?: { workspace_name?: string } }
      }
      const name = me.name ?? me.bot?.owner?.workspace_name ?? 'Notion'
      return { label: name, meta: { name, id: me.id } }
    }
    default:
      throw new Error('Unknown provider.')
  }
}

export interface Handshake {
  reachable: boolean
  server?: string
  tools?: string[]
}

export async function mcpHandshake(url: string): Promise<Handshake> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'thread', version: '1.0' },
        },
      }),
    })
    if (!res.ok) return { reachable: false }
    const text = await res.text()
    const jsonLine =
      text.startsWith('event:') || text.includes('data:')
        ? text.split('\n').find((l) => l.startsWith('data:'))?.slice(5)
        : text
    if (!jsonLine) return { reachable: true }
    const parsed = JSON.parse(jsonLine) as { result?: { serverInfo?: { name?: string } } }
    return { reachable: true, server: parsed.result?.serverInfo?.name }
  } catch {
    return { reachable: false }
  }
}
