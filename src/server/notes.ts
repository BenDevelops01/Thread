import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { noteSnippet, parseTags, parseWikilinks } from '@/lib/note-parser'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Note } from '@/lib/supabase/types'

export interface NoteTagRef {
  id: string
  name: string
  color: string | null
}

export interface NoteListItem {
  id: string
  title: string
  emoji: string | null
  pinned: boolean
  updated_at: string
  snippet: string
  tags: NoteTagRef[]
}

export interface BacklinkRef {
  id: string
  title: string
}

export interface NoteDetail {
  note: Note
  tags: NoteTagRef[]
  outgoing: { title: string; noteId: string | null }[]
  backlinks: BacklinkRef[]
}

async function requireUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

type Client = SupabaseClient<Database>

function toTagRefs(rows: Array<{ id: string; name: string; color: string | null }>): NoteTagRef[] {
  return rows.map((t) => ({ id: t.id, name: t.name, color: t.color }))
}

export const listNotes = createServerFn({ method: 'GET' }).handler(
  async (): Promise<NoteListItem[]> => {
    const { supabase, userId } = await requireUser()

    const { data: notes, error } = await supabase
      .from('notes')
      .select('id, title, content, emoji, pinned, updated_at')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    if (notes.length === 0) return []

    const { data: tags } = await supabase
      .from('tags')
      .select('id, name, color')
      .eq('user_id', userId)

    const { data: noteTags } = await supabase.from('note_tags').select('note_id, tag_id')

    const tagById = new Map<string, NoteTagRef>()
    for (const t of tags ?? []) tagById.set(t.id, t)

    const tagsByNote = new Map<string, NoteTagRef[]>()
    for (const nt of noteTags ?? []) {
      const tag = tagById.get(nt.tag_id)
      if (!tag) continue
      const list = tagsByNote.get(nt.note_id) ?? []
      list.push({ id: tag.id, name: tag.name, color: tag.color })
      tagsByNote.set(nt.note_id, list)
    }

    return notes.map((n) => ({
      id: n.id,
      title: n.title,
      emoji: n.emoji,
      pinned: n.pinned,
      updated_at: n.updated_at,
      snippet: noteSnippet(n.content),
      tags: tagsByNote.get(n.id) ?? [],
    }))
  },
)

export const getNote = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<NoteDetail | null> => {
    const { supabase, userId } = await requireUser()

    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', data.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!note) return null

    const { data: noteTagRows } = await supabase
      .from('note_tags')
      .select('tag_id')
      .eq('note_id', note.id)

    const tagIds = (noteTagRows ?? []).map((r) => r.tag_id)
    let tags: NoteTagRef[] = []
    if (tagIds.length > 0) {
      const { data: tagRows } = await supabase
        .from('tags')
        .select('id, name, color')
        .in('id', tagIds)
      tags = toTagRefs(tagRows ?? [])
    }

    const { data: outgoingRows } = await supabase
      .from('note_links')
      .select('target_title, target_note_id')
      .eq('source_note_id', note.id)

    const outgoing = (outgoingRows ?? []).map((r) => ({
      title: r.target_title,
      noteId: r.target_note_id,
    }))

    const { data: backlinkRows } = await supabase
      .from('note_links')
      .select('source_note_id')
      .eq('user_id', userId)
      .eq('target_note_id', note.id)

    const backlinkIds = new Set((backlinkRows ?? []).map((r) => r.source_note_id))

    // Also match unresolved links by title
    const { data: byTitleRows } = await supabase
      .from('note_links')
      .select('source_note_id')
      .eq('user_id', userId)
      .ilike('target_title', note.title)

    for (const r of byTitleRows ?? []) backlinkIds.add(r.source_note_id)
    backlinkIds.delete(note.id)

    let backlinks: BacklinkRef[] = []
    if (backlinkIds.size > 0) {
      const { data: backlinkNotes } = await supabase
        .from('notes')
        .select('id, title')
        .in('id', [...backlinkIds])
      backlinks = (backlinkNotes ?? []).map((n) => ({ id: n.id, title: n.title }))
    }

    return { note, tags, outgoing, backlinks }
  })

export const createNote = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      title: z.string().max(200).optional(),
      content: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabase, userId } = await requireUser()

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title: data.title?.trim() || 'Untitled',
        content: data.content ?? '',
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    return { id: note.id }
  })

export const updateNote = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid(),
      title: z.string().max(200).optional(),
      content: z.string().optional(),
      emoji: z.string().max(16).nullable().optional(),
      pinned: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase, userId } = await requireUser()

    const patch: Database['public']['Tables']['notes']['Update'] = {}
    if (data.title !== undefined) patch.title = data.title.trim() || 'Untitled'
    if (data.content !== undefined) patch.content = data.content
    if (data.emoji !== undefined) patch.emoji = data.emoji
    if (data.pinned !== undefined) patch.pinned = data.pinned

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('notes').update(patch).eq('id', data.id)
      if (error) throw new Error(error.message)
    }

    if (data.content !== undefined) {
      const title = data.title !== undefined ? data.title.trim() || 'Untitled' : undefined
      await Promise.all([
        syncLinks(supabase, userId, data.id, data.content),
        syncTags(supabase, userId, data.id, data.content),
        title ? resolveOwnLinks(supabase, userId, title, data.id) : Promise.resolve(),
      ])
    }

    return { ok: true as const }
  })

export const deleteNote = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase, userId } = await requireUser()
    const { error } = await supabase.from('notes').delete().eq('id', data.id).eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { ok: true as const }
  })

async function syncLinks(supabase: Client, userId: string, noteId: string, content: string) {
  const titles = parseWikilinks(content)
  await supabase.from('note_links').delete().eq('source_note_id', noteId)

  const rows = await Promise.all(
    titles.map(async (title) => {
      const { data } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', userId)
        .ilike('title', title)
        .limit(1)
      return {
        user_id: userId,
        source_note_id: noteId,
        target_title: title,
        target_note_id: data?.[0]?.id ?? null,
      }
    }),
  )

  if (rows.length > 0) {
    await supabase.from('note_links').insert(rows)
  }
}

/** When a note is renamed, point existing unresolved links at it by title. */
async function resolveOwnLinks(
  supabase: Client,
  userId: string,
  title: string,
  noteId: string,
) {
  await supabase
    .from('note_links')
    .update({ target_note_id: noteId })
    .eq('user_id', userId)
    .is('target_note_id', null)
    .ilike('target_title', title)
}

async function syncTags(supabase: Client, userId: string, noteId: string, content: string) {
  const names = parseTags(content)
  await supabase.from('note_tags').delete().eq('note_id', noteId)
  if (names.length === 0) return

  const { data: tagRows } = await supabase
    .from('tags')
    .upsert(
      names.map((name) => ({ user_id: userId, name })),
      { onConflict: 'user_id,name' },
    )
    .select('id')

  if (tagRows && tagRows.length > 0) {
    await supabase
      .from('note_tags')
      .insert(tagRows.map((t) => ({ note_id: noteId, tag_id: t.id })))
  }
}

export interface GraphNode {
  id: string
  title: string
  links: number
}

export interface GraphEdge {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export const getGraph = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GraphData> => {
    const { supabase, userId } = await requireUser()

    const [{ data: notes }, { data: links }] = await Promise.all([
      supabase.from('notes').select('id, title').eq('user_id', userId),
      supabase
        .from('note_links')
        .select('source_note_id, target_title, target_note_id')
        .eq('user_id', userId),
    ])

    const allNotes = notes ?? []
    const byId = new Map(allNotes.map((n) => [n.id, n]))
    const byTitle = new Map(allNotes.map((n) => [n.title.toLowerCase(), n]))

    const edgeMap = new Map<string, GraphEdge>()
    for (const link of links ?? []) {
      if (!byId.has(link.source_note_id)) continue
      const target = link.target_note_id ?? byTitle.get(link.target_title.toLowerCase())?.id
      if (!target || target === link.source_note_id || !byId.has(target)) continue
      const key = [link.source_note_id, target].sort().join('::')
      edgeMap.set(key, { source: link.source_note_id, target })
    }

    const counts = new Map<string, number>()
    for (const edge of edgeMap.values()) {
      counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1)
      counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1)
    }

    const nodes = allNotes.map((n) => ({
      id: n.id,
      title: n.title,
      links: counts.get(n.id) ?? 0,
    }))

    return { nodes, edges: [...edgeMap.values()] }
  },
)
