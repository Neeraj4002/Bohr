import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:app.db');
  }
  return db;
}

// Spotify OAuth Configuration
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = 'http://127.0.0.1:1420/spotify-callback';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

// PKCE helpers
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration_ms: number;
  uri: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks_count: number;
  uri: string;
}

export interface PlaybackState {
  is_playing: boolean;
  track: SpotifyTrack | null;
  progress_ms: number;
  device_id: string | null;
}

export class SpotifyAPI {
  private tokens: SpotifyTokens | null = null;

  async getTokens(): Promise<SpotifyTokens | null> {
    if (this.tokens && this.tokens.expires_at > Date.now()) {
      return this.tokens;
    }

    // Load from database
    try {
      const database = await getDb();
      const result = await database.select<any[]>(
        'SELECT spotify_access_token, spotify_refresh_token FROM user_settings LIMIT 1'
      );

      if (result.length > 0 && result[0].spotify_access_token) {
        // Check if token is expired (assume 1 hour expiry)
        const needsRefresh = true; // Simplified - should check actual expiry

        if (needsRefresh && result[0].spotify_refresh_token) {
          return await this.refreshAccessToken(result[0].spotify_refresh_token);
        }

        this.tokens = {
          access_token: result[0].spotify_access_token,
          refresh_token: result[0].spotify_refresh_token,
          expires_at: Date.now() + 3600 * 1000,
        };
        return this.tokens;
      }
    } catch (error) {
      console.error('Failed to load Spotify tokens:', error);
    }

    return null;
  }

  async authorize(): Promise<void> {
    if (!CLIENT_ID) {
      const errorMsg = 'Spotify Client ID not configured.\n\n' +
        'Steps to fix:\n' +
        '1. Create a .env file in the root directory\n' +
        '2. Add: VITE_SPOTIFY_CLIENT_ID=your_client_id_here\n' +
        '3. Get your Client ID from https://developer.spotify.com/dashboard\n' +
        '4. Restart the dev server (npm run tauri:dev)';
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64urlencode(hashed);

    // Store code verifier for later use
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('scope', SCOPES);

    console.log('Opening Spotify auth URL:', authUrl.toString());
    const popup = window.open(authUrl.toString(), 'Spotify Login', 'width=600,height=800');
    
    if (!popup) {
      alert('Popup was blocked! Please allow popups for this site and try again.');
      throw new Error('Popup blocked');
    }
  }

  async handleCallback(code: string): Promise<void> {
    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    // Store in database
    try {
      const database = await getDb();
      await database.execute(
        'UPDATE user_settings SET spotify_access_token = $1, spotify_refresh_token = $2',
        [data.access_token, data.refresh_token]
      );
    } catch (error) {
      console.error('Failed to store Spotify tokens:', error);
    }

    sessionStorage.removeItem('spotify_code_verifier');
  }

  async refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    // Update in database
    try {
      const database = await getDb();
      await database.execute(
        'UPDATE user_settings SET spotify_access_token = $1',
        [data.access_token]
      );
    } catch (error) {
      console.error('Failed to update Spotify token:', error);
    }

    return this.tokens;
  }

  async logout(): Promise<void> {
    this.tokens = null;
    try {
      const database = await getDb();
      await database.execute(
        'UPDATE user_settings SET spotify_access_token = NULL, spotify_refresh_token = NULL'
      );
    } catch (error) {
      console.error('Failed to clear Spotify tokens:', error);
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const tokens = await this.getTokens();
    if (!tokens) {
      throw new Error('Not authenticated with Spotify');
    }

    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      if (tokens.refresh_token) {
        await this.refreshAccessToken(tokens.refresh_token);
        return this.makeRequest(endpoint, options);
      }
      throw new Error('Authentication expired. Please reconnect Spotify.');
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async getCurrentPlayback(): Promise<PlaybackState | null> {
    const data = await this.makeRequest('/me/player');
    
    if (!data || !data.item) {
      return null;
    }

    return {
      is_playing: data.is_playing,
      track: {
        id: data.item.id,
        name: data.item.name,
        artists: data.item.artists.map((a: any) => a.name),
        album: data.item.album.name,
        duration_ms: data.item.duration_ms,
        uri: data.item.uri,
      },
      progress_ms: data.progress_ms,
      device_id: data.device?.id || null,
    };
  }

  async play(uri?: string): Promise<void> {
    const body = uri ? { uris: [uri] } : undefined;
    await this.makeRequest('/me/player/play', {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async pause(): Promise<void> {
    await this.makeRequest('/me/player/pause', { method: 'PUT' });
  }

  async next(): Promise<void> {
    await this.makeRequest('/me/player/next', { method: 'POST' });
  }

  async previous(): Promise<void> {
    await this.makeRequest('/me/player/previous', { method: 'POST' });
  }

  async setVolume(volume: number): Promise<void> {
    await this.makeRequest(`/me/player/volume?volume_percent=${volume}`, { method: 'PUT' });
  }

  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    const data = await this.makeRequest('/me/playlists?limit=50');
    return data.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      tracks_count: item.tracks.total,
      uri: item.uri,
    }));
  }

  async playPlaylist(playlistUri: string): Promise<void> {
    await this.makeRequest('/me/player/play', {
      method: 'PUT',
      body: JSON.stringify({ context_uri: playlistUri }),
    });
  }

  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.getTokens();
    return tokens !== null;
  }
}

export const spotifyAPI = new SpotifyAPI();
