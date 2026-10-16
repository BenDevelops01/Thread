import { queryOptions } from '@tanstack/react-query'

import { getGraph, getNote, listNotes } from '@/server/notes'

export const notesQuery = () =>
  queryOptions({
    queryKey: ['notes'],
    queryFn: () => listNotes(),
  })

export const noteQuery = (id: string) =>
  queryOptions({
    queryKey: ['note', id],
    queryFn: () => getNote({ data: { id } }),
  })

export const graphQuery = () =>
  queryOptions({
    queryKey: ['notes-graph'],
    queryFn: () => getGraph(),
  })
