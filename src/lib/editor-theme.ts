import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

/** Editor chrome matching Thread's dark theme. */
export const threadEditorTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--foreground)',
      backgroundColor: 'transparent',
      fontSize: '0.9375rem',
    },
    '.cm-scroller': {
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      lineHeight: '1.7',
      padding: '1.25rem 0',
    },
    '.cm-content': { caretColor: 'var(--thread)', paddingInline: '1.5rem' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--thread)', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'color-mix(in oklab, var(--thread) 28%, transparent)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--muted-foreground)',
      border: 'none',
    },
    '.cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--foreground) 3%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
    '.cm-line': { paddingInline: '0' },
    '.cm-placeholder': { color: 'var(--muted-foreground)' },
    '.cm-content ::-moz-selection': {
      backgroundColor: 'color-mix(in oklab, var(--thread) 28%, transparent)',
    },
    '.cm-panels': { backgroundColor: 'var(--card)', color: 'var(--foreground)' },
    '.cm-tooltip': {
      backgroundColor: 'var(--popover)',
      border: '1px solid var(--border)',
      borderRadius: '0.5rem',
    },
  },
  { dark: true },
)

export const threadHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.5em', fontWeight: '700', lineHeight: '1.3' },
  { tag: t.heading2, fontSize: '1.3em', fontWeight: '700', lineHeight: '1.3' },
  { tag: t.heading3, fontSize: '1.15em', fontWeight: '600' },
  { tag: [t.heading, t.strong], fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: 'var(--thread)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--thread)' },
  { tag: [t.monospace], color: 'var(--ember)' },
  { tag: t.quote, color: 'var(--muted-foreground)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--moss)' },
  { tag: [t.keyword, t.operator], color: 'var(--thread)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--moss)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--ember)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--muted-foreground)' },
  { tag: t.typeName, color: 'var(--thread)' },
  { tag: t.function(t.variableName), color: 'var(--ember)' },
  { tag: t.invalid, color: 'var(--destructive)' },
])

export const threadEditorExtensions = [threadEditorTheme, syntaxHighlighting(threadHighlightStyle)]
