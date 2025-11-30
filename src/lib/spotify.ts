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

    // First try localStorage (works in both Tauri and browser)
    const storedTokens = localStorage.getItem('spotify_tokens');
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens) as SpotifyTokens;
        if (parsed.expires_at > Date.now()) {
          this.tokens = parsed;
          return this.tokens;
        } else if (parsed.refresh_token) {
          // Token expired, try to refresh
          return await this.refreshAccessToken(parsed.refresh_token);
        }
      } catch (e) {
        console.error('Failed to parse stored tokens:', e);
      }
    }

    // Fallback: try database (only works in Tauri)
    try {
      const database = await getDb();
      const result = await database.select<any[]>(
        'SELECT spotify_access_token, spotify_refresh_token FROM user_settings LIMIT 1'
      );

      if (result.length > 0 && result[0].spotify_access_token) {
        if (result[0].spotify_refresh_token) {
          return await this.refreshAccessToken(result[0].spotify_refresh_token);
        }

        this.tokens = {
          access_token: result[0].spotify_access_token,
          refresh_token: result[0].spotify_refresh_token,
          expires_at: Date.now() + 3600 * 1000,
        };
        // Also store in localStorage for consistency
        localStorage.setItem('spotify_tokens', JSON.stringify(this.tokens));
        return this.tokens;
      }
    } catch (error) {
      // Database not available (browser context)
      console.log('Database not available for token lookup');
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

    // Store code verifier in localStorage (for Tauri app polling) AND pass in state (for browser callback)
    localStorage.setItem('spotify_code_verifier', codeVerifier);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('scope', SCOPES);
    // Pass code verifier in state param so browser callback can use it
    authUrl.searchParams.append('state', codeVerifier);

    console.log('Opening Spotify auth URL:', authUrl.toString());
    
    // Navigate within the same window so callback stays in Tauri webview
    // This ensures localStorage is shared between auth and callback
    window.location.href = authUrl.toString();
  }

  async handleCallback(code: string, stateCodeVerifier?: string): Promise<void> {
    // Try to get code verifier from: 1) passed state param, 2) localStorage
    const codeVerifier = stateCodeVerifier || localStorage.getItem('spotify_code_verifier');
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
      const errorData = await response.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    // Store tokens in localStorage (works in both Tauri and browser)
    localStorage.setItem('spotify_tokens', JSON.stringify(this.tokens));

    // Also try to store in database if Tauri is available
    try {
      const database = await getDb();
      await database.execute(
        'UPDATE user_settings SET spotify_access_token = $1, spotify_refresh_token = $2',
        [data.access_token, data.refresh_token]
      );
    } catch (error) {
      // This will fail in browser context, that's OK - we have localStorage
      console.log('Database not available, tokens stored in localStorage only');
    }

    localStorage.removeItem('spotify_code_verifier');
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

    // Store in localStorage
    localStorage.setItem('spotify_tokens', JSON.stringify(this.tokens));

    // Also try to update in database
    try {
      const database = await getDb();
      await database.execute(
        'UPDATE user_settings SET spotify_access_token = $1',
        [data.access_token]
      );
    } catch (error) {
      console.log('Database not available for token update');
    }

    return this.tokens;
  }

  async logout(): Promise<void> {
    this.tokens = null;
    localStorage.removeItem('spotify_tokens');
    try {
      const database = await getDb();
      await database.execute(
        'UPDATE user_settings SET spotify_access_token = NULL, spotify_refresh_token = NULL'
      );
    } catch (error) {
      console.log('Database not available for logout');
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

  async getDevices(): Promise<{ id: string; name: string; type: string; is_active: boolean }[]> {
    const data = await this.makeRequest('/me/player/devices');
    return data.devices.map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      is_active: d.is_active,
    }));
  }

  async transferPlayback(deviceId: string): Promise<void> {
    await this.makeRequest('/me/player', {
      method: 'PUT',
      body: JSON.stringify({ device_ids: [deviceId], play: true }),
    });
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

  async playPlaylist(playlistUri: string, deviceId?: string): Promise<void> {
    const endpoint = deviceId 
      ? `/me/player/play?device_id=${deviceId}`
      : '/me/player/play';
    await this.makeRequest(endpoint, {
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
