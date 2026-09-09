import { Play, Pause, SkipBack, SkipForward, Heart, Music, Shuffle } from 'lucide-react';
import { AudioTrack, AudioSettings } from '../types';

interface NowPlayingBarProps {
  track: AudioTrack;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  settings: AudioSettings;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleFavorite: (trackId: string) => void;
  onExpand: () => void;
  onDisableShuffle?: () => void;
}

export function NowPlayingBar({
  track,
  isPlaying,
  currentTime,
  duration,
  settings,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleFavorite,
  onExpand,
  onDisableShuffle,
}: NowPlayingBarProps) {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      id="mini-player-bar"
      className="w-full shrink-0 z-30 px-2.5 py-1.5 bg-[#0D0D0D]/95 backdrop-blur-2xl border-t border-white/10 select-none"
    >
      <div className="w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 rounded-2xl shadow-xl overflow-hidden relative group transition-colors">
        {/* Top Slim Progress Indicator */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/10">
          <div
            className="h-full bg-[#F27D26] shadow-[0_0_8px_rgba(242,125,38,0.9)] transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between p-2 gap-2.5">
          {/* Track Info (Click to Expand) */}
          <div
            onClick={onExpand}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative shadow">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className={`w-full h-full object-cover ${isPlaying ? 'scale-105' : ''}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40">
                  <Music className="w-5 h-5" />
                </div>
              )}
              {isPlaying && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F27D26] animate-ping" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-white truncate group-hover:text-[#F27D26] transition-colors">
                  {track.title}
                </h4>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30 shrink-0">
                  {track.format}
                </span>
                {settings.shuffle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDisableShuffle) onDisableShuffle();
                    }}
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] hover:bg-rose-500/20 hover:text-rose-300 border border-[#F27D26]/40 hover:border-rose-500/40 shrink-0 cursor-pointer transition-colors flex items-center gap-1"
                    title="Putar Acak Aktif - Klik untuk Menghentikan Acak"
                  >
                    <Shuffle className="w-2.5 h-2.5" />
                    <span>Acak (Hentikan)</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-white/50 truncate mt-0.5">
                {track.artist} • {track.album}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Lagu Sebelumnya */}
            <button
              id="mini-prev-btn"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="p-2 text-white/70 hover:text-white cursor-pointer rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors active:scale-90"
              title="Lagu Sebelumnya"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              id="mini-play-pause-btn"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
              }}
              className="w-9 h-9 rounded-xl bg-[#F27D26] hover:bg-[#ff8a3d] text-white flex items-center justify-center cursor-pointer shadow-lg shadow-[#F27D26]/30 active:scale-95 transition-all"
              title={isPlaying ? 'Jeda' : 'Putar'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>

            {/* Lagu Berikutnya */}
            <button
              id="mini-next-btn"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="p-2 text-white/70 hover:text-white cursor-pointer rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors active:scale-90"
              title="Lagu Berikutnya"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Favorit */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(track.id);
              }}
              className="p-2 text-white/50 hover:text-rose-400 cursor-pointer rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              title="Favorit"
            >
              <Heart
                className={`w-4 h-4 ${
                  track.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

