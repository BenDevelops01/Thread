import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarClock, Bell, GripVertical, Check } from 'lucide-react'

import { formatDue, priorityMeta } from '@/lib/priority'
import { cn } from '@/lib/utils'

import type { Task } from '@/lib/supabase/types'

export function TaskCard({
  task,
  onClick,
  onToggle,
}: {
  task: Task
  onClick: () => void
  onToggle: (completed: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = priorityMeta(task.priority)
  const due = formatDue(task.due_at)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group surface relative flex gap-2 p-3 lift',
        isDragging && 'z-10 opacity-70 ring-1 ring-thread',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 touch-none text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Drag task"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <button
            onClick={() => onToggle(!task.completed)}
            className={cn(
              'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors',
              task.completed
                ? 'border-moss bg-moss text-white'
                : 'border-border hover:border-moss',
            )}
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {task.completed ? <Check className="h-2.5 w-2.5" /> : null}
          </button>
          <button
            onClick={onClick}
            className={cn(
              'min-w-0 flex-1 text-left text-sm',
              task.completed && 'text-muted-foreground line-through',
            )}
          >
            {task.title}
          </button>
        </div>

        {(task.priority !== 'none' || task.due_at || task.reminder_at) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
            {task.priority !== 'none' ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: priority.color }} />
                {priority.label}
              </span>
            ) : null}
            {task.due_at ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[11px]',
                  due.overdue ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {due.label}
              </span>
            ) : null}
            {task.reminder_at ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-thread">
                <Bell className="h-3 w-3" />
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
