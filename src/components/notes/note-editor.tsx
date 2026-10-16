import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import {
  ArrowLeft,
  Loader2,
  Pin,
  PinOff,
  Smile,
  Trash2,
  Link2,
  CornerDownLeft,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { noteQuery } from '@/lib/queries/notes'
import { threadEditorExtensions } from '@/lib/editor-theme'
import { deleteNote, updateNote } from '@/server/notes'
import { cn } from '@/lib/utils'

const EMOJIS = [
  '📝','💡','📌','🔥','✅','🎯','📚','🧠','🚀','🛠️','🌱','☕',
  '🔖','🧩','📎','🗓️','💬','🧭','⚡','🎨','🧪','📈','🌙','✨',
]

export function NoteEditor({ noteId }: { noteId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery(noteQuery(noteId))

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const loadedIdRef = useRef<string | null>(null)
  const savedRef = useRef({ title: '', content: '' })

  useEffect(() => {
    if (!data) return
    if (loadedIdRef.current === data.note.id) return
    loadedIdRef.current = data.note.id
    setTitle(data.note.title)
    setContent(data.note.content)
    savedRef.current = { title: data.note.title, content: data.note.content }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (payload: { title: string; content: string }) =>
      updateNote({ data: { id: noteId, ...payload } }),
    onSuccess: () => {
      setStatus('saved')
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
      void queryClient.invalidateQueries({ queryKey: ['note', noteId] })
    },
    onError: (error) => {
      setStatus('idle')
      toast.error(error instanceof Error ? error.message : 'Could not save note')
    },
  })

  useEffect(() => {
    if (loadedIdRef.current !== noteId) return
    if (title === savedRef.current.title && content === savedRef.current.content) return

    setStatus('saving')
    const timer = setTimeout(() => {
      savedRef.current = { title, content }
      saveMutation.mutate({ title, content })
    }, 700)
    return () => clearTimeout(timer)
  }, [title, content, noteId])

  const deleteMutation = useMutation({
    mutationFn: () => deleteNote({ data: { id: noteId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note deleted')
      void navigate({ to: '/app/notes' })
    },
  })

  const pinMutation = useMutation({
    mutationFn: (pinned: boolean) => updateNote({ data: { id: noteId, pinned } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
      await queryClient.invalidateQueries({ queryKey: ['note', noteId] })
    },
  })

  const emojiMutation = useMutation({
    mutationFn: (emoji: string | null) => updateNote({ data: { id: noteId, emoji } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
      await queryClient.invalidateQueries({ queryKey: ['note', noteId] })
    },
  })

  const extensions = useMemo(
    () => [...threadEditorExtensions, markdown({ base: markdownLanguage, codeLanguages: languages }), EditorView.lineWrapping],
    [],
  )

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 px-8 py-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Note not found.
      </div>
    )
  }

  const { note, tags, outgoing, backlinks } = data

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => void navigate({ to: '/app/notes' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              {note.emoji ? <span className="text-base">{note.emoji}</span> : <Smile className="h-4 w-4" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => emojiMutation.mutate(emoji)}
                  className="rounded p-1 text-lg hover:bg-accent"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => emojiMutation.mutate(null)}
              className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
            >
              Remove icon
            </button>
          </PopoverContent>
        </Popover>

        <span className="ml-auto text-xs text-muted-foreground">
          {status === 'saving' ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          ) : status === 'saved' ? (
            'Saved'
          ) : null}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => pinMutation.mutate(!note.pinned)}
          title={note.pinned ? 'Unpin' : 'Pin'}
        >
          {note.pinned ? <Pin className="h-4 w-4 text-thread" /> : <PinOff className="h-4 w-4" />}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 pt-8">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
          />

          {tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <CodeMirror
          value={content}
          extensions={extensions}
          onChange={setContent}
          placeholder="Start writing… link other notes with [[brackets]] and tag with #topics"
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: true,
            highlightActiveLineGutter: false,
          }}
        />

        {(backlinks.length > 0 || outgoing.length > 0) && (
          <div className="mx-auto w-full max-w-3xl px-6 py-8">
            <div className="grid gap-6 border-t border-border/60 pt-6 sm:grid-cols-2">
              <LinkColumn
                icon={<CornerDownLeft className="h-3.5 w-3.5" />}
                title="Linked mentions"
                empty="No notes link here yet."
                items={backlinks.map((b) => ({ id: b.id, label: b.title }))}
                onSelect={(id) => void navigate({ to: '/app/notes/$noteId', params: { noteId: id } })}
              />
              <LinkColumn
                icon={<Link2 className="h-3.5 w-3.5" />}
                title="Links out"
                empty="No outgoing links."
                items={outgoing.map((o, i) => ({
                  id: o.noteId ?? `unresolved-${i}`,
                  label: o.title,
                  unresolved: !o.noteId,
                }))}
                onSelect={(id) =>
                  !id.startsWith('unresolved') &&
                  void navigate({ to: '/app/notes/$noteId', params: { noteId: id } })
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LinkColumn({
  icon,
  title,
  empty,
  items,
  onSelect,
}: {
  icon: React.ReactNode
  title: string
  empty: string
  items: { id: string; label: string; unresolved?: boolean }[]
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground/70">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onSelect(item.id)}
                className={cn(
                  'text-left text-sm hover:text-thread',
                  item.unresolved ? 'text-muted-foreground/60' : 'text-foreground',
                )}
              >
                {item.label}
                {item.unresolved ? ' (not yet created)' : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
