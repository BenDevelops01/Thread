import { useMemo, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NotebookPen, Plus, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { notesQuery } from '@/lib/queries/notes'
import { createNote } from '@/server/notes'
import { cn } from '@/lib/utils'

export function NotesPane() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activeId = pathname.startsWith('/app/notes/') ? pathname.split('/')[3] : undefined

  const { data: notes = [], isLoading } = useQuery(notesQuery())
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.snippet.toLowerCase().includes(q) ||
        n.tags.some((t) => t.name.includes(q)),
    )
  }, [notes, query])

  const createMutation = useMutation({
    mutationFn: () => createNote({ data: {} }),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
      void navigate({ to: '/app/notes/$noteId', params: { noteId: id } })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not create note'),
  })

  return (
    <div
      className={cn(
        'flex w-full shrink-0 flex-col border-r border-border/60 md:flex md:w-[320px]',
        activeId && 'hidden md:flex',
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes"
            className="h-9 pl-8"
          />
        </div>
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          title="New note"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            <NotebookPen className="mx-auto mb-3 h-5 w-5 text-thread" />
            {notes.length === 0 ? 'No notes yet. Create your first.' : 'No notes match your search.'}
          </div>
        ) : (
          <ul className="p-2">
            {filtered.map((note) => (
              <li key={note.id}>
                <button
                  onClick={() => void navigate({ to: '/app/notes/$noteId', params: { noteId: note.id } })}
                  className={cn(
                    'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                    activeId === note.id ? 'bg-accent' : 'hover:bg-accent/50',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {note.emoji ? <span className="text-sm">{note.emoji}</span> : null}
                    <span className="truncate text-sm font-medium">{note.title}</span>
                    {note.pinned ? <span className="text-thread">•</span> : null}
                  </div>
                  {note.snippet ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {note.snippet}
                    </p>
                  ) : null}
                  {note.tags.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
