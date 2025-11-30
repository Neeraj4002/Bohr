import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Pause, Square, Coffee, Target, Music, SkipForward, SkipBack, Volume2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTimerStore } from '@/store/timerStore';
import { useSkillsStore } from '@/store/skillsStore';
import { useTasksStore } from '@/store/tasksStore';
import { cn } from '@/lib/utils';
import { spotifyAPI, SpotifyPlaylist, PlaybackState } from '@/lib/spotify';

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
  
  // Spotify state
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [volume, setVolume] = useState(50);

  useEffect(() => {
    if (activeSkill) {
      fetchTasks();
    }
    checkSpotifyAuth();
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

  useEffect(() => {
    if (spotifyConnected && showSpotify) {
      loadPlaylists();
      const interval = setInterval(updatePlayback, 2000);
      return () => clearInterval(interval);
    }
  }, [spotifyConnected, showSpotify]);

  const checkSpotifyAuth = async () => {
    const isAuth = await spotifyAPI.isAuthenticated();
    setSpotifyConnected(isAuth);
  };

  const handleSpotifyConnect = async () => {
    try {
      await spotifyAPI.authorize();
      // Auth happens in popup, user will need to reconnect after callback
      setTimeout(checkSpotifyAuth, 2000); // Check again after popup opens
    } catch (error: any) {
      console.error('Spotify auth error:', error);
      if (!error.message.includes('not configured')) {
        alert('Failed to connect to Spotify. Check the console for details.');
      }
    }
  };

  const handleSpotifyDisconnect = async () => {
    await spotifyAPI.logout();
    setSpotifyConnected(false);
    setShowSpotify(false);
  };

  const loadPlaylists = async () => {
    try {
      const lists = await spotifyAPI.getUserPlaylists();
      setPlaylists(lists);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  const updatePlayback = async () => {
    try {
      const state = await spotifyAPI.getCurrentPlayback();
      setPlayback(state);
    } catch (error) {
      console.error('Failed to get playback state:', error);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (playback?.is_playing) {
        await spotifyAPI.pause();
      } else {
        await spotifyAPI.play();
      }
      await updatePlayback();
    } catch (error) {
      console.error('Play/pause error:', error);
    }
  };

  const handleNext = async () => {
    try {
      await spotifyAPI.next();
      setTimeout(updatePlayback, 500);
    } catch (error) {
      console.error('Next track error:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await spotifyAPI.previous();
      setTimeout(updatePlayback, 500);
    } catch (error) {
      console.error('Previous track error:', error);
    }
  };

  const handlePlayPlaylist = async (playlistUri: string) => {
    try {
      await spotifyAPI.playPlaylist(playlistUri);
      setTimeout(updatePlayback, 500);
    } catch (error) {
      console.error('Play playlist error:', error);
    }
  };

  const handleVolumeChange = async (newVolume: number) => {
    setVolume(newVolume);
    try {
      await spotifyAPI.setVolume(newVolume);
    } catch (error) {
      console.error('Volume change error:', error);
    }
  };

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

  const getSessionConfig = () => {
    switch (sessionType) {
      case 'pomodoro': return { label: 'Focus', duration: '25 min', icon: Target, color: 'bg-primary' };
      case 'short-break': return { label: 'Short Break', duration: '5 min', icon: Coffee, color: 'bg-emerald-500' };
      case 'long-break': return { label: 'Long Break', duration: '15 min', icon: Coffee, color: 'bg-violet-500' };
    }
  };
  const sessionConfig = getSessionConfig();

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

        {/* Spotify Mini Player */}
        {spotifyConnected && playback?.track && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/20">
            <Music className="w-4 h-4 text-[#1DB954]" />
            <span className="text-sm text-white/70 max-w-[150px] truncate">{playback.track.name}</span>
            <button onClick={handlePlayPause} className="p-1 hover:bg-white/10 rounded-full">
              {playback.is_playing ? <Pause className="w-4 h-4 text-[#1DB954]" /> : <Play className="w-4 h-4 text-[#1DB954]" />}
            </button>
          </div>
        )}
        
        {!spotifyConnected && (
          <button
            onClick={handleSpotifyConnect}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white/70 hover:bg-white/10 transition-all text-sm cursor-pointer"
          >
            <Music className="w-4 h-4" />
            <span className="hidden sm:inline">Connect Music</span>
          </button>
        )}
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
                    className="bg-primary hover:bg-primary/90 w-16 h-16 rounded-full"
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

      {/* Bottom Spotify Panel (when expanded) */}
      {spotifyConnected && showSpotify && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-lg p-6 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-md mx-auto space-y-4">
            {/* Now Playing */}
            {playback?.track && (
              <div className="text-center">
                <div className="font-semibold text-white">{playback.track.name}</div>
                <div className="text-sm text-white/60">{playback.track.artists.join(', ')}</div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button onClick={handlePrevious} className="p-2 text-white/60 hover:text-white transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={handlePlayPause} className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center hover:scale-105 transition-transform">
                {playback?.is_playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button onClick={handleNext} className="p-2 text-white/60 hover:text-white transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 max-w-[200px] mx-auto">
              <Volume2 className="w-4 h-4 text-white/40" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="flex-1 accent-[#1DB954] h-1"
              />
            </div>

            {/* Playlists Quick Access */}
            {playlists.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {playlists.slice(0, 4).map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handlePlayPlaylist(playlist.uri)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/10 text-sm text-white/70 hover:bg-white/20 transition-colors"
                  >
                    {playlist.name}
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => setShowSpotify(false)} className="w-full text-center text-xs text-white/40 hover:text-white/60">
              Hide
            </button>
          </div>
        </div>
      )}

      {/* Floating Spotify Toggle (when connected but hidden) */}
      {spotifyConnected && !showSpotify && (
        <button
          onClick={() => setShowSpotify(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/30 flex items-center justify-center hover:bg-[#1DB954]/30 transition-all"
        >
          <Music className="w-5 h-5 text-[#1DB954]" />
        </button>
      )}
    </div>
  );
}
