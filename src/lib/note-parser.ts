/** Extracts unique [[wikilink]] titles from markdown. Supports [[Title|alias]] and [[Title#heading]]. */
export function parseWikilinks(content: string): string[] {
  const out = new Set<string>()
  const re = /\[\[([^\]]+?)\]\]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(content))) {
    const raw = match[1].split('|')[0].split('#')[0].trim()
    if (raw) out.add(raw)
  }
  return [...out]
}

/** Extracts unique #tags from content. Ignores markdown headings ("# Heading"). */
export function parseTags(content: string): string[] {
  const out = new Set<string>()
  const re = /(^|\s)#([\p{L}\p{N}_/-]+)/gu
  let match: RegExpExecArray | null
  while ((match = re.exec(content))) out.add(match[2].toLowerCase())
  return [...out]
}

/** A short, plain-text preview of note content. */
export function noteSnippet(content: string, length = 140): string {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g, '$1')
    .replace(/[#*`>~_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > length ? `${text.slice(0, length)}…` : text
}
