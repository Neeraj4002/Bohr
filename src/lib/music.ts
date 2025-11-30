// Local Music & YouTube Player

export interface Track {
  id: string;
  name: string;
  path: string; // file path or URL
  type: 'local' | 'youtube';
}

export interface MusicState {
  isPlaying: boolean;
  currentTrack: Track | null;
  volume: number;
  currentTime: number;
  duration: number;
  // YouTube state (persists across component unmounts)
  youtubeStream: { id: string; name: string; channel: string } | null;
  youtubeIsPlaying: boolean;
}

export type PlayerMode = 'none' | 'local' | 'youtube';

// Popular lofi YouTube streams/videos (embed IDs)
export const LOFI_STREAMS = [
  { id: 'jfKfPfyJRdk', name: 'lofi hip hop radio 📚 beats to relax/study to', channel: 'Lofi Girl' },
  { id: 'rUxyKA_-grg', name: 'lofi hip hop radio 💤 beats to sleep/chill to', channel: 'Lofi Girl' },
  { id: '4xDzrJKXOOY', name: 'synthwave radio 🌌 beats to chill/game to', channel: 'Lofi Girl' },
  { id: 'MVPTGNGiI-4', name: 'dark ambient radio 🎧 music to escape/dream to', channel: 'Lofi Girl' },
];

class MusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private listeners: Set<(state: MusicState) => void> = new Set();
  private _state: MusicState = {
    isPlaying: false,
    currentTrack: null,
    volume: 0.5,
    currentTime: 0,
    duration: 0,
    youtubeStream: null,
    youtubeIsPlaying: false,
  };

  constructor() {
    // Load saved volume
    const savedVolume = localStorage.getItem('music_volume');
    if (savedVolume) {
      this._state.volume = parseFloat(savedVolume);
    }
  }

  get state(): MusicState {
    return { ...this._state };
  }

  subscribe(listener: (state: MusicState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }

  private updateState(updates: Partial<MusicState>) {
    this._state = { ...this._state, ...updates };
    this.notify();
  }

  async playLocalFile(file: File) {
    // Stop any current playback
    this.stop();

    const url = URL.createObjectURL(file);
    this.audio = new Audio(url);
    this.audio.volume = this._state.volume;

    this.audio.addEventListener('loadedmetadata', () => {
      this.updateState({ duration: this.audio?.duration || 0 });
    });

    this.audio.addEventListener('timeupdate', () => {
      this.updateState({ currentTime: this.audio?.currentTime || 0 });
    });

    this.audio.addEventListener('ended', () => {
      this.updateState({ isPlaying: false, currentTime: 0 });
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      this.updateState({ isPlaying: false });
    });

    const track: Track = {
      id: file.name,
      name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      path: url,
      type: 'local',
    };

    this.updateState({ currentTrack: track });
    await this.audio.play();
    this.updateState({ isPlaying: true });
  }

  async playFromPath(path: string, name: string) {
    this.stop();

    this.audio = new Audio(path);
    this.audio.volume = this._state.volume;

    this.audio.addEventListener('loadedmetadata', () => {
      this.updateState({ duration: this.audio?.duration || 0 });
    });

    this.audio.addEventListener('timeupdate', () => {
      this.updateState({ currentTime: this.audio?.currentTime || 0 });
    });

    this.audio.addEventListener('ended', () => {
      this.updateState({ isPlaying: false, currentTime: 0 });
    });

    const track: Track = {
      id: path,
      name,
      path,
      type: 'local',
    };

    this.updateState({ currentTrack: track });
    await this.audio.play();
    this.updateState({ isPlaying: true });
  }

  play() {
    if (this.audio && !this._state.isPlaying) {
      this.audio.play();
      this.updateState({ isPlaying: true });
    }
  }

  pause() {
    if (this.audio && this._state.isPlaying) {
      this.audio.pause();
      this.updateState({ isPlaying: false });
    }
  }

  togglePlay() {
    if (this._state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.updateState({
      isPlaying: false,
      currentTrack: null,
      currentTime: 0,
      duration: 0,
    });
  }

  setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = clampedVolume;
    }
    localStorage.setItem('music_volume', clampedVolume.toString());
    this.updateState({ volume: clampedVolume });
  }

  seek(time: number) {
    if (this.audio) {
      this.audio.currentTime = time;
      this.updateState({ currentTime: time });
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // YouTube stream methods
  playYoutubeStream(stream: { id: string; name: string; channel: string }) {
    // Stop local audio if playing
    this.stop();
    this.updateState({
      youtubeStream: stream,
      youtubeIsPlaying: true,
    });
  }

  stopYoutube() {
    this.updateState({
      youtubeStream: null,
      youtubeIsPlaying: false,
    });
  }

  toggleYoutube() {
    this.updateState({
      youtubeIsPlaying: !this._state.youtubeIsPlaying,
    });
  }

  // Get current mode
  get mode(): PlayerMode {
    if (this._state.youtubeIsPlaying && this._state.youtubeStream) return 'youtube';
    if (this._state.isPlaying && this._state.currentTrack) return 'local';
    if (this._state.currentTrack) return 'local'; // paused local
    if (this._state.youtubeStream) return 'youtube'; // paused youtube
    return 'none';
  }

  // Stop everything
  stopAll() {
    this.stop();
    this.stopYoutube();
  }
}

export const musicPlayer = new MusicPlayer();
