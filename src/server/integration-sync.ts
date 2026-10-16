import type { Client } from '@/lib/supabase/server'

async function existingExternalIds(supabase: Client, userId: string, source: string) {
  const { data } = await supabase
    .from('events')
    .select('meta')
    .eq('user_id', userId)
    .eq('source', source)
    .limit(1000)
  const ids = new Set<string>()
  for (const row of data ?? []) {
    const meta = (row.meta ?? {}) as { external_id?: string }
    if (meta.external_id) ids.add(meta.external_id)
  }
  return ids
}

interface GithubEvent {
  id: string
  type: string
  created_at: string
  actor?: { login?: string }
  repo?: { name?: string }
  payload: {
    size?: number
    ref?: string
    ref_type?: string
    master_branch?: string
    description?: string
    action?: string
    number?: number
    comment?: { body?: string }
    pull_request?: { number: number; title: string; html_url: string; merged?: boolean }
    issue?: { number: number; title: string; html_url: string }
    release?: { name: string | null; tag_name?: string; html_url: string }
    forkee?: { full_name?: string }
    pages?: { page_name?: string; title?: string }[]
  }
}

function shortRef(ref: string | undefined) {
  return ref?.replace(/^refs\/(heads|tags)\//, '') ?? null
}

/** Humanize any GitHub event type into a readable title. Logs everything. */
function mapGithubEvent(e: GithubEvent) {
  const repo = e.repo?.name ?? 'a repository'
  const base = {
    source: 'github',
    occurred_at: e.created_at,
    meta: { external_id: e.id, event_type: e.type },
    url: `https://github.com/${repo}`,
  }
  const actor = e.actor?.login
  const who = actor ? `${actor} ` : ''

  switch (e.type) {
    case 'PushEvent':
      return {
        ...base,
        type: 'push',
        title: `${who}pushed ${e.payload.size ?? 0} commit${e.payload.size === 1 ? '' : 's'} to ${repo}`,
        description: shortRef(e.payload.ref),
      }
    case 'PullRequestEvent': {
      const pr = e.payload.pull_request
      const action = e.payload.action ?? 'updated'
      return {
        ...base,
        type: 'pr',
        title: `${who}${action} PR #${pr?.number ?? e.payload.number ?? ''} in ${repo}`,
        description: pr?.title ?? null,
        url: pr?.html_url ?? base.url,
      }
    }
    case 'IssuesEvent': {
      const issue = e.payload.issue
      return {
        ...base,
        type: 'issue',
        title: `${who}${e.payload.action ?? 'updated'} issue #${issue?.number ?? e.payload.number ?? ''} in ${repo}`,
        description: issue?.title ?? null,
        url: issue?.html_url ?? base.url,
      }
    }
    case 'IssueCommentEvent': {
      const issue = e.payload.issue
      const comment = e.payload.comment?.body?.slice(0, 140)
      return {
        ...base,
        type: 'comment',
        title: `${who}commented on #${issue?.number ?? e.payload.number ?? ''} in ${repo}`,
        description: comment ?? null,
      }
    }
    case 'PullRequestReviewEvent': {
      const pr = e.payload.pull_request
      return {
        ...base,
        type: 'review',
        title: `${who}reviewed PR #${pr?.number ?? ''} in ${repo}`,
        description: pr?.title ?? null,
        url: pr?.html_url ?? base.url,
      }
    }
    case 'PullRequestReviewCommentEvent': {
      const pr = e.payload.pull_request
      return {
        ...base,
        type: 'review',
        title: `${who}commented on PR #${pr?.number ?? ''} in ${repo}`,
        description: e.payload.comment?.body?.slice(0, 140) ?? null,
      }
    }
    case 'ReleaseEvent': {
      const release = e.payload.release
      return {
        ...base,
        type: 'release',
        title: `${who}released ${release?.name ?? release?.tag_name ?? ''} in ${repo}`.trim(),
        description: null,
        url: release?.html_url ?? base.url,
      }
    }
    case 'CreateEvent': {
      const refType = e.payload.ref_type ?? 'repository'
      const ref = shortRef(e.payload.ref)
      return {
        ...base,
        type: 'create',
        title:
          refType === 'repository'
            ? `${who}created repo ${repo}`
            : `${who}created ${refType} ${ref ?? ''} in ${repo}`.trim(),
        description: e.payload.description ?? null,
      }
    }
    case 'DeleteEvent': {
      const refType = e.payload.ref_type ?? 'ref'
      return {
        ...base,
        type: 'delete',
        title: `${who}deleted ${refType} ${shortRef(e.payload.ref) ?? ''} in ${repo}`.trim(),
        description: null,
      }
    }
    case 'ForkEvent':
      return {
        ...base,
        type: 'fork',
        title: `${who}forked ${repo}`,
        description: e.payload.forkee?.full_name ?? null,
      }
    case 'WatchEvent':
      return { ...base, type: 'star', title: `${who}starred ${repo}`, description: null }
    case 'PublicEvent':
      return { ...base, type: 'public', title: `${who}made ${repo} public`, description: null }
    case 'MemberEvent':
      return {
        ...base,
        type: 'member',
        title: `${who}${e.payload.action ?? 'added a collaborator to'} ${repo}`,
        description: null,
      }
    case 'GollumEvent': {
      const page = e.payload.pages?.[0]
      return {
        ...base,
        type: 'wiki',
        title: `${who}updated the wiki in ${repo}`,
        description: page?.title ?? null,
      }
    }
    case 'CommitCommentEvent':
      return {
        ...base,
        type: 'comment',
        title: `${who}commented on a commit in ${repo}`,
        description: e.payload.comment?.body?.slice(0, 140) ?? null,
      }
    case 'TeamAddEvent':
      return { ...base, type: 'team', title: `${who}added a team to ${repo}`, description: null }
    default: {
      // Never drop an event — surface it generically so Logs reflects everything.
      const pretty = e.type.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
      return {
        ...base,
        type: e.type,
        title: `${who}${pretty} in ${repo}`.trim(),
        description: null,
      }
    }
  }
}

export async function syncGithub(
  supabase: Client,
  userId: string,
  token: string,
  _login: string | null,
) {
  // Use the authenticated /user/events feed so PRIVATE repo activity is included
  // (the /users/{login}/events feed is public-only). Fetch multiple pages for depth.
  const seen = await existingExternalIds(supabase, userId, 'github')
  const rows: {
    user_id: string
    source: string
    type: string | null
    title: string
    description: string | null
    url: string | null
    occurred_at: string
    meta: Record<string, unknown>
  }[] = []

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'thread-app',
  }

  let lastId: string | undefined
  for (let page = 0; page < 3; page++) {
    const url = `https://api.github.com/user/events?per_page=100${
      lastId ? `&after=${lastId}` : ''
    }`
    const res = await fetch(url, { headers })
    if (!res.ok) break
    const events = (await res.json()) as GithubEvent[]
    if (events.length === 0) break
    for (const e of events) {
      if (seen.has(e.id)) continue
      rows.push({ ...mapGithubEvent(e), user_id: userId })
    }
    lastId = events.at(-1)?.id
    if (events.length < 100) break
  }

  if (rows.length === 0) return 0
  // Insert in chunks to stay well under payload limits.
  for (let i = 0; i < rows.length; i += 200) {
    await supabase.from('events').insert(rows.slice(i, i + 200))
  }
  return rows.length
}

export async function syncVercel(supabase: Client, userId: string, token: string) {
  const res = await fetch('https://api.vercel.com/v6/deployments?limit=100', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return 0
  const { deployments } = (await res.json()) as {
    deployments: {
      uid: string
      name: string
      url: string
      state: string
      target?: string
      creator?: { username?: string; email?: string }
      createdAt: number
    }[]
  }
  const seen = await existingExternalIds(supabase, userId, 'vercel')
  const rows = deployments
    .filter((d) => !seen.has(d.uid))
    .map((d) => ({
      user_id: userId,
      source: 'vercel',
      type: 'deploy',
      title: `Deployed ${d.name}${d.target ? ` (${d.target})` : ''} — ${d.state}`,
      description: d.creator?.username ?? d.creator?.email ?? null,
      url: `https://${d.url}`,
      occurred_at: new Date(d.createdAt).toISOString(),
      meta: { external_id: d.uid, state: d.state },
    }))
  if (rows.length === 0) return 0
  await supabase.from('events').insert(rows)
  return rows.length
}

/** Sync Supabase projects as connection events (first time only per project). */
export async function syncSupabase(
  supabase: Client,
  userId: string,
  token: string,
  label: string | null,
) {
  const res = await fetch('https://api.supabase.com/v1/projects', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return 0
  const projects = (await res.json()) as { id: string; name: string; created_at?: string }[]
  const seen = await existingExternalIds(supabase, userId, 'supabase')
  const rows = projects
    .filter((p) => !seen.has(p.id))
    .map((p) => ({
      user_id: userId,
      source: 'supabase',
      type: 'project',
      title: `Linked Supabase project ${p.name}`,
      description: label ?? null,
      url: `https://supabase.com/dashboard/project/${p.id}`,
      occurred_at: p.created_at ?? new Date().toISOString(),
      meta: { external_id: p.id },
    }))
  if (rows.length === 0) return 0
  await supabase.from('events').insert(rows)
  return rows.length
}
