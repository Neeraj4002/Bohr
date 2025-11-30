import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { spotifyAPI } from '@/lib/spotify';

export default function SpotifyCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        console.error('Spotify auth error:', error);
        alert('Failed to connect to Spotify: ' + error);
        window.close();
        return;
      }

      if (code) {
        try {
          await spotifyAPI.handleCallback(code);
          // Show success message
          alert('Successfully connected to Spotify! You can close this window.');
          // Try to close the popup window
          window.close();
          // If close fails, redirect to focus mode
          setTimeout(() => navigate('/focus'), 1000);
        } catch (error) {
          console.error('Failed to complete Spotify auth:', error);
          alert('Failed to complete Spotify authentication: ' + error);
          window.close();
        }
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-4">
        <div className="text-2xl font-bold">Connecting to Spotify...</div>
        <div className="text-sm text-white/60">You can close this window once complete.</div>
      </div>
    </div>
  );
}
