import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Pause, Square, Coffee, Target, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTimerStore } from '@/store/timerStore';
import { useSkillsStore } from '@/store/skillsStore';
import { useTasksStore } from '@/store/tasksStore';
import { cn } from '@/lib/utils';
import MusicPlayer from '@/components/MusicPlayer';

// Motivational messages for different states
const focusMessages = [
  "Deep work mode activated 🎯",
  "You're in the zone 🔥",
  "Making progress... 💪",
  "Stay with it 🧘",
  "Building mastery 🚀",
];

const completionMessages = [
  "Excellent work! 🎉",
  "Session complete! 🏆", 
  "You crushed it! 💪",
  "One step closer to mastery! ⭐",
  "Great focus session! 🔥",
];

const getRandomMessage = (messages: string[]) => messages[Math.floor(Math.random() * messages.length)];

export default function FocusMode() {
  const navigate = useNavigate();
  const { activeSkill } = useSkillsStore();
  const { tasks, fetchTasks } = useTasksStore();
  const {
    status,
    type,
    remainingSeconds,
    totalSeconds,
    currentTaskId,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useTimerStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [sessionType, setSessionType] = useState<'pomodoro' | 'short-break' | 'long-break'>('pomodoro');
  const [showOptions, setShowOptions] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState(getRandomMessage(focusMessages));

  useEffect(() => {
    if (activeSkill) {
      fetchTasks();
    }
  }, [activeSkill, fetchTasks]);

  // Change motivational message periodically when running
  useEffect(() => {
    if (status === 'running') {
      const interval = setInterval(() => {
        setMotivationalMessage(getRandomMessage(focusMessages));
      }, 30000); // Change every 30 seconds
      return () => clearInterval(interval);
    } else if (status === 'completed') {
      setMotivationalMessage(getRandomMessage(completionMessages));
    }
  }, [status]);

  const handleStart = () => {
    if (!activeSkill) {
      alert('Please select an active skill first');
      return;
    }
    startTimer(sessionType, selectedTaskId || '', activeSkill.id);
  };

  const handlePause = () => pauseTimer();
  const handleResume = () => resumeTimer();
  const handleStop = () => stopTimer();

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const currentTask = currentTaskId ? tasks.find(t => t.id === currentTaskId) : null;
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { mins, secs };
  };
  const time = formatTime(remainingSeconds);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1d] to-[#0f0f10] text-white flex flex-col">
      {/* Top Bar - Minimal */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Skill Badge */}
        {activeSkill && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-white/70">{activeSkill.name}</span>
          </div>
        )}

        {/* Music Player (Compact) */}
        <div className="relative">
          <MusicPlayer compact />
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        
        {/* Completion State */}
        {status === 'completed' && (
          <div className="text-center space-y-8 animate-in fade-in duration-500">
            <div className="relative">
              <Sparkles className="w-20 h-20 text-yellow-400 mx-auto animate-pulse" />
              <div className="absolute inset-0 w-20 h-20 mx-auto bg-yellow-400/20 rounded-full blur-2xl" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">{motivationalMessage}</h1>
              <p className="text-white/50">You completed a {type === 'pomodoro' ? 'focus' : 'break'} session</p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleStart}
                className="bg-primary hover:bg-primary/90 px-8 py-6 text-lg gap-2 rounded-full"
              >
                <Play className="w-5 h-5" />
                Start Another
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="bg-white/5 border-white/10 hover:bg-white/10 px-8 py-6 text-lg rounded-full"
              >
                Done for now
              </Button>
            </div>
          </div>
        )}

        {/* Active Timer State (Running or Paused) */}
        {(status === 'running' || status === 'paused') && (
          <div className="text-center space-y-8">
            {/* Current Task */}
            {currentTask && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-white/80">{currentTask.title}</span>
              </div>
            )}

            {/* Timer Display - Clean & Large */}
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
              
              <div className="relative flex items-baseline justify-center gap-2">
                <div className="text-[140px] sm:text-[180px] font-bold tabular-nums leading-none tracking-tight">
                  {String(time.mins).padStart(2, '0')}
                </div>
                <div className={cn(
                  "text-[140px] sm:text-[180px] font-bold leading-none",
                  status === 'running' && "animate-pulse"
                )}>
                  :
                </div>
                <div className="text-[140px] sm:text-[180px] font-bold tabular-nums leading-none tracking-tight">
                  {String(time.secs).padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Progress Ring - Subtle */}
            <div className="w-full max-w-xs mx-auto">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Motivational Message */}
            <p className="text-lg text-white/50 font-medium transition-all duration-500">
              {status === 'paused' ? '⏸️ Paused - Take your time' : motivationalMessage}
            </p>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {status === 'running' ? (
                <>
                  <Button
                    onClick={handlePause}
                    variant="outline"
                    className="bg-white/5 border-white/10 hover:bg-white/10 px-6 py-5 gap-2 rounded-full"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </Button>
                  <Button
                    onClick={handleStop}
                    variant="outline"
                    className="bg-white/5 border-white/10 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 px-6 py-5 gap-2 rounded-full"
                  >
                    <Square className="w-5 h-5" />
                    End
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleResume}
                    className="bg-primary hover:bg-primary/90 w-16 h-15 rounded-full"
                  >
                    <Play className="w-7 h-7 ml-1" />
                  </Button>
                  <Button
                    onClick={handleStop}
                    variant="outline"
                    className="bg-white/5 border-white/10 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 px-6 py-5 gap-2 rounded-full"
                  >
                    <Square className="w-5 h-5" />
                    End Session
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Idle State - Ready to Start */}
        {status === 'idle' && (
          <div className="text-center space-y-10 w-full max-w-lg">
            
            {/* Session Type Pills */}
            <div className="flex justify-center gap-2">
              {(['pomodoro', 'short-break', 'long-break'] as const).map((sType) => {
                const config = {
                  pomodoro: { label: 'Focus', duration: '25m', icon: Target },
                  'short-break': { label: 'Short', duration: '5m', icon: Coffee },
                  'long-break': { label: 'Long', duration: '15m', icon: Coffee },
                };
                const c = config[sType];
                const Icon = c.icon;
                const isActive = sessionType === sType;
                return (
                  <button
                    key={sType}
                    onClick={() => setSessionType(sType)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all",
                      isActive 
                        ? "bg-primary text-white" 
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {c.label}
                    <span className={cn("text-xs", isActive ? "text-white/70" : "text-white/40")}>{c.duration}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Timer Preview */}
            <div className="relative py-8">
              <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full" />
              <div className="relative text-[120px] sm:text-[160px] font-bold tabular-nums leading-none tracking-tight text-white/90">
                {sessionType === 'pomodoro' ? '25:00' : sessionType === 'short-break' ? '05:00' : '15:00'}
              </div>
            </div>

            {/* START Button - The Hero */}
            <div className="space-y-6">
              <button
                onClick={handleStart}
                disabled={!activeSkill}
                className={cn(
                  "group relative w-20 h-12 rounded-full mx-auto flex items-center justify-center transition-all duration-300",
                  activeSkill 
                    ? "bg-primary hover:bg-primary/90 hover:scale-10 hover:shadow-[0_0_60px_rgba(26,115,232,0.5)]" 
                    : "bg-white/10 cursor-not-allowed"
                )}
              >
                <Play className={cn("w-7 h-7 ml-1 transition-transform", activeSkill && "group-hover:scale-110")} />
              </button>
              
              {!activeSkill && (
                <p className="text-white/40 text-sm">Select a skill from Skills page to start</p>
              )}
            </div>

            {/* Task Selector - Collapsible */}
            {sessionType === 'pomodoro' && tasks.filter(t => t.status !== 'done').length > 0 && (
              <div className="space-y-3">
                <button 
                  onClick={() => setShowOptions(!showOptions)}
                  className="flex items-center gap-2 mx-auto text-sm text-white/50 hover:text-white/70 transition-colors"
                >
                  {showOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {selectedTask ? `Working on: ${selectedTask.title}` : 'Select a task (optional)'}
                </button>
                
                {showOptions && (
                  <div className="flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => { setSelectedTaskId(''); setShowOptions(false); }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-all",
                        !selectedTaskId ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/5 text-white/60 hover:bg-white/10"
                      )}
                    >
                      Free practice
                    </button>
                    {tasks.filter(t => t.status !== 'done').slice(0, 5).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => { setSelectedTaskId(task.id); setShowOptions(false); }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm transition-all max-w-[180px] truncate",
                          selectedTaskId === task.id 
                            ? "bg-primary/20 text-primary border border-primary/30" 
                            : "bg-white/5 text-white/60 hover:bg-white/10"
                        )}
                      >
                        {task.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
