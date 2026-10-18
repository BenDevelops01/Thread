import { useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { KanbanColumn } from '@/components/tasks/kanban-column'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { boardQuery } from '@/lib/queries/tasks'
import {
  createColumn,
  deleteColumn,
  moveTask,
  updateTask,
} from '@/server/tasks'

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import type { BoardData } from '@/server/tasks'
import type { Task } from '@/lib/supabase/types'

const byPosition = (a: Task, b: Task) => a.position - b.position

function applyMove(data: BoardData, activeId: string, toColumnId: string, toIndex: number): BoardData {
  const others = data.tasks
    .filter((t) => t.id !== activeId && t.column_id === toColumnId)
    .sort(byPosition)
  const ids = others.map((t) => t.id)
  const index = Math.min(Math.max(0, toIndex), ids.length)
  ids.splice(index, 0, activeId)

  const positionById = new Map(ids.map((id, i) => [id, i]))
  const tasks = data.tasks.map((t) => {
    if (t.id === activeId) return { ...t, column_id: toColumnId, position: index }
    if (positionById.has(t.id)) return { ...t, position: positionById.get(t.id)! }
    return t
  })
  return { ...data, tasks }
}

export function TaskBoard() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery(boardQuery())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [creatingIn, setCreatingIn] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['board'] })

  const moveMutation = useMutation({
    mutationFn: (vars: { id: string; toColumnId: string; toIndex: number }) =>
      moveTask({ data: vars }),
    onSettled: invalidate,
  })

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; completed: boolean }) =>
      updateTask({ data: vars }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['board'] })
      const previous = queryClient.getQueryData<BoardData>(['board'])
      queryClient.setQueryData<BoardData>(['board'], (old) =>
        old
          ? {
              ...old,
              tasks: old.tasks.map((t) =>
                t.id === vars.id ? { ...t, completed: vars.completed } : t,
              ),
            }
          : old,
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['board'], ctx.previous)
    },
    onSettled: invalidate,
  })

  const addColumnMutation = useMutation({
    mutationFn: (name: string) => createColumn({ data: { name } }),
    onSuccess: invalidate,
  })

  const deleteColumnMutation = useMutation({
    mutationFn: (id: string) => deleteColumn({ data: { id } }),
    onSuccess: invalidate,
  })

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || !data) return

    const activeTask = data.tasks.find((t) => t.id === active.id)
    if (!activeTask) return

    const overTask = data.tasks.find((t) => t.id === over.id)
    let toColumnId: string
    let toIndex: number

    if (overTask) {
      toColumnId = overTask.column_id
      const colTasks = data.tasks.filter((t) => t.column_id === toColumnId).sort(byPosition)
      toIndex = colTasks.findIndex((t) => t.id === over.id)
    } else {
      toColumnId = String(over.id)
      toIndex = data.tasks.filter((t) => t.column_id === toColumnId).length
    }

    if (activeTask.column_id === toColumnId && activeTask.position === toIndex) return

    queryClient.setQueryData<BoardData>(['board'], (old) =>
      old ? applyMove(old, activeTask.id, toColumnId, toIndex) : old,
    )
    moveMutation.mutate({ id: activeTask.id, toColumnId, toIndex })
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  const activeTask = data.tasks.find((t) => t.id === activeId)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {data.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={data.tasks
                .filter((t) => t.column_id === column.id)
                .sort(byPosition)}
              onAdd={() => {
                setEditingTask(null)
                setCreatingIn(column.id)
                setDialogOpen(true)
              }}
              onEditTask={(task) => {
                setEditingTask(task)
                setCreatingIn(null)
                setDialogOpen(true)
              }}
              onToggleTask={(task, completed) =>
                toggleMutation.mutate({ id: task.id, completed })
              }
              onDeleteColumn={() => {
                deleteColumnMutation.mutate(column.id)
                toast.success(`Deleted “${column.name}”`)
              }}
            />
          ))}

          <AddColumn onAdd={(name) => addColumnMutation.mutate(name)} />
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="surface w-[280px] p-3 text-sm shadow-xl ring-1 ring-thread">
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        columnId={creatingIn}
        columns={data.columns}
      />
    </div>
  )
}

function AddColumn({ onAdd }: { onAdd: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const trimmed = name.trim()
    if (trimmed) onAdd(trimmed)
    setName('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex h-10 w-[300px] shrink-0 items-center gap-2 rounded-xl border border-dashed border-border/70 px-3 text-sm text-muted-foreground transition-colors hover:border-thread/40 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Add column
      </button>
    )
  }

  return (
    <div className="w-[300px] shrink-0 rounded-xl border border-border/70 bg-card/50 p-2">
      <input
        ref={inputRef}
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') {
            setName('')
            setEditing(false)
          }
        }}
        onBlur={submit}
        placeholder="Column name"
        className="w-full rounded-md bg-transparent px-2 py-1.5 text-sm outline-none"
      />
    </div>
  )
}
