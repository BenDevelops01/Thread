import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  NotebookPen,
  SquareKanban,
  BookHeart,
  Timer,
  Waves,
  Activity,
  ScrollText,
  Plug,
  Settings,
  LayoutDashboard,
  CirclePlus,
} from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

const NAV = [
  { label: 'Home', to: '/app', icon: LayoutDashboard },
  { label: 'Notes', to: '/app/notes', icon: NotebookPen },
  { label: 'Tasks', to: '/app/tasks', icon: SquareKanban },
  { label: 'Journal', to: '/app/journal', icon: BookHeart },
  { label: 'Focus', to: '/app/focus', icon: Timer },
  { label: 'Soundscapes', to: '/app/soundscapes', icon: Waves },
  { label: 'Activity', to: '/app/activity', icon: Activity },
  { label: 'Logs', to: '/app/logs', icon: ScrollText },
  { label: 'Plugins', to: '/app/plugins', icon: Plug },
  { label: 'Settings', to: '/app/settings', icon: Settings },
] as const

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  function go(to: string) {
    onOpenChange(false)
    void navigate({ to })
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to, or type a command…" />
      <CommandList>
        <CommandEmpty>Nothing found.</CommandEmpty>
        <CommandGroup heading="Create">
          <CommandItem onSelect={() => go('/app/notes')}>
            <CirclePlus />
            New note
          </CommandItem>
          <CommandItem onSelect={() => go('/app/tasks')}>
            <CirclePlus />
            New task
          </CommandItem>
          <CommandItem onSelect={() => go('/app/journal')}>
            <CirclePlus />
            New journal entry
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {NAV.map(({ label, to, icon: Icon }) => (
            <CommandItem key={to} onSelect={() => go(to)}>
              <Icon />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
