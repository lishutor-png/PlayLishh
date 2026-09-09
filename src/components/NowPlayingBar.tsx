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

        <div className="flex items-center justify-between p-2 sm:p-2.5 gap-2 sm:gap-3">
          {/* Track Info (Click anywhere here to Expand) */}
          <div
            onClick={onExpand}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative shadow-md">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isPlaying ? 'scale-105' : ''
                  }`}
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
                <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#F27D26] transition-colors leading-tight">
                  {track.title}
                </h4>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30 shrink-0">
                  {track.format}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/50 truncate mt-0.5">
                <span className="truncate">{track.artist}</span>
                {settings.shuffle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDisableShuffle) onDisableShuffle();
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#F27D26]/20 hover:bg-rose-500/20 text-[#F27D26] hover:text-rose-300 border border-[#F27D26]/30 font-mono text-[9px] font-bold shrink-0 transition-colors cursor-pointer"
                    title="Acak Aktif - Ketuk untuk Matikan Acak"
                  >
                    <Shuffle className="w-2.5 h-2.5" />
                    <span>Acak</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Ergonomic Playback Transport Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Tombol Favorit */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(track.id);
              }}
              className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 text-white/50 hover:text-rose-400 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer active:scale-95"
              title={track.isFavorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
            >
              <Heart
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${
                  track.isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : ''
                }`}
              />
            </button>

            {/* Tombol Lagu Sebelumnya */}
            <button
              id="mini-prev-btn"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 text-white/80 hover:text-white flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer active:scale-90"
              title="Lagu Sebelumnya"
            >
              <SkipBack className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            </button>

            {/* Tombol Utama Putar/Jeda (High Contrast & Prominent) */}
            <button
              id="mini-play-pause-btn"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#F27D26] to-[#ff9b4e] hover:brightness-110 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-[#F27D26]/30 active:scale-95 transition-all relative overflow-hidden"
              title={isPlaying ? 'Jeda' : 'Putar'}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/15 pointer-events-none" />
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-white relative z-10" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-white translate-x-0.5 relative z-10" />
              )}
            </button>

            {/* Tombol Lagu Berikutnya */}
            <button
              id="mini-next-btn"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 text-white/80 hover:text-white flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer active:scale-90"
              title="Lagu Berikutnya"
            >
              <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

