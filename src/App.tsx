import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Confetti } from './components/ui/magic';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import FocusMode from './pages/FocusMode';
import Journal from './pages/Journal';
import SpotifyCallback from './pages/SpotifyCallback';
import { useThemeStore } from './store/themeStore';
import { useTimerStore } from './store/timerStore';
import { useCelebrationStore } from './store/celebrationStore';
import { preloadSounds, ensureNotificationPermission } from './lib/notifications';
import { musicPlayer, MusicState } from './lib/music';

// Global YouTube player that persists across ALL pages including FocusMode
function GlobalYouTubePlayer() {
  const [state, setState] = useState<MusicState>(musicPlayer.state);

  useEffect(() => {
    const unsubscribe = musicPlayer.subscribe(setState);
    return () => { unsubscribe(); };
  }, []);

  const mode = musicPlayer.mode;
  
  if (mode !== 'youtube' || !state.youtubeIsPlaying || !state.youtubeStream) {
    return null;
  }

  return (
    <iframe
      key={state.youtubeStream.id}
      src={`https://www.youtube.com/embed/${state.youtubeStream.id}?autoplay=1&loop=1&playlist=${state.youtubeStream.id}&enablejsapi=1`}
      className="fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
      allow="autoplay; encrypted-media"
      title="YouTube Music Player"
    />
  );
}

function App() {
  const { initTheme, resolvedTheme } = useThemeStore();
  const { loadSettings } = useTimerStore();
  const showConfetti = useCelebrationStore((state) => state.showConfetti);

  useEffect(() => {
    // Initialize theme
    initTheme();
    
    // Load timer settings
    loadSettings();
    
    // Preload sounds
    preloadSounds();
    
    // Request notification permission
    ensureNotificationPermission();
  }, [initTheme, loadSettings]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Global YouTube player - persists across ALL pages */}
        <GlobalYouTubePlayer />
        
        <Toaster 
          position="top-right" 
          theme={resolvedTheme}
          richColors
          closeButton
        />
        <Confetti active={showConfetti} count={80} />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="skills" element={<Skills />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="journal" element={<Journal />} />
          </Route>
          <Route path="/focus" element={<FocusMode />} />
          <Route path="/spotify-callback" element={<SpotifyCallback />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
