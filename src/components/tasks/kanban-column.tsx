import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react'

import { TaskCard } from '@/components/tasks/task-card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import type { Column, Task } from '@/lib/supabase/types'

export function KanbanColumn({
  column,
  tasks,
  onAdd,
  onEditTask,
  onToggleTask,
  onDeleteColumn,
}: {
  column: Column
  tasks: Task[]
  onAdd: () => void
  onEditTask: (task: Task) => void
  onToggleTask: (task: Task, completed: boolean) => void
  onDeleteColumn: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const ids = tasks.map((t) => t.id)

  return (
    <div className="flex w-[300px] shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <h2 className="text-sm font-medium">{column.name}</h2>
        <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
          {tasks.length}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-6 w-6 text-muted-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onSelect={onDeleteColumn}>
              <Trash2 className="h-4 w-4" />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-1 flex-col gap-2 rounded-xl border border-dashed border-transparent p-1.5 transition-colors',
          isOver && 'border-thread/50 bg-accent/30',
        )}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onEditTask(task)}
              onToggle={(completed) => onToggleTask(task, completed)}
            />
          ))}
        </SortableContext>

        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="justify-start text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      </div>
    </div>
  )
}
