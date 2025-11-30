/**
 * Theme Store
 * Manages dark/light mode with persistence
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/database';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',

      setTheme: (theme) => {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });
        
        // Save to database
        db.execute('UPDATE user_settings SET theme = $1', [theme]).catch(console.error);
      },

      toggleTheme: () => {
        const current = get().resolvedTheme;
        const newTheme = current === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      initTheme: () => {
        const state = get();
        const resolved = state.theme === 'system' ? getSystemTheme() : state.theme;
        applyTheme(resolved);
        set({ resolvedTheme: resolved });
        
        // Listen for system theme changes
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          mediaQuery.addEventListener('change', (e) => {
            if (get().theme === 'system') {
              const newResolved = e.matches ? 'dark' : 'light';
              applyTheme(newResolved);
              set({ resolvedTheme: newResolved });
            }
          });
        }
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme after rehydration
        if (state) {
          state.initTheme();
        }
      },
    }
  )
);

// Initialize theme on load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useThemeStore.getState().initTheme();
  }, 0);
}
