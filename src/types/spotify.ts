export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt: string;
  duration: number; // milliseconds
  uri: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  trackCount: number;
  uri: string;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  currentTrack?: SpotifyTrack;
  progress: number; // milliseconds
  volume: number; // 0-100
}

export interface SpotifyAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}
