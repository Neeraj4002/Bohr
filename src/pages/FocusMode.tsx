import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Pause, Square, Coffee, Target, Music, SkipForward, SkipBack, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTimerStore } from '@/store/timerStore';
import { useSkillsStore } from '@/store/skillsStore';
import { useTasksStore } from '@/store/tasksStore';
import { cn } from '@/lib/utils';
import { spotifyAPI, SpotifyPlaylist, PlaybackState } from '@/lib/spotify';
import FlipClockCountdown from '@leenguyen/react-flip-clock-countdown';
import '@leenguyen/react-flip-clock-countdown/dist/index.css';

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
  
  // Spotify state
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [volume, setVolume] = useState(50);

  useEffect(() => {
    if (activeSkill) {
      fetchTasks(); // Always fetch tasks when entering focus mode
    }
    checkSpotifyAuth();
  }, [activeSkill, fetchTasks]);

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

  const getSessionTypeLabel = () => {
    switch (type) {
      case 'pomodoro':
        return 'Focus Session';
      case 'short-break':
        return 'Short Break';
      case 'long-break':
        return 'Long Break';
      default:
        return 'Focus Session';
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-8 relative">
      {/* Exit Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/10"
        onClick={() => navigate(-1)}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Active Skill Display */}
      {activeSkill && (
        <div className="absolute top-4 left-4 text-left">
          <div className="text-sm text-white/60">Active Skill</div>
          <div className="text-xl font-bold">{activeSkill.name}</div>
          <div className="text-sm text-white/60">
            {Math.floor(activeSkill.currentMinutes / 60)} hours completed
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl space-y-8">
        {/* Session Type Selector (only when idle) */}
        {status === 'idle' && (
          <div className="flex justify-center gap-4">
            <Button
              variant={sessionType === 'pomodoro' ? 'default' : 'outline'}
              onClick={() => setSessionType('pomodoro')}
              className={cn(
                'gap-2',
                sessionType === 'pomodoro' ? 'bg-white text-black' : 'bg-white/10 text-white border-white/20'
              )}
            >
              <Target className="w-4 h-4" />
              Focus (25m)
            </Button>
            <Button
              variant={sessionType === 'short-break' ? 'default' : 'outline'}
              onClick={() => setSessionType('short-break')}
              className={cn(
                'gap-2',
                sessionType === 'short-break' ? 'bg-white text-black' : 'bg-white/10 text-white border-white/20'
              )}
            >
              <Coffee className="w-4 h-4" />
              Short Break (5m)
            </Button>
            <Button
              variant={sessionType === 'long-break' ? 'default' : 'outline'}
              onClick={() => setSessionType('long-break')}
              className={cn(
                'gap-2',
                sessionType === 'long-break' ? 'bg-white text-black' : 'bg-white/10 text-white border-white/20'
              )}
            >
              <Coffee className="w-4 h-4" />
              Long Break (15m)
            </Button>
          </div>
        )}

        {/* Task Selector - Moved ABOVE timer for better UX */}
        {status === 'idle' && sessionType === 'pomodoro' && tasks.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <label className="text-lg text-white/80 block text-center mb-4 font-medium">
              What are you working on?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              <button
                onClick={() => setSelectedTaskId('')}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  selectedTaskId === ''
                    ? "bg-white text-black border-white"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                )}
              >
                <div className="font-medium">Free Practice</div>
                <div className="text-sm opacity-70">No specific task</div>
              </button>
              {tasks
                .filter(t => t.status !== 'done')
                .map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      selectedTaskId === task.id
                        ? "bg-white text-black border-white"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                    )}
                  >
                    <div className="font-medium truncate">{task.title}</div>
                    <div className="text-sm opacity-70 capitalize">{task.status.replace('-', ' ')}</div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Current Task Display - During Timer */}
        {(status === 'running' || status === 'paused') && currentTask && (
          <div className="text-center">
            <div className="text-sm text-white/50 uppercase tracking-wider mb-1">Working on</div>
            <div className="text-xl text-white font-semibold">{currentTask.title}</div>
          </div>
        )}

        {/* Timer Display */}
        <div className="text-center space-y-6">
          <div className="text-xl text-white/50 uppercase tracking-widest font-medium">
            {getSessionTypeLabel()}
          </div>
          
          {/* Flip Clock Countdown - Only show when running */}
          {status === 'running' && (
            <div className="flex justify-center">
              <FlipClockCountdown
                to={new Date().getTime() + remainingSeconds * 1000}
                labels={remainingSeconds >= 3600 ? ['HOURS', 'MINUTES', 'SECONDS'] : ['MINUTES', 'SECONDS']}
                showLabels={true}
                showSeparators={true}
                labelStyle={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.5)',
                  letterSpacing: '0.1em',
                }}
                digitBlockStyle={{
                  width: 60,
                  height: 90,
                  fontSize: 48,
                  backgroundColor: '#ffffff',
                  color: '#000000',
                }}
                dividerStyle={{ color: 'white', height: 1 }}
                separatorStyle={{ color: 'white', size: '8px' }}
                duration={0.5}
                renderMap={[false, remainingSeconds >= 3600, true, true]}
              />
            </div>
          )}
          
          {/* Static display when not running */}
          {status !== 'running' && (
            <div className="flex items-center justify-center gap-3">
              {remainingSeconds >= 3600 && (
                <>
                  <div className="flex flex-col items-center">
                    <div className="bg-white text-black rounded-lg px-6 py-4 min-w-[100px] text-center shadow-xl">
                      <div className="text-7xl font-bold font-mono tabular-nums">
                        {String(Math.floor(remainingSeconds / 3600)).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="text-xs text-white/50 mt-3 uppercase font-semibold tracking-wider">Hours</div>
                  </div>
                  
                  <div className="text-6xl font-bold text-white pb-8">:</div>
                </>
              )}
              
              <div className="flex flex-col items-center">
                <div className="bg-white text-black rounded-lg px-6 py-4 min-w-[100px] text-center shadow-xl">
                  <div className="text-7xl font-bold font-mono tabular-nums">
                    {String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, '0')}
                  </div>
                </div>
                <div className="text-xs text-white/50 mt-3 uppercase font-semibold tracking-wider">Minutes</div>
              </div>
              
              <div className="text-6xl font-bold text-white pb-8">:</div>
              
              <div className="flex flex-col items-center">
                <div className="bg-white text-black rounded-lg px-6 py-4 min-w-[100px] text-center shadow-xl">
                  <div className="text-7xl font-bold font-mono tabular-nums">
                    {String(remainingSeconds % 60).padStart(2, '0')}
                  </div>
                </div>
                <div className="text-xs text-white/50 mt-3 uppercase font-semibold tracking-wider">Seconds</div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="w-full bg-white/10 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-white transition-all duration-1000 shadow-lg shadow-white/20"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status Text */}
          <div className="text-lg text-white/60 font-medium">
            {status === 'idle' && 'Ready to begin'}
            {status === 'running' && 'Stay focused...'}
            {status === 'paused' && 'Paused'}
            {status === 'completed' && 'Great work! 🎉'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          {status === 'idle' && (
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-white text-black hover:bg-white/90 px-12 py-6 text-xl gap-3"
              disabled={!activeSkill}
            >
              <Play className="w-6 h-6" />
              Start
            </Button>
          )}

          {status === 'running' && (
            <>
              <Button
                onClick={handlePause}
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 px-8 py-6 text-lg gap-3"
              >
                <Pause className="w-5 h-5" />
                Pause
              </Button>
              <Button
                onClick={handleStop}
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-red-500/20 px-8 py-6 text-lg gap-3"
              >
                <Square className="w-5 h-5" />
                Stop
              </Button>
            </>
          )}

          {status === 'paused' && (
            <>
              <Button
                onClick={handleResume}
                size="lg"
                className="bg-white text-black hover:bg-white/90 px-12 py-6 text-xl gap-3"
              >
                <Play className="w-6 h-6" />
                Resume
              </Button>
              <Button
                onClick={handleStop}
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-red-500/20 px-8 py-6 text-lg gap-3"
              >
                <Square className="w-5 h-5" />
                Stop
              </Button>
            </>
          )}

          {status === 'completed' && (
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-white text-black hover:bg-white/90 px-12 py-6 text-xl gap-3"
            >
              <Play className="w-6 h-6" />
              Start Another
            </Button>
          )}
        </div>

        {!activeSkill && status === 'idle' && (
          <div className="text-center text-white/60 text-sm">
            Please select an active skill from the Skills page first
          </div>
        )}
      </div>

      {/* Spotify Controls */}
      <div className="absolute bottom-4 right-4 left-4">
        {!spotifyConnected ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleSpotifyConnect}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 gap-2"
            >
              <Music className="w-4 h-4" />
              Connect Spotify
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Toggle Spotify Panel */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSpotify(!showSpotify)}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 gap-2"
              >
                <Music className="w-4 h-4" />
                {showSpotify ? 'Hide Music' : 'Show Music'}
              </Button>
            </div>

            {/* Spotify Panel */}
            {showSpotify && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 max-w-md mx-auto border border-white/20">
                {/* Now Playing */}
                {playback?.track && (
                  <div className="mb-4 text-center">
                    <div className="text-xs text-white/60 mb-1">Now Playing</div>
                    <div className="font-semibold text-white">{playback.track.name}</div>
                    <div className="text-sm text-white/80">
                      {playback.track.artists.join(', ')}
                    </div>
                  </div>
                )}

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayPause}
                    className="text-white hover:bg-white/20"
                  >
                    {playback?.is_playing ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-2 mb-4">
                  <Volume2 className="w-4 h-4 text-white/60" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-white/60 w-8">{volume}%</span>
                </div>

                {/* Playlists */}
                {playlists.length > 0 && (
                  <div>
                    <div className="text-xs text-white/60 mb-2">Quick Playlists</div>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {playlists.slice(0, 6).map((playlist) => (
                        <button
                          key={playlist.id}
                          onClick={() => handlePlayPlaylist(playlist.uri)}
                          className="text-left p-2 rounded bg-white/5 hover:bg-white/10 transition-colors text-xs"
                        >
                          <div className="font-medium text-white truncate">{playlist.name}</div>
                          <div className="text-white/60">{playlist.tracks_count} tracks</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disconnect */}
                <div className="mt-3 text-center">
                  <button
                    onClick={handleSpotifyDisconnect}
                    className="text-xs text-white/60 hover:text-white/80"
                  >
                    Disconnect Spotify
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
