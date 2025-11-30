import { useEffect } from 'react';
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

function App() {
  const { initTheme, resolvedTheme } = useThemeStore();
  const loadSettings = useTimerStore((state) => state.loadSettings);
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
