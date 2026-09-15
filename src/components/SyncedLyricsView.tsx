import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Edit3, Music2, FileText, Type, ChevronRight, Download, Check, FolderDown } from 'lucide-react';
import { parseLyrics, getActiveLyricIndex, LyricLine } from '../services/lyricParser';

export type LyricFontSize = 'normal' | 'large' | 'xlarge';

interface SyncedLyricsViewProps {
  rawLyrics?: string;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  onOpenEditor: () => void;
  mode?: 'full' | 'ticker';
  trackTitle?: string;
  className?: string;
}

export const SyncedLyricsView: React.FC<SyncedLyricsViewProps> = ({
  rawLyrics,
  currentTime,
  duration,
  onSeek,
  onOpenEditor,
  mode = 'full',
  trackTitle,
  className = '',
}) => {
  // Font size setting (defaults to 'large' as requested by user)
  const [fontSize, setFontSize] = useState<LyricFontSize>(() => {
    try {
      const saved = localStorage.getItem('playlish_lyric_size');
      if (saved === 'normal' || saved === 'large' || saved === 'xlarge') return saved;
    } catch {
      // fallback
    }
    return 'large';
  });

  const handleSetFontSize = (size: LyricFontSize) => {
    setFontSize(size);
    try {
      localStorage.setItem('playlish_lyric_size', size);
    } catch {
      // ignore
    }
  };

  const lines = useMemo(() => {
    return parseLyrics(rawLyrics, duration);
  }, [rawLyrics, duration]);

  const activeIndex = useMemo(() => {
    return getActiveLyricIndex(lines, currentTime);
  }, [lines, currentTime]);

  const [downloaded, setDownloaded] = useState(false);

  // Fast direct download of current .lrc
  const handleDownloadLrc = () => {
    if (!rawLyrics) return;
    const cleanName = (trackTitle || 'lirik').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'lirik';
    const fileName = cleanName.toLowerCase().endsWith('.lrc') ? cleanName : `${cleanName}.lrc`;

    try {
      let hiddenIframe = document.getElementById('lrc_download_frame') as HTMLIFrameElement | null;
      if (!hiddenIframe) {
        hiddenIframe = document.createElement('iframe');
        hiddenIframe.id = 'lrc_download_frame';
        hiddenIframe.name = 'lrc_download_frame';
        hiddenIframe.style.display = 'none';
        document.body.appendChild(hiddenIframe);
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/download-lrc';
      form.target = 'lrc_download_frame';

      const titleInput = document.createElement('input');
      titleInput.type = 'hidden';
      titleInput.name = 'title';
      titleInput.value = fileName;
      form.appendChild(titleInput);

      const contentInput = document.createElement('input');
      contentInput.type = 'hidden';
      contentInput.name = 'content';
      contentInput.value = rawLyrics;
      form.appendChild(contentInput);

      document.body.appendChild(form);
      form.submit();
      setTimeout(() => {
        try {
          document.body.removeChild(form);
        } catch {
          // ignore
        }
      }, 1000);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch {
      const blob = new Blob([rawLyrics], { type: 'application/octet-stream;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active line to vertical center smoothly
  useEffect(() => {
    if (mode === 'full' && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, mode]);

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Typography scaling classes based on chosen font size
  const getActiveTextClass = () => {
    switch (fontSize) {
      case 'xlarge':
        return 'text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight';
      case 'large':
        return 'text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight';
      case 'normal':
      default:
        return 'text-lg sm:text-xl md:text-2xl font-extrabold leading-snug tracking-normal';
    }
  };

  const getInactiveTextClass = () => {
    switch (fontSize) {
      case 'xlarge':
        return 'text-lg sm:text-xl md:text-2xl font-semibold leading-relaxed tracking-tight';
      case 'large':
        return 'text-base sm:text-lg md:text-xl font-medium leading-relaxed';
      case 'normal':
      default:
        return 'text-sm sm:text-base font-normal leading-relaxed';
    }
  };

  // Mode: Compact Ticker (placed under player visualizer)
  if (mode === 'ticker') {
    if (lines.length === 0) {
      return (
        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-between text-white/50 hover:text-white transition-all group backdrop-blur-xl cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Sparkles className="w-4 h-4 text-[#F27D26] animate-pulse shrink-0" />
            <span className="truncate font-medium text-white/80">Belum ada lirik • Ketuk untuk tulis otomatis</span>
          </div>
          <span className="text-xs font-bold text-[#F27D26] group-hover:underline shrink-0 ml-2 px-2.5 py-1 rounded-lg bg-[#F27D26]/10">
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
        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-b from-white/[0.06] to-black/60 border border-[#F27D26]/30 hover:border-[#F27D26]/60 flex flex-col gap-1 text-center cursor-pointer transition-all shadow-xl shadow-black/40 backdrop-blur-xl group"
        title="Ketuk untuk buka lirik layar penuh atau sesuaikan waktu"
      >
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold text-[#F27D26] uppercase tracking-widest">
          <Music2 className="w-3.5 h-3.5 animate-pulse" />
          <span>Lirik Berjalan</span>
          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-white/70" />
        </div>
        <div className="text-base sm:text-lg font-black text-white tracking-tight truncate transition-all duration-300 drop-shadow-md">
          {currentLine?.text || '♪ ♪ ♪'}
        </div>
        {nextLine && (
          <div className="text-xs text-white/50 truncate font-medium">
            {nextLine.text}
          </div>
        )}
      </div>
    );
  }

  // Mode: Full Synced Karaoke Lyrics View
  return (
    <div
      className={`relative w-full h-80 sm:h-96 md:h-[420px] flex flex-col rounded-3xl bg-black/40 border border-white/10 backdrop-blur-2xl overflow-hidden shadow-2xl ${className}`}
    >
      {/* Top Toolbar */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/50 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#F27D26] animate-pulse shadow-[0_0_8px_#F27D26]" />
          <span className="text-xs font-extrabold text-white tracking-wide">
            Lirik Karaoke Sinkron
          </span>
        </div>

        {/* Font Size & Edit Controls */}
        <div className="flex items-center gap-2">
          {/* Font Size Switcher */}
          <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => handleSetFontSize('normal')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                fontSize === 'normal'
                  ? 'bg-[#F27D26] text-white shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
              title="Ukuran Lirik: Sedang"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => handleSetFontSize('large')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                fontSize === 'large'
                  ? 'bg-[#F27D26] text-white shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
              title="Ukuran Lirik: Besar (Default)"
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => handleSetFontSize('xlarge')}
              className={`px-2 py-1 rounded-lg text-xs font-black transition-all ${
                fontSize === 'xlarge'
                  ? 'bg-[#F27D26] text-white shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
              title="Ukuran Lirik: Jumbo"
            >
              A++
            </button>
          </div>

          {/* Quick Simpan .LRC button if lyrics exist */}
          {rawLyrics && (
            <button
              type="button"
              onClick={handleDownloadLrc}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                downloaded
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
              }`}
              title="Unduh berkas .lrc langsung ke perangkat Anda"
            >
              {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FolderDown className="w-3.5 h-3.5 text-[#F27D26]" />}
              <span>{downloaded ? 'Tersimpan!' : 'Simpan .LRC'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenEditor}
            className="px-3 py-1.5 rounded-xl bg-[#F27D26]/15 hover:bg-[#F27D26]/25 border border-[#F27D26]/30 text-[#F27D26] text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Edit Lirik</span>
          </button>
        </div>
      </div>

      {/* Top Gradient Fade Overlay for Cinematic Depth */}
      <div className="pointer-events-none absolute top-12 left-0 right-0 h-12 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent z-10" />

      {/* Lyrics Scrollable Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-12 space-y-3 sm:space-y-4 text-left sm:text-center scroll-smooth select-none relative"
      >
        {lines.length > 0 ? (
          lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek && onSeek(line.time)}
                className={`cursor-pointer transition-all duration-300 py-2.5 px-4 rounded-2xl group ${
                  isActive
                    ? `${getActiveTextClass()} text-white bg-gradient-to-r from-[#F27D26]/30 via-[#F27D26]/15 to-transparent border-l-4 border-[#F27D26] scale-[1.02] shadow-xl shadow-[#F27D26]/10 drop-shadow-[0_2px_12px_rgba(242,125,38,0.35)]`
                    : `${getInactiveTextClass()} text-white/35 hover:text-white/85 hover:bg-white/5 transition-colors duration-200`
                }`}
              >
                <div className="flex items-center justify-between sm:justify-center gap-3">
                  <span className="break-words">{line.text}</span>
                  {isActive && (
                    <span className="text-[10px] font-mono text-[#F27D26] font-bold px-1.5 py-0.5 rounded bg-[#F27D26]/20 border border-[#F27D26]/30 shrink-0">
                      {formatSecs(line.time)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/60 space-y-3.5 py-8">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F27D26]">
              <FileText className="w-7 h-7" />
            </div>
            <div className="text-center max-w-xs space-y-1">
              <h4 className="text-sm font-bold text-white">Belum Ada Lirik</h4>
              <p className="text-xs text-white/50 leading-relaxed">
                Lagu ini belum memiliki lirik. Anda dapat menulis lirik sendiri atau membuatnya otomatis dengan AI.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenEditor}
              className="px-5 py-2.5 rounded-2xl bg-[#F27D26] hover:brightness-110 active:scale-95 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#F27D26]/25 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Tulis Lirik Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Bottom Gradient Fade Overlay */}
      <div className="pointer-events-none absolute bottom-8 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent z-10" />

      {/* Footer guidance */}
      {lines.length > 0 && (
        <div className="px-4 py-2 bg-black/60 border-t border-white/5 text-[11px] text-white/40 text-center z-20 shrink-0 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26]" />
          <span>Ketuk baris lirik mana saja untuk langsung melompat ke detik lagu tersebut</span>
        </div>
      )}
    </div>
  );
};
