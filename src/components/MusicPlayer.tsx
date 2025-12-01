import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Youtube, Upload, Radio, X, ChevronRight } from 'lucide-react';
import { musicPlayer, MusicState, LOFI_STREAMS, PlayerMode } from '@/lib/music';
import { cn } from '@/lib/utils';

interface MusicPlayerProps {
  compact?: boolean;
}

export default function MusicPlayer({ compact = false }: MusicPlayerProps) {
  const [state, setState] = useState<MusicState>(musicPlayer.state);
  const [showPanel, setShowPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Derive mode and playing state from singleton (persists across navigation)
  const mode: PlayerMode = musicPlayer.mode;
  const selectedStream = state.youtubeStream || LOFI_STREAMS[0];
  const youtubePlaying = state.youtubeIsPlaying;

  useEffect(() => {
    const unsubscribe = musicPlayer.subscribe(setState);
    return () => { unsubscribe(); };
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      musicPlayer.stopYoutube(); // Stop YouTube if playing
      await musicPlayer.playLocalFile(file);
      setShowPanel(false);
    }
  };

  const handleYoutubeSelect = (stream: typeof LOFI_STREAMS[0]) => {
    musicPlayer.playYoutubeStream(stream);
    setShowPanel(false);
  };

  const stopAll = () => {
    musicPlayer.stopAll();
  };

  const isPlaying = mode === 'local' ? state.isPlaying : (mode === 'youtube' && youtubePlaying);
  const trackName = mode === 'local' ? state.currentTrack?.name : (mode === 'youtube' ? selectedStream.name : null);

  // Compact header button - this is the main one used in FocusMode
  if (compact) {
    return (
      <div className="relative" ref={panelRef}>
        {/* YouTube iframe is now rendered globally in Layout.tsx */}
        
        {/* Main Button */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm cursor-pointer",
            isPlaying 
              ? "bg-primary/20 border-primary/30 text-primary" 
              : "bg-white/5 border-white/10 text-white/50 hover:text-white/70 hover:bg-white/10"
          )}
        >
          {isPlaying ? (
            <>
              {/* Animated bars when playing */}
              <div className="flex items-end gap-0.5 h-4">
                <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0ms' }} />
                <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '80%', animationDelay: '150ms' }} />
                <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '60%', animationDelay: '300ms' }} />
                <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '100%', animationDelay: '450ms' }} />
              </div>
              <span className="max-w-[100px] truncate hidden sm:inline">{trackName}</span>
            </>
          ) : (
            <>
              <Music className="w-4 h-4" />
              <span className="hidden sm:inline">Music</span>
            </>
          )}
        </button>

        {/* Dropdown Panel */}
        {showPanel && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-[#1a1a1d]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/5">
              <h3 className="font-medium text-white text-sm">Music</h3>
              <button 
                onClick={() => setShowPanel(false)} 
                className="p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Now Playing */}
            {mode !== 'none' && (
              <div className="p-3 bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    {mode === 'youtube' ? (
                      <Youtube className="w-5 h-5 text-red-500" />
                    ) : (
                      <Music className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{trackName}</div>
                    <div className="text-xs text-white/50">
                      {mode === 'youtube' ? selectedStream.channel : 'Local file'}
                    </div>
                  </div>
                  <button
                    onClick={stopAll}
                    className="p-2 text-white/40 hover:text-red-400 rounded-full hover:bg-red-500/10"
                    title="Stop"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Audio visualizer line */}
                {isPlaying && (
                  <div className="flex items-center justify-center gap-[2px] h-6 mt-3">
                    {[...Array(24)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-0.5 rounded-full",
                          mode === 'youtube' ? "bg-red-400/60" : "bg-primary/60"
                        )}
                        style={{
                          height: `${20 + Math.sin(i * 0.5) * 40 + Math.random() * 40}%`,
                          animation: `pulse ${300 + Math.random() * 400}ms ease-in-out infinite`,
                          animationDelay: `${i * 40}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Volume for local files */}
                {mode === 'local' && (
                  <div className="flex items-center gap-2 mt-3">
                    <button 
                      onClick={() => musicPlayer.setVolume(state.volume === 0 ? 0.5 : 0)}
                      className="text-white/40 hover:text-white"
                    >
                      {state.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={state.volume}
                      onChange={(e) => musicPlayer.setVolume(parseFloat(e.target.value))}
                      className="flex-1 accent-primary h-1"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Options */}
            <div className="p-2">
              {/* Local file option */}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">Local File</div>
                  <div className="text-xs text-white/40">Play from your computer</div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
              </button>

              {/* Divider */}
              <div className="my-2 px-2">
                <div className="text-xs text-white/30 flex items-center gap-2">
                  <Youtube className="w-3 h-3" /> Lofi Streams
                </div>
              </div>

              {/* YouTube streams */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {LOFI_STREAMS.map((stream) => (
                  <button
                    key={stream.id}
                    onClick={() => handleYoutubeSelect(stream)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left group",
                      selectedStream.id === stream.id && mode === 'youtube'
                        ? "bg-red-500/10"
                        : "hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      selectedStream.id === stream.id && mode === 'youtube'
                        ? "bg-red-500/20"
                        : "bg-white/5"
                    )}>
                      <Radio className={cn(
                        "w-4 h-4",
                        selectedStream.id === stream.id && mode === 'youtube'
                          ? "text-red-400"
                          : "text-white/40"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm truncate",
                        selectedStream.id === stream.id && mode === 'youtube'
                          ? "text-red-400"
                          : "text-white/80"
                      )}>
                        {stream.name}
                      </div>
                    </div>
                    {selectedStream.id === stream.id && mode === 'youtube' && (
                      <div className="flex items-end gap-0.5 h-3">
                        <div className="w-0.5 bg-red-400 animate-pulse rounded-full" style={{ height: '40%' }} />
                        <div className="w-0.5 bg-red-400 animate-pulse rounded-full" style={{ height: '80%', animationDelay: '150ms' }} />
                        <div className="w-0.5 bg-red-400 animate-pulse rounded-full" style={{ height: '60%', animationDelay: '300ms' }} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full player (unused now, but kept for potential settings page)
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
      {/* YouTube iframe is now rendered globally in Layout.tsx */}
      
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
          {mode === 'youtube' ? (
            <Youtube className="w-6 h-6 text-red-500" />
          ) : mode === 'local' ? (
            <Music className="w-6 h-6 text-primary" />
          ) : (
            <Music className="w-6 h-6 text-white/30" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {mode !== 'none' ? (
            <>
              <div className="font-medium text-white truncate">{trackName}</div>
              <div className="text-sm text-white/50">
                {mode === 'youtube' ? selectedStream.channel : 'Local file'}
              </div>
            </>
          ) : (
            <>
              <div className="text-white/50">No music playing</div>
              <div className="text-sm text-white/30">Click Music button to select</div>
            </>
          )}
        </div>

        {mode !== 'none' && (
          <button
            onClick={() => {
              if (mode === 'local') {
                musicPlayer.togglePlay();
              } else {
                musicPlayer.toggleYoutube();
              }
            }}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
