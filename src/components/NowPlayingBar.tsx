import React, { useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Music, Shuffle, Volume2 } from 'lucide-react';
import { AudioTrack, AudioSettings } from '../types';
import { AppLogo } from './AppLogo';

interface NowPlayingBarProps {
  track: AudioTrack;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  settings: AudioSettings;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek?: (seconds: number) => void;
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
  onSeek,
  onToggleFavorite,
  onExpand,
  onDisableShuffle,
}: NowPlayingBarProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Direct touch/click scrubber on the mini player bar
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!onSeek || !duration || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div
      id="mini-player-bar"
      className="w-full shrink-0 z-40 px-2.5 pt-1 pb-1 bg-gradient-to-t from-[#0A0A0A] to-[#0D0D0D]/95 backdrop-blur-2xl border-t border-white/10 select-none shadow-[0_-8px_20px_rgba(0,0,0,0.6)]"
    >
      <div className="w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-2xl shadow-xl overflow-hidden relative group transition-all">
        {/* Top Interactive Progress Indicator / Mini Scrubber */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          className="absolute top-0 left-0 right-0 h-1.5 bg-white/10 cursor-pointer group/progress z-20"
          title="Ketuk untuk lompat durasi"
        >
          <div
            className="h-full bg-gradient-to-r from-[#FF9544] to-[#F27D26] shadow-[0_0_8px_rgba(242,125,38,0.9)] transition-all duration-100 relative"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Scrubber Knob on Hover */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between p-2 sm:p-2.5 gap-2 sm:gap-3 pt-2.5">
          {/* Track Info (Click anywhere here to Expand into Full Player) */}
          <div
            onClick={onExpand}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label="Buka Pemutar Lengkap"
          >
            {/* Track Album Thumbnail with Animated Soundwave Indicator */}
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
                <div className="w-full h-full flex items-center justify-center p-1 bg-[#0e0e10]">
                  <AppLogo size="sm" variant="icon-only" isPlaying={isPlaying} />
                </div>
              )}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="flex items-end gap-[2px] h-3.5">
                    <span className="w-1 bg-[#F27D26] rounded-full animate-pulse h-full" />
                    <span className="w-1 bg-white rounded-full animate-pulse delay-75 h-2.5" />
                    <span className="w-1 bg-[#F27D26] rounded-full animate-pulse delay-150 h-3" />
                  </div>
                </div>
              )}
            </div>

            {/* Title & Artist */}
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
                {settings.gainBoost > 1.0 && (
                  <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1 rounded flex items-center gap-0.5">
                    <Volume2 className="w-2.5 h-2.5" />
                    {Math.round(settings.gainBoost * 100)}%
                  </span>
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
              aria-label="Favorit"
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
              aria-label="Lagu Sebelumnya"
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
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#F27D26] to-[#ff9b4e] hover:brightness-110 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-[#F27D26]/40 active:scale-95 transition-all relative overflow-hidden ring-1 ring-white/20"
              title={isPlaying ? 'Jeda' : 'Putar'}
              aria-label={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/15 pointer-events-none" />
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
              aria-label="Lagu Berikutnya"
            >
              <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
