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
    <header className="h-16 border-b bg-card flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        {status !== 'idle' && (
          <div className="flex items-center gap-3 px-4 py-2 bg-accent rounded-lg">
            <div className={cn(
              "w-2 h-2 rounded-full",
              status === 'running' ? "bg-green-500 animate-pulse" : "bg-yellow-500"
            )} />
            <span className="text-sm font-medium">
              {type === 'pomodoro' ? 'Focus' : type === 'short-break' ? 'Short Break' : 'Long Break'}
            </span>
            <span className="text-sm font-mono font-bold">{formatTime(remainingSeconds)}</span>
            
            {/* Quick controls */}
            <div className="flex items-center gap-1 ml-2 border-l pl-2">
              {status === 'running' ? (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => pauseTimer()}>
                  <Pause className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resumeTimer()}>
                  <Play className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => stopTimer()}>
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
          title="Keyboard Shortcuts: Space = Pause/Resume, Esc = Stop, Ctrl+F = Focus Mode"
        >
          <Keyboard className="w-5 h-5" />
        </Button>
        
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {resolvedTheme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>
        
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
          <Settings className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 pl-4 border-l">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            {profile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium">{profile?.name || 'User'}</span>
        </div>
      </div>
    </header>
  );
}
