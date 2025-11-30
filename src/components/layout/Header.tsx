import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, Moon, Sun, Play, Pause, Square, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/store/userStore';
import { useTimerStore } from '@/store/timerStore';
import { useThemeStore } from '@/store/themeStore';
import { formatTime, cn } from '@/lib/utils';

export default function Header() {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useUserStore();
  const { status, remainingSeconds, type, pauseTimer, resumeTimer, stopTimer } = useTimerStore();
  const { resolvedTheme, toggleTheme } = useThemeStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (status === 'running') {
            pauseTimer();
          } else if (status === 'paused') {
            resumeTimer();
          }
          break;
        case 'Escape':
          if (status === 'running' || status === 'paused') {
            stopTimer();
          }
          break;
        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            navigate('/focus');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, pauseTimer, resumeTimer, stopTimer, navigate]);

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-card flex items-center justify-between px-8 elevation-0">
      <div className="flex items-center gap-4">
        {status !== 'idle' && (
          <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-full elevation-1">
            <div className={cn(
              "w-2 h-2 rounded-full",
              status === 'running' ? "bg-success animate-pulse" : "bg-warning"
            )} />
            <span className="text-sm font-medium text-primary">
              {type === 'pomodoro' ? 'Focus' : type === 'short-break' ? 'Short Break' : 'Long Break'}
            </span>
            <span className="text-sm font-medium tabular-nums text-foreground">{formatTime(remainingSeconds)}</span>
            
            {/* Quick controls */}
            <div className="flex items-center gap-1 ml-2 border-l border-primary/20 pl-2">
              {status === 'running' ? (
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 rounded-full" onClick={() => pauseTimer()}>
                  <Pause className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 rounded-full" onClick={() => resumeTimer()}>
                  <Play className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive rounded-full" onClick={() => stopTimer()}>
                <Square className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Keyboard shortcuts hint */}
        <Button 
          variant="ghost" 
          size="icon"
          className="hover:bg-accent rounded-full"
          title="Keyboard Shortcuts: Space = Pause/Resume, Esc = Stop, Ctrl+F = Focus Mode"
        >
          <Keyboard className="w-5 h-5 text-muted-foreground" />
        </Button>
        
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" className="hover:bg-accent" onClick={toggleTheme}>
          {resolvedTheme === 'dark' ? (
            <Sun className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
        
        <Button variant="ghost" size="icon" className="hover:bg-accent">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-accent" onClick={() => navigate('/profile')}>
          <Settings className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-glow">
            {profile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-semibold">{profile?.name || 'User'}</span>
        </div>
      </div>
    </header>
  );
}
