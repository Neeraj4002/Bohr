import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { spotifyAPI } from '@/lib/spotify';
import { Music, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function SpotifyCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const hasProcessed = useRef(false); // Prevent double execution in StrictMode

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double execution (React StrictMode calls effects twice)
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      const state = params.get('state'); // Contains the code verifier

      if (error) {
        console.error('Spotify auth error:', error);
        setStatus('error');
        setErrorMessage(error);
        return;
      }

      if (code) {
        try {
          // Pass the state (code verifier) to handleCallback
          await spotifyAPI.handleCallback(code, state || undefined);
          setStatus('success');
          // Redirect back to focus mode after short delay
          setTimeout(() => navigate('/focus'), 1500);
        } catch (err: any) {
          console.error('Failed to complete Spotify auth:', err);
          setStatus('error');
          setErrorMessage(err.message || 'Unknown error');
        }
      } else {
        setStatus('error');
        setErrorMessage('No authorization code received');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f10] via-[#1a1a1d] to-[#0f0f10] text-white">
      <div className="text-center space-y-6 max-w-md px-6">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-[#1DB954]/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#1DB954] animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Connecting to Spotify...</h1>
              <p className="text-white/60 mt-2">Please wait while we complete the connection.</p>
            </div>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-[#1DB954]/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-[#1DB954]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1DB954]">Connected!</h1>
              <p className="text-white/60 mt-2">Spotify is now connected. Redirecting...</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-[#1DB954]">
              <Music className="w-5 h-5" />
              <span className="font-medium">Ready to play music</span>
            </div>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-400">Connection Failed</h1>
              <p className="text-white/60 mt-2">{errorMessage || 'Failed to connect to Spotify'}</p>
            </div>
            <button
              onClick={() => navigate('/focus')}
              className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              Return to Focus Mode
            </button>
          </>
        )}
      </div>
    </div>
  );
}
