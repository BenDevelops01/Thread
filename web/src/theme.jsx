import React, { createContext, useContext, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
const Theme = createContext(null);
const valid = value => ['light', 'dark', 'system'].includes(value);
export function ThemeProvider({ children }) {
  const [theme, update] = useState(() => { try { const saved = localStorage.getItem('thread-theme'); return valid(saved) ? saved : 'light'; } catch { return 'light'; } });
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  function setTheme(value) { if (valid(value)) { update(value); try { localStorage.setItem('thread-theme', value); } catch {} } }
  useEffect(() => { const media = matchMedia('(prefers-color-scheme: dark)'); const change = e => setSystemDark(e.matches); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);
  useEffect(() => { document.documentElement.dataset.theme = resolved; document.documentElement.style.colorScheme = resolved; }, [resolved]);
  return <Theme.Provider value={{ theme, resolved, setTheme }}>{children}</Theme.Provider>;
}
export const useTheme = () => useContext(Theme);
export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  return <button className="theme-toggle" title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`} aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}>{resolved === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>;
}
