import React, { useEffect, useRef, useMemo } from 'react';
import { Sparkles, Edit3, Music2, FileText, ChevronRight } from 'lucide-react';
import { parseLyrics, getActiveLyricIndex } from '../services/lyricParser';

interface SyncedLyricsViewProps {
  rawLyrics?: string;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  onOpenEditor: () => void;
  mode?: 'full' | 'ticker';
  trackTitle?: string;
}

export const SyncedLyricsView: React.FC<SyncedLyricsViewProps> = ({
  rawLyrics,
  currentTime,
  duration,
  onSeek,
  onOpenEditor,
  mode = 'full',
  trackTitle,
}) => {
  const lines = useMemo(() => {
    return parseLyrics(rawLyrics, duration);
  }, [rawLyrics, duration]);

  const activeIndex = useMemo(() => {
    return getActiveLyricIndex(lines, currentTime);
  }, [lines, currentTime]);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active line to vertical center
  useEffect(() => {
    if (mode === 'full' && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, mode]);

  // Mode: Compact Ticker (placed under player / visualizer)
  if (mode === 'ticker') {
    if (lines.length === 0) {
      return (
        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full py-2.5 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between text-white/50 hover:text-white transition-all group backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 text-xs truncate">
            <Sparkles className="w-3.5 h-3.5 text-[#F27D26] animate-pulse shrink-0" />
            <span className="truncate">Belum ada lirik • Ketuk untuk tulis otomatis</span>
          </div>
          <span className="text-[10px] font-semibold text-[#F27D26] group-hover:underline shrink-0 ml-2">
            Tambah Lirik
          </span>
        </button>
      );
    }

    const currentLine = lines[activeIndex] || lines[0];
    const nextLine = lines[activeIndex + 1];

    return (
      <div
        onClick={onOpenEditor}
        className="w-full py-2.5 px-4 rounded-2xl bg-black/40 border border-[#F27D26]/20 hover:border-[#F27D26]/40 flex flex-col gap-0.5 text-center cursor-pointer transition-all shadow-lg backdrop-blur-xl group"
        title="Ketuk untuk edit atau tulis lirik otomatis"
      >
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-[#F27D26]/80 uppercase tracking-widest">
          <Music2 className="w-3 h-3 animate-pulse" />
          <span>Lirik Berjalan</span>
          <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-white/70" />
        </div>
        <div className="text-sm font-bold text-white tracking-wide truncate transition-all duration-300">
          {currentLine?.text || '♪ ♪ ♪'}
        </div>
        {nextLine && (
          <div className="text-[11px] text-white/40 truncate font-medium">
            {nextLine.text}
          </div>
        )}
      </div>
    );
  }

  // Mode: Full Synced Karaoke Lyrics View
  return (
    <div className="relative w-full h-72 sm:h-80 flex flex-col rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-2xl overflow-hidden">
      {/* Top Toolbar */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/30 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#F27D26] animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            Lirik Berjalan & Sinkron
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenEditor}
            className="px-3 py-1.5 rounded-full bg-[#F27D26]/15 hover:bg-[#F27D26]/25 border border-[#F27D26]/30 text-[#F27D26] text-[11px] font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Edit / Tulis Otomatis
          </button>
        </div>
      </div>

      {/* Lyrics Scrollable Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-8 space-y-4 text-center scroll-smooth select-none"
      >
        {lines.length > 0 ? (
          lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek && onSeek(line.time)}
                className={`cursor-pointer transition-all duration-300 py-2 px-3 rounded-2xl ${
                  isActive
                    ? 'text-white font-extrabold text-base sm:text-lg bg-[#F27D26]/20 border border-[#F27D26]/30 scale-105 shadow-lg shadow-[#F27D26]/10'
                    : 'text-white/40 hover:text-white/80 font-medium text-xs sm:text-sm hover:bg-white/5'
                }`}
              >
                {line.text}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-3 py-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs max-w-xs leading-relaxed">
              Lagu ini belum memiliki lirik. Anda dapat menulis lirik manual atau membuatnya otomatis dengan AI.
            </p>
            <button
              type="button"
              onClick={onOpenEditor}
              className="px-4 py-2 rounded-2xl bg-[#F27D26] hover:bg-[#ff8933] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#F27D26]/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tulis Lirik Otomatis Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Footer guidance */}
      {lines.length > 0 && (
        <div className="px-4 py-2 bg-black/40 border-t border-white/5 text-[10px] text-white/40 text-center">
          Ketuk baris lirik mana saja untuk langsung melompat ke bagian lagu tersebut
        </div>
      )}
    </div>
  );
};
