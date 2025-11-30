/**
 * Spotify API - DISABLED
 * This app uses local music and YouTube lofi streams instead.
 * See music.ts for the active music player implementation.
 */

// Stub exports to prevent import errors
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
  images: { url: string }[];
  tracks: { total: number };
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  track: SpotifyTrack | null;
  progress: number;
  device: string | null;
}

// Stub class - Spotify is disabled
export class SpotifyAPI {
  async getTokens(): Promise<SpotifyTokens | null> {
    return null;
  }

  isAuthenticated(): boolean {
    return false;
  }

  async login(): Promise<void> {
    console.warn('Spotify is disabled. Use local music or YouTube lofi streams.');
  }

  async handleCallback(_code: string, _codeVerifier?: string): Promise<SpotifyTokens> {
    throw new Error('Spotify is disabled');
  }

  async logout(): Promise<void> {
    // No-op
  }

  async getPlaybackState(): Promise<SpotifyPlaybackState | null> {
    return null;
  }

  async play(_uri?: string): Promise<void> {
    console.warn('Spotify is disabled');
  }

  async pause(): Promise<void> {
    // No-op
  }

  async next(): Promise<void> {
    // No-op
  }

  async previous(): Promise<void> {
    // No-op
  }

  async setVolume(_volume: number): Promise<void> {
    // No-op
  }

  async getPlaylists(): Promise<SpotifyPlaylist[]> {
    return [];
  }

  async getPlaylistTracks(_playlistId: string): Promise<SpotifyTrack[]> {
    return [];
  }
}

// Export singleton instance
export const spotifyAPI = new SpotifyAPI();
