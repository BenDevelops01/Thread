import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import type { Board, Column, Task } from '@/lib/supabase/types'

export interface BoardData {
  board: Board
  columns: Column[]
  tasks: Task[]
}

const prioritySchema = z.enum(['none', 'low', 'medium', 'high', 'urgent'])

async function requireUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

const DEFAULT_COLUMNS = ['Backlog', 'To do', 'In progress', 'Done']

async function getOrCreateBoard(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  userId: string,
) {
  const { data: existing } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) return existing

  const { data: board, error } = await supabase
    .from('boards')
    .insert({ user_id: userId, name: 'My board' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('columns').insert(
    DEFAULT_COLUMNS.map((name, i) => ({
      user_id: userId,
      board_id: board.id,
      name,
      position: i,
    })),
  )

  return board
}

export const getBoard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BoardData> => {
    const { supabase, userId } = await requireUser()
    const board = await getOrCreateBoard(supabase, userId)

    const { data: columns } = await supabase
      .from('columns')
      .select('*')
      .eq('board_id', board.id)
      .order('position', { ascending: true })

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', board.id)
      .order('position', { ascending: true })

    return { board, columns: columns ?? [], tasks: tasks ?? [] }
  },
)

export const createTask = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      columnId: z.string().uuid(),
      title: z.string().min(1).max(300),
      description: z.string().max(4000).nullable().optional(),
      priority: prioritySchema.optional(),
      due_at: z.string().nullable().optional(),
      reminder_at: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }): Promise<Task> => {
    const { supabase, userId } = await requireUser()

    const { data: column } = await supabase
      .from('columns')
      .select('id, board_id')
      .eq('id', data.columnId)
      .maybeSingle()
    if (!column) throw new Error('Column not found')

    const { data: last } = await supabase
      .from('tasks')
      .select('position')
      .eq('column_id', data.columnId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        board_id: column.board_id,
        column_id: data.columnId,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? 'none',
        due_at: data.due_at ?? null,
        reminder_at: data.reminder_at ?? null,
        position: (last?.position ?? -1) + 1,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return task
  })

export const updateTask = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(300).optional(),
      description: z.string().max(4000).nullable().optional(),
      priority: prioritySchema.optional(),
      due_at: z.string().nullable().optional(),
      reminder_at: z.string().nullable().optional(),
      completed: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase } = await requireUser()
    const { id, ...patch } = data
    const { error } = await supabase.from('tasks').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    return { ok: true as const }
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase } = await requireUser()
    const { error } = await supabase.from('tasks').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true as const }
  })

export const moveTask = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid(),
      toColumnId: z.string().uuid(),
      toIndex: z.number().int().min(0),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase, userId } = await requireUser()

    const { data: targetTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('column_id', data.toColumnId)
      .order('position', { ascending: true })

    const ids = (targetTasks ?? []).map((t) => t.id).filter((id) => id !== data.id)
    const clamped = Math.min(Math.max(0, data.toIndex), ids.length)
    ids.splice(clamped, 0, data.id)

    await supabase
      .from('tasks')
      .update({ column_id: data.toColumnId })
      .eq('id', data.id)
      .eq('user_id', userId)

    await Promise.all(
      ids.map((id, index) =>
        supabase.from('tasks').update({ position: index }).eq('id', id).eq('user_id', userId),
      ),
    )

    return { ok: true as const }
  })

export const createColumn = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().min(1).max(80) }))
  .handler(async ({ data }): Promise<Column> => {
    const { supabase, userId } = await requireUser()
    const board = await getOrCreateBoard(supabase, userId)

    const { data: last } = await supabase
      .from('columns')
      .select('position')
      .eq('board_id', board.id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: column, error } = await supabase
      .from('columns')
      .insert({
        user_id: userId,
        board_id: board.id,
        name: data.name,
        position: (last?.position ?? -1) + 1,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return column
  })

export const updateColumn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid(), name: z.string().min(1).max(80) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase } = await requireUser()
    const { error } = await supabase
      .from('columns')
      .update({ name: data.name })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true as const }
  })

export const deleteColumn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase } = await requireUser()
    const { error } = await supabase.from('columns').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true as const }
  })
