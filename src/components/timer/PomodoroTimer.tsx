import { useEffect } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTimerStore } from '@/store/timerStore';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PomodoroTimerProps {
  taskId: string;
  skillId: string;
  onComplete?: () => void;
}

export default function PomodoroTimer({ taskId, skillId, onComplete }: PomodoroTimerProps) {
  const { 
    status, 
    type, 
    remainingSeconds, 
    totalSeconds,
    startTimer, 
    pauseTimer, 
    resumeTimer, 
    stopTimer,
    settings 
  } = useTimerStore();

  useEffect(() => {
    if (status === 'completed' && onComplete) {
      onComplete();
    }
  }, [status, onComplete]);

  const handleStart = () => {
    startTimer('pomodoro', taskId, skillId);
  };

  const handlePause = () => {
    pauseTimer();
  };

  const handleResume = () => {
    resumeTimer();
  };

  const handleStop = () => {
    stopTimer();
  };

  const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">
          {type === 'pomodoro' ? 'Focus Session' : type === 'short-break' ? 'Short Break' : 'Long Break'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Circular Progress */}
        <div className="relative w-64 h-64 mx-auto">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 120}`}
              strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
              className={cn(
                "transition-all duration-1000",
                type === 'pomodoro' ? "text-primary" : "text-green-500"
              )}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-mono font-bold">
                {formatTime(remainingSeconds)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {status === 'idle' && 'Ready to start'}
                {status === 'running' && 'Focus time'}
                {status === 'paused' && 'Paused'}
                {status === 'completed' && 'Completed!'}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {status === 'idle' && (
            <Button onClick={handleStart} size="lg" className="gap-2">
              <Play className="w-5 h-5" />
              Start Focus
            </Button>
          )}
          
          {status === 'running' && (
            <>
              <Button onClick={handlePause} size="lg" variant="outline" className="gap-2">
                <Pause className="w-5 h-5" />
                Pause
              </Button>
              <Button onClick={handleStop} size="lg" variant="destructive" className="gap-2">
                <Square className="w-5 h-5" />
                Stop
              </Button>
            </>
          )}
          
          {status === 'paused' && (
            <>
              <Button onClick={handleResume} size="lg" className="gap-2">
                <Play className="w-5 h-5" />
                Resume
              </Button>
              <Button onClick={handleStop} size="lg" variant="outline" className="gap-2">
                <Square className="w-5 h-5" />
                Stop
              </Button>
            </>
          )}

          {status === 'completed' && (
            <Button onClick={handleStart} size="lg" className="gap-2">
              <Play className="w-5 h-5" />
              Start Another
            </Button>
          )}
        </div>

        {/* Settings Info */}
        <div className="text-center text-sm text-muted-foreground">
          Pomodoro: {settings.pomodoroDuration}m | 
          Short Break: {settings.shortBreakDuration}m | 
          Long Break: {settings.longBreakDuration}m
        </div>
      </CardContent>
    </Card>
  );
}
