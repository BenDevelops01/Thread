import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PRIORITIES } from '@/lib/priority'
import { createTask, deleteTask, moveTask, updateTask } from '@/server/tasks'

import type { Column, Task } from '@/lib/supabase/types'

function toLocalInput(value: string | null, withTime = true) {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  columnId,
  columns,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  columnId: string | null
  columns: Column[]
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<string>('none')
  const [due, setDue] = useState('')
  const [reminder, setReminder] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setPriority(task?.priority ?? 'none')
    setDue(toLocalInput(task?.due_at ?? null, false))
    setReminder(toLocalInput(task?.reminder_at ?? null, true))
  }, [open, task])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['board'] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        priority: priority as (typeof PRIORITIES)[number]['value'],
        due_at: due ? new Date(`${due}T00:00:00`).toISOString() : null,
        reminder_at: reminder ? new Date(reminder).toISOString() : null,
      }
      if (task) {
        return updateTask({ data: { id: task.id, ...payload } })
      }
      if (!columnId) throw new Error('No column selected')
      return createTask({ data: { columnId, ...payload } })
    },
    onSuccess: async () => {
      await invalidate()
      onOpenChange(false)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask({ data: { id: task!.id } }),
    onSuccess: async () => {
      await invalidate()
      onOpenChange(false)
      toast.success('Task deleted')
    },
  })

  const moveMutation = useMutation({
    mutationFn: (toColumnId: string) => moveTask({ data: { id: task!.id, toColumnId, toIndex: 0 } }),
    onSuccess: invalidate,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Column</Label>
              <Select
                value={task?.column_id ?? columnId ?? undefined}
                onValueChange={(value) => {
                  if (task) moveMutation.mutate(value)
                }}
                disabled={!task}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-reminder">Reminder</Label>
              <Input
                id="task-reminder"
                type="datetime-local"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {task ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={title.trim().length === 0 || saveMutation.isPending}
            >
              {task ? 'Save' : 'Create task'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
