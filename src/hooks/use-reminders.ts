import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import type { Task } from '@/lib/supabase/types'

/**
 * Fires in-app + browser notifications for tasks whose reminder time has passed
 * (within the last 10 minutes), while the app is open.
 */
export function useReminders(tasks: Task[]) {
  const notified = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    function check() {
      const now = Date.now()
      for (const task of tasks) {
        if (task.completed || !task.reminder_at) continue
        if (notified.current.has(task.id)) continue
        const at = new Date(task.reminder_at).getTime()
        if (at <= now && at > now - 10 * 60_000) {
          notified.current.add(task.id)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Thread reminder', { body: task.title })
          }
          toast('Reminder', { description: task.title })
        }
      }
    }

    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [tasks])
}
