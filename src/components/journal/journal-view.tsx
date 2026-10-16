import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { BookHeart, Loader2, Trash2, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { threadEditorExtensions } from '@/lib/editor-theme'
import { journalQuery } from '@/lib/queries/journal'
import { MOODS, deleteJournal, saveJournal } from '@/server/journal'
import { relativeDay, ymdUTC } from '@/lib/dates'
import { cn } from '@/lib/utils'

import type { JournalEntry } from '@/lib/supabase/types'

function todayKey() {
  return ymdUTC()
}

function prettyDate(key: string) {
  return relativeDay(key)
}

export function JournalView() {
  const queryClient = useQueryClient()
  const { data: entries = [], isLoading } = useQuery(journalQuery())
  const [selectedDate, setSelectedDate] = useState(todayKey())

  const selected = entries.find((e) => e.entry_date === selectedDate) ?? null

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJournal({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['journal'] })
      toast.success('Entry deleted')
    },
  })

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <aside className="flex w-full shrink-0 flex-col border-r border-border/60 md:w-[300px]">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="h-9 flex-1 rounded-md border border-border/70 bg-card/60 px-2 text-sm outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No entries yet. Start writing for today.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    onClick={() => setSelectedDate(entry.entry_date)}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left transition-colors',
                      selectedDate === entry.entry_date ? 'bg-accent' : 'hover:bg-accent/50',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{prettyDate(entry.entry_date)}</span>
                      {entry.mood ? (
                        <span className="text-sm">
                          {MOODS.find((m) => m.value === entry.mood)?.emoji}
                        </span>
                      ) : null}
                    </div>
                    {entry.content ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {entry.content.replace(/[#*`>\n]+/g, ' ').trim().slice(0, 80)}
                      </p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="hidden min-w-0 flex-1 md:flex">
        <JournalEditor
          key={selectedDate}
          date={selectedDate}
          entry={selected}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </div>

      <div className="flex min-w-0 flex-1 md:hidden">
        <JournalEditor
          key={`m-${selectedDate}`}
          date={selectedDate}
          entry={selected}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </div>
    </div>
  )
}

function JournalEditor({
  date,
  entry,
  onDelete,
}: {
  date: string
  entry: JournalEntry | null
  onDelete: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(entry?.title ?? '')
  const [content, setContent] = useState(entry?.content ?? '')
  const [mood, setMood] = useState<string | null>(entry?.mood ?? null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const savedRef = useRef({ title: entry?.title ?? '', content: entry?.content ?? '', mood: entry?.mood ?? null })

  useEffect(() => {
    setTitle(entry?.title ?? '')
    setContent(entry?.content ?? '')
    setMood(entry?.mood ?? null)
    savedRef.current = { title: entry?.title ?? '', content: entry?.content ?? '', mood: entry?.mood ?? null }
  }, [entry])

  const saveMutation = useMutation({
    mutationFn: (payload: { title: string; content: string; mood: string | null }) =>
      saveJournal({ data: { entry_date: date, ...payload } }),
    onSuccess: async () => {
      setStatus('saved')
      await queryClient.invalidateQueries({ queryKey: ['journal'] })
      await queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
    onError: () => toast.error('Could not save entry'),
  })

  useEffect(() => {
    const dirty =
      title !== savedRef.current.title ||
      content !== savedRef.current.content ||
      mood !== savedRef.current.mood
    if (!dirty) return

    setStatus('saving')
    const timer = setTimeout(() => {
      savedRef.current = { title, content, mood }
      saveMutation.mutate({ title, content, mood })
    }, 700)
    return () => clearTimeout(timer)
  }, [title, content, mood, date])

  const extensions = [threadEditorExtensions, markdown({ base: markdownLanguage }), EditorView.lineWrapping]

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <BookHeart className="h-4 w-4 text-thread" />
        <span className="text-sm font-medium">{prettyDate(date)}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {status === 'saving' ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          ) : status === 'saved' ? (
            'Saved'
          ) : null}
        </span>
        {entry ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 pt-8">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give today a title (optional)"
            className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(mood === m.value ? null : m.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                  mood === m.value
                    ? 'border-thread bg-thread/10 text-thread'
                    : 'border-border text-muted-foreground hover:border-thread/40',
                )}
              >
                <span>{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <CodeMirror
          value={content}
          extensions={extensions}
          onChange={setContent}
          placeholder="How did today go?"
          basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: true }}
        />
      </div>
    </div>
  )
}

export function JournalSkeleton() {
  return (
    <div className="space-y-4 px-6 py-6">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  )
}
