import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Sparkles,
  Save,
  Trash2,
  Upload,
  Clock,
  Music,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Download,
  Clipboard,
  Radio,
  SkipBack,
  SkipForward,
  ChevronRight,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react';
import { AudioTrack } from '../types';
import { formatLrc, LyricLine, parseLyrics } from '../services/lyricParser';

interface LyricEditorModalProps {
  track: AudioTrack;
  currentTime: number;
  duration: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onSeek?: (time: number) => void;
  onPlayTrack?: (track: AudioTrack) => void;
  isOpen: boolean;
  onClose: () => void;
  onSaveLyrics: (trackId: string, newLyrics: string) => Promise<void>;
}

export const LyricEditorModal: React.FC<LyricEditorModalProps> = ({
  track,
  currentTime,
  duration,
  isPlaying = false,
  onTogglePlay,
  onSeek,
  onPlayTrack,
  isOpen,
  onClose,
  onSaveLyrics,
}) => {
  // Main modes: 'tap-sync' (Lagu Sendiri), 'manual' (Teks / LRC), 'ai' (Generator)
  const [activeTab, setActiveTab] = useState<'tap-sync' | 'manual' | 'ai'>('tap-sync');

  // Lyrics text & parsed lines state
  const [lyricsText, setLyricsText] = useState(track.lyrics || '');
  const [plainInputText, setPlainInputText] = useState('');
  const [syncLines, setSyncLines] = useState<LyricLine[]>([]);
  const [activeSyncIndex, setActiveSyncIndex] = useState(0);

  // Status & feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // Auto initialize sync lines when opening
  useEffect(() => {
    if (isOpen) {
      if (track.lyrics && track.lyrics.trim()) {
        const parsed = parseLyrics(track.lyrics, duration || track.duration || 180);
        setSyncLines(parsed);
        setLyricsText(track.lyrics);
        // Find which line is closest to currentTime
        const idx = parsed.findIndex((l) => l.time >= currentTime);
        setActiveSyncIndex(idx >= 0 ? idx : 0);
      } else {
        setSyncLines([]);
        setActiveSyncIndex(0);
      }
    }
  }, [isOpen, track.id]);

  // Handle parsing plain text into sync lines
  const handleLoadPlainToSync = (textToUse?: string) => {
    const text = (textToUse !== undefined ? textToUse : plainInputText).trim();
    if (!text) {
      setStatusMessage({ type: 'error', text: 'Silakan ketik atau tempel lirik lagu terlebih dahulu.' });
      return;
    }

    const rawLines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) {
      setStatusMessage({ type: 'error', text: 'Tidak ada baris teks yang ditemukan.' });
      return;
    }

    // Initialize with 0 or incremental placeholder times
    const initialLines: LyricLine[] = rawLines.map((line, idx) => ({
      id: `sync-${idx}-${Date.now()}`,
      time: 0,
      text: line.replace(/^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]\s*/, ''), // strip old timestamp if present
    }));

    setSyncLines(initialLines);
    setActiveSyncIndex(0);
    setStatusMessage({
      type: 'success',
      text: `${initialLines.length} baris lirik siap disinkronkan. Tekan "Putar & Ketuk" untuk mulai.`,
    });
  };

  // Instant Auto-Distribute Timestamps Evenly across song duration
  const handleAutoDistributeTimestamps = () => {
    const linesToDistribute = syncLines.length > 0 
      ? syncLines 
      : plainInputText.trim()
        ? plainInputText.trim().split('\n').map(l => ({ id: `line-${Math.random()}`, time: 0, text: l.trim() })).filter(l => l.text)
        : [];

    if (linesToDistribute.length === 0) {
      setStatusMessage({ type: 'error', text: 'Belum ada lirik untuk disinkronkan. Tempel lirik Anda terlebih dahulu.' });
      return;
    }

    const totalSecs = Math.max(30, duration || track.duration || 180);
    const startOffset = 4; // Start 4 seconds into the song
    const usableTime = Math.max(10, totalSecs - 8);
    const step = usableTime / linesToDistribute.length;

    const distributed: LyricLine[] = linesToDistribute.map((line, idx) => ({
      id: line.id || `line-${idx}`,
      time: Math.round((startOffset + idx * step) * 100) / 100,
      text: line.text,
    }));

    setSyncLines(distributed);
    const formatted = formatLrc(distributed);
    setLyricsText(formatted);
    setStatusMessage({
      type: 'success',
      text: `Waktu berhasil diratakan otomatis untuk ${distributed.length} baris! Anda dapat mengujinya sekarang.`,
    });
  };

  // Tapper Function: Stamp current playback time to the active line and advance
  const handleStampActiveLine = useCallback(() => {
    if (syncLines.length === 0) return;
    if (activeSyncIndex >= syncLines.length) {
      setStatusMessage({
        type: 'success',
        text: 'Semua baris lirik telah selesai disinkronkan! Ketuk "Sematkan ke Lagu" untuk menyimpan.',
      });
      return;
    }

    const stampedTime = Math.max(0, Math.round(currentTime * 100) / 100);

    const updated = [...syncLines];
    updated[activeSyncIndex] = {
      ...updated[activeSyncIndex],
      time: stampedTime,
    };

    setSyncLines(updated);
    const formatted = formatLrc(updated);
    setLyricsText(formatted);

    // Advance to next line
    if (activeSyncIndex + 1 < updated.length) {
      setActiveSyncIndex(activeSyncIndex + 1);
    } else {
      setStatusMessage({
        type: 'success',
        text: 'Lirik selesai! Semua baris lagu Anda kini telah memiliki penanda waktu yang sinkron.',
      });
    }
  }, [syncLines, activeSyncIndex, currentTime]);

  // Keyboard shortcut: Spacebar stamps active line if in tap-sync mode and playing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }
      if (activeTab === 'tap-sync' && e.code === 'Space') {
        e.preventDefault();
        handleStampActiveLine();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleStampActiveLine]);

  // Adjust time of a specific line by delta (-0.5s or +0.5s)
  const handleAdjustLineTime = (index: number, delta: number) => {
    setSyncLines((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          time: Math.max(0, Math.round((copy[index].time + delta) * 10) / 10),
        };
      }
      const formatted = formatLrc(copy);
      setLyricsText(formatted);
      return copy;
    });
  };

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPlainInputText(text);
          handleLoadPlainToSync(text);
        }
      }
    } catch {
      setStatusMessage({ type: 'info', text: 'Gunakan Ctrl+V atau tahan pada kotak teks untuk menempel lirik.' });
    }
  };

  // Save to DB and close
  const handleSave = async () => {
    let finalLrc = lyricsText.trim();
    if (syncLines.length > 0) {
      finalLrc = formatLrc(syncLines);
    }

    if (!finalLrc) {
      setStatusMessage({ type: 'error', text: 'Tidak ada lirik untuk disematkan.' });
      return;
    }

    await onSaveLyrics(track.id, finalLrc);
    setStatusMessage({
      type: 'success',
      text: 'Lirik berhasil disematkan secara permanen ke lagu Anda!',
    });
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Download .LRC file to device
  const handleDownloadLrc = () => {
    const textToDownload = lyricsText || (syncLines.length > 0 ? formatLrc(syncLines) : '');
    if (!textToDownload) return;

    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = track.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'lirik';
    link.href = url;
    link.download = `${safeTitle}.lrc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage({ type: 'info', text: `File "${safeTitle}.lrc" berhasil diunduh ke perangkat.` });
  };

  // Handle AI Auto-write lyrics
  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/generate-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: track.title,
          artist: track.artist,
          genre: track.genre,
          durationSec: duration > 0 ? duration : track.duration,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error('Layanan lirik sibuk');
      const data = await response.json();
      if (data.lyrics) {
        setLyricsText(data.lyrics);
        const parsed = parseLyrics(data.lyrics, duration || track.duration || 180);
        setSyncLines(parsed);
        setStatusMessage({
          type: 'success',
          text: 'Lirik cerdas berhasil dibuat oleh AI!',
        });
        setActiveTab('tap-sync');
      }
    } catch {
      setStatusMessage({ type: 'info', text: 'Gunakan mode "Lagu Sendiri" untuk menempel lirik Anda secara instan.' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${String(s).padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0E0E0E] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/15 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-1.5">
                Sematkan Lirik ke Lagu
              </h2>
              <p className="text-xs text-white/50 truncate">
                {track.title} • {track.artist}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pt-3 flex gap-2 border-b border-white/5 bg-white/[0.01]">
          <button
            type="button"
            onClick={() => setActiveTab('tap-sync')}
            className={`flex-1 pb-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'tap-sync'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Lagu Sendiri (Ketuk Sinkron)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 pb-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'manual'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Editor Teks & LRC
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 pb-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'ai'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Tulis AI
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl flex items-start gap-2.5 animate-in fade-in text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                  : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed flex-1">{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: LAGU SENDIRI (KETUK SINKRON / TAP-TO-SYNC) */}
          {activeTab === 'tap-sync' && (
            <div className="space-y-4">
              {/* Step 1: When no sync lines loaded yet */}
              {syncLines.length === 0 ? (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-[#F27D26]/10 border border-[#F27D26]/20">
                    <h3 className="font-bold text-white text-xs flex items-center gap-1.5 mb-1 text-[#F27D26]">
                      <Radio className="w-4 h-4" />
                      Sematkan Lirik Lagu Sendiri dengan Sangat Mudah
                    </h3>
                    <p className="text-white/70 text-[11px] leading-relaxed">
                      Cukup tempelkan teks lirik lagu Anda di bawah ini (baris per baris). Anda dapat memilih
                      untuk <strong>Meratakan Waktu Otomatis</strong> atau mengetuk baris lirik sambil mendengarkan lagu Anda.
                    </p>
                  </div>

                  <div className="relative">
                    <textarea
                      value={plainInputText}
                      onChange={(e) => setPlainInputText(e.target.value)}
                      placeholder={`Tempelkan lirik lagu Anda di sini baris demi baris...\nContoh:\nKulihat bintang di malam hari\nMelodi indah menemani sunyi\nLagu ini kubuat dari hati`}
                      rows={7}
                      className="w-full p-3.5 rounded-2xl bg-black/50 border border-white/10 text-white font-sans text-xs focus:outline-none focus:border-[#F27D26] leading-relaxed resize-none transition-colors placeholder:text-white/30"
                    />
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-md transition-all"
                      title="Tempel dari Clipboard"
                    >
                      <Clipboard className="w-3 h-3 text-[#F27D26]" />
                      Tempel Teks
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleLoadPlainToSync()}
                      disabled={!plainInputText.trim()}
                      className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#F27D26] to-[#d65d07] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F27D26]/20 transition-all disabled:opacity-40"
                    >
                      <Radio className="w-4 h-4" />
                      Mulai Mode Ketuk Waktu Sambil Mendengar
                    </button>

                    <button
                      type="button"
                      onClick={handleAutoDistributeTimestamps}
                      disabled={!plainInputText.trim()}
                      className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                      title="Membagi waktu lirik rata di sepanjang lagu tanpa perlu mendengar"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Bagi Waktu Otomatis (Instan)
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Interactive Tap-To-Sync Studio */
                <div className="space-y-4 animate-in fade-in">
                  {/* Playback status & Mini Scrubber */}
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onTogglePlay && onTogglePlay()}
                      className="w-10 h-10 rounded-xl bg-[#F27D26] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono text-[#F27D26] font-bold">{formatSecs(currentTime)}</span>
                        <span className="text-white/40 font-mono">
                          {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                        </span>
                      </div>
                      <div
                        onClick={(e) => {
                          if (!onSeek || duration <= 0) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          onSeek(pos * duration);
                        }}
                        className="w-full h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer relative"
                      >
                        <div
                          className="h-full bg-[#F27D26] transition-all duration-100"
                          style={{ width: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSeek && onSeek(Math.max(0, currentTime - 5))}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-mono"
                        title="Mundur 5 detik"
                      >
                        -5s
                      </button>
                      <button
                        type="button"
                        onClick={() => onSeek && onSeek(Math.min(duration, currentTime + 5))}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-mono"
                        title="Maju 5 detik"
                      >
                        +5s
                      </button>
                    </div>
                  </div>

                  {/* ACTIVE LINE HIGHLIGHT CARD (THE SINGER'S PROMPTER) */}
                  <div className="p-4 rounded-3xl bg-gradient-to-b from-[#F27D26]/20 via-[#F27D26]/5 to-black/60 border-2 border-[#F27D26]/50 shadow-xl relative overflow-hidden text-center space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] text-white/50 font-mono uppercase tracking-widest">
                      <span>Baris {activeSyncIndex + 1} dari {syncLines.length}</span>
                      <span className="text-[#F27D26] font-bold">
                        {Math.round(((activeSyncIndex + 1) / syncLines.length) * 100)}%
                      </span>
                    </div>

                    {/* Previous Line preview */}
                    {activeSyncIndex > 0 && (
                      <div className="text-[11px] text-emerald-400/70 line-clamp-1 italic">
                        ✓ {syncLines[activeSyncIndex - 1]?.text} ({formatSecs(syncLines[activeSyncIndex - 1]?.time)})
                      </div>
                    )}

                    {/* BIG CURRENT LINE TEXT */}
                    <div className="text-base sm:text-lg font-extrabold text-white tracking-wide py-1 drop-shadow-md">
                      {syncLines[activeSyncIndex]?.text || 'Semua baris selesai!'}
                    </div>

                    {/* Next Line preview */}
                    {activeSyncIndex + 1 < syncLines.length && (
                      <div className="text-[11px] text-white/40 line-clamp-1">
                        Berikutnya: {syncLines[activeSyncIndex + 1]?.text}
                      </div>
                    )}

                    {/* GIANT TAP-TO-SYNC BUTTON */}
                    <button
                      type="button"
                      onClick={handleStampActiveLine}
                      disabled={activeSyncIndex >= syncLines.length}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#F27D26] via-[#ff8833] to-[#F27D26] hover:brightness-110 active:scale-95 text-white font-extrabold text-sm sm:text-base flex flex-col items-center justify-center gap-1 shadow-xl shadow-[#F27D26]/30 transition-all border border-white/20 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Radio className="w-5 h-5 animate-pulse" />
                        <span>KETUK SAAT BARIS INI DIMULAI</span>
                      </div>
                      <span className="text-[10px] font-normal text-white/80">
                        (Atau tekan tombol SPASI pada keyboard)
                      </span>
                    </button>
                  </div>

                  {/* Quick Controls below Prompter */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSyncIndex((prev) => Math.max(0, prev - 1))}
                      disabled={activeSyncIndex === 0}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-all disabled:opacity-30"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                      Ulang Baris Sebelumnya
                    </button>

                    <button
                      type="button"
                      onClick={handleAutoDistributeTimestamps}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-[11px] font-medium flex items-center gap-1 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Ratakan Waktu Sisa
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSyncIndex((prev) => Math.min(syncLines.length - 1, prev + 1))}
                      disabled={activeSyncIndex >= syncLines.length - 1}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-all disabled:opacity-30"
                    >
                      Lewati Baris
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* List of all lines for fine-tuning */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    <div className="text-[10px] uppercase font-mono text-white/40 tracking-wider">
                      Daftar Baris & Penyesuaian Waktu:
                    </div>
                    {syncLines.map((line, idx) => (
                      <div
                        key={line.id}
                        onClick={() => setActiveSyncIndex(idx)}
                        className={`p-2 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                          idx === activeSyncIndex
                            ? 'bg-[#F27D26]/20 border border-[#F27D26]/40 text-white font-bold'
                            : line.time > 0
                            ? 'bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
                            : 'bg-black/40 text-white/40 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[10px] text-[#F27D26] w-12 shrink-0">
                            {formatSecs(line.time)}
                          </span>
                          <span className="truncate">{line.text}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleAdjustLineTime(idx, -0.5)}
                            className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white/60 hover:text-white"
                            title="Mundurkan 0.5s"
                          >
                            -0.5s
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustLineTime(idx, 0.5)}
                            className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white/60 hover:text-white"
                            title="Majukan 0.5s"
                          >
                            +0.5s
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL TEXT & LRC EDITOR */}
          {activeTab === 'manual' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const mins = Math.floor(currentTime / 60);
                    const secs = Math.floor(currentTime % 60);
                    const ms = Math.floor((currentTime % 1) * 100);
                    const stamp = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}] `;
                    setLyricsText((prev) => (prev ? `${prev}\n${stamp}` : stamp));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-[#F27D26]" />
                  Cap Detik Ini ({Math.floor(currentTime)}s)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseLyrics(lyricsText, duration || track.duration || 180);
                    setLyricsText(formatLrc(parsed));
                    setSyncLines(parsed);
                    setStatusMessage({ type: 'success', text: 'Semua baris diformat ke LRC.' });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-cyan-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  Format ke LRC
                </button>

                <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  Impor File .LRC
                  <input
                    type="file"
                    accept=".lrc,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const content = ev.target?.result as string;
                        if (content) {
                          setLyricsText(content);
                          setSyncLines(parseLyrics(content, duration || track.duration || 180));
                        }
                      };
                      reader.readAsText(file);
                    }}
                    className="hidden"
                  />
                </label>

                {lyricsText && (
                  <button
                    type="button"
                    onClick={handleDownloadLrc}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                    title="Simpan file .lrc ke HP"
                  >
                    <Download className="w-3.5 h-3.5 text-[#F27D26]" />
                    Unduh .LRC
                  </button>
                )}

                {lyricsText && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Kosongkan lirik?')) {
                        setLyricsText('');
                        setSyncLines([]);
                      }
                    }}
                    className="ml-auto p-1.5 text-white/40 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <textarea
                value={lyricsText}
                onChange={(e) => {
                  setLyricsText(e.target.value);
                  const parsed = parseLyrics(e.target.value, duration || track.duration || 180);
                  setSyncLines(parsed);
                }}
                placeholder="[00:12.50] Tulis atau tempel format LRC di sini..."
                rows={11}
                className="w-full p-3.5 rounded-2xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#F27D26] leading-relaxed resize-none transition-colors"
              />
            </div>
          )}

          {/* TAB 3: AI GENERATOR */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F27D26]/10 to-transparent border border-[#F27D26]/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  <Sparkles className="w-4 h-4 text-[#F27D26]" />
                  Tulis Lirik Otomatis dengan AI
                </div>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  Jika Anda ingin AI membantu menyusun lirik berdasarkan judul dan tema lagu Anda.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-white/70 mb-1.5">
                  Tema / Cerita Lagu Anda:
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Contoh: Tentang perjalanan hidup, bahasa Indonesia, akustik menyentuh..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#F27D26] transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={handleAutoGenerate}
                disabled={isGenerating}
                className="w-full py-3 px-4 rounded-2xl bg-[#F27D26] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F27D26]/20 transition-all disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Sedang Menyusun Lirik...' : 'Generate Lirik AI Sekarang'}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold transition-colors"
            >
              Tutup
            </button>
            {lyricsText && (
              <button
                type="button"
                onClick={handleDownloadLrc}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#F27D26]" />
                Simpan .LRC
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F27D26] to-[#d65d07] hover:brightness-110 active:scale-[0.98] text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#F27D26]/25 transition-all"
          >
            <Save className="w-4 h-4" />
            Sematkan ke Lagu Sekarang
          </button>
        </div>
      </div>
    </div>
  );
};
