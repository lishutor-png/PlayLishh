import { useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  Zap,
  Sliders,
  Moon,
  ListMusic,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Info,
  Disc,
  RotateCcw,
  Edit3,
  HardDrive,
} from 'lucide-react';
import { AudioTrack, AudioSettings, SleepTimerConfig, PlaybackSource } from '../types';
import { VisualizerCanvas } from './VisualizerCanvas';
import { SyncedLyricsView } from './SyncedLyricsView';
import { LyricEditorModal } from './LyricEditorModal';
import { audioEngine } from '../services/audioEngine';
import { AppLogo } from './AppLogo';

interface NowPlayingFullProps {
  track: AudioTrack;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  settings: AudioSettings;
  sleepTimer: SleepTimerConfig;
  queue: AudioTrack[];
  playbackSource?: PlaybackSource;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onToggleFavorite: (trackId: string) => void;
  onToggleShuffle: () => void;
  onDisableShuffle?: () => void;
  onToggleRepeat: () => void;
  onUpdateSettings: (newSettings: Partial<AudioSettings>) => void;
  onClose: () => void;
  onOpenEqualizer: () => void;
  onOpenSleepTimer: () => void;
  onSelectTrackFromQueue: (track: AudioTrack) => void;
  onUpdateTrackLyrics?: (trackId: string, newLyrics: string) => Promise<void>;
}

export function NowPlayingFull({
  track,
  isPlaying,
  currentTime,
  duration,
  settings,
  sleepTimer,
  queue,
  playbackSource,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleFavorite,
  onToggleShuffle,
  onDisableShuffle,
  onToggleRepeat,
  onUpdateSettings,
  onClose,
  onOpenEqualizer,
  onOpenSleepTimer,
  onSelectTrackFromQueue,
  onUpdateTrackLyrics,
}: NowPlayingFullProps) {
  const [activeTab, setActiveTab] = useState<'player' | 'lyrics' | 'queue'>('player');
  const [showBoosterControl, setShowBoosterControl] = useState(false);
  const [isLyricModalOpen, setIsLyricModalOpen] = useState(false);

  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleVolumeChange = (newVol: number) => {
    // If safe volume limit is enforced, cap at safeVolumeLimit
    if (settings.safeVolumeEnforced && newVol > settings.safeVolumeLimit) {
      newVol = settings.safeVolumeLimit;
    }
    audioEngine.setVolume(newVol);
    onUpdateSettings({ volume: newVol });
  };

  const handleGainBoostChange = (val: number) => {
    audioEngine.setGainBoost(val);
    onUpdateSettings({ gainBoost: val });
  };

  const isSafeCapReached = settings.volume >= settings.safeVolumeLimit && settings.safeVolumeEnforced;

  return (
    <div
      id="now-playing-fullscreen"
      className="fixed inset-0 z-50 bg-[#050505] text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Background ambient color glow mesh */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 blur-3xl transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${track.colorHex || '#F27D26'} 0%, transparent 65%), radial-gradient(circle at 20% 80%, rgba(38, 100, 242, 0.15) 0%, transparent 55%)`,
        }}
      />

      {/* Top App Bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 z-10">
        <button
          onClick={onClose}
          className="p-2 rounded-2xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 cursor-pointer transition-all active:scale-95"
          title="Tutup Pemutar"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#F27D26] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-pulse" />
            Sedang Memutar
          </span>
          <span className="text-xs font-bold text-white/90 truncate max-w-[200px]">
            {track.album || 'PlayLish Hi-Res'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsLyricModalOpen(true)}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-[#F27D26] border border-white/10 cursor-pointer transition-all active:scale-95"
            title="Kelola & Sematkan Lirik Lagu"
          >
            <Sparkles className="w-4 h-4 text-[#F27D26]" />
          </button>
          <button
            onClick={onOpenEqualizer}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-[#F27D26] border border-white/10 cursor-pointer transition-all active:scale-95"
            title="Buka Equalizer"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSleepTimer}
            className={`p-2 rounded-2xl border cursor-pointer transition-all active:scale-95 ${
              sleepTimer.active
                ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/40 shadow-sm'
                : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10'
            }`}
            title="Timer Tidur"
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center View Selector Tabs */}
      <div className="flex justify-center z-10 px-4">
        <div className="flex p-0.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('player')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'player'
                ? 'bg-[#F27D26] text-white shadow-md shadow-[#F27D26]/25'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Visual
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'lyrics'
                ? 'bg-[#F27D26] text-white shadow-md shadow-[#F27D26]/25'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Lirik
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-[#F27D26] text-white shadow-md shadow-[#F27D26]/25'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Antrean ({queue.length})
          </button>
        </div>
      </div>

      {/* Main Center Content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-2 overflow-y-auto z-10 mx-auto w-full transition-all ${
          activeTab === 'lyrics' ? 'max-w-xl' : 'max-w-md'
        }`}
      >
        {/* TAB 1: VISUAL & ALBUM ART */}
        {activeTab === 'player' && (
          <div className="w-full flex flex-col items-center gap-3.5 animate-in fade-in">
            {/* Album Cover with Vinyl / Art Glow Effect */}
            <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-[32px] overflow-hidden shadow-2xl border border-white/20 group">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    isPlaying ? 'scale-105' : 'scale-100'
                  }`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-[#0d0d0f] flex items-center justify-center p-6">
                  <div className="w-40 h-40 flex items-center justify-center">
                    <AppLogo size="xl" variant="icon-only" isPlaying={isPlaying} />
                  </div>
                </div>
              )}

              {/* Hi-Res Lossless Tag in corner */}
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-[#F27D26]/40 text-[10px] font-mono font-bold text-[#F27D26] flex items-center gap-1 shadow">
                <Sparkles className="w-3 h-3 text-[#F27D26]" />
                {track.format} {track.bitDepth ? `${track.bitDepth}-bit` : ''}
              </div>

              {/* Sample rate tag in corner */}
              {track.sampleRate && (
                <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[10px] font-mono text-white/70 shadow">
                  {track.sampleRate >= 1000 ? `${track.sampleRate / 1000}kHz` : `${track.sampleRate}Hz`}
                </div>
              )}
            </div>

            {/* Audio Spectrum Visualizer */}
            <div className="w-full">
              <VisualizerCanvas
                isPlaying={isPlaying}
                color={track.colorHex || '#F27D26'}
                height={46}
                mode="bars"
              />
            </div>

            {/* LIRIK BERJALAN DI BAWAH TAMPILAN LAGU (Karaoke Ticker) */}
            <div className="w-full">
              <SyncedLyricsView
                mode="ticker"
                rawLyrics={track.lyrics}
                currentTime={currentTime}
                duration={duration || track.duration}
                onOpenEditor={() => setIsLyricModalOpen(true)}
                onSeek={onSeek}
                trackTitle={track.title}
              />
            </div>
          </div>
        )}

        {/* TAB 2: FULL SYNCHRONIZED LYRICS */}
        {activeTab === 'lyrics' && (
          <div className="w-full h-full flex flex-col justify-center animate-in fade-in">
            <SyncedLyricsView
              mode="full"
              rawLyrics={track.lyrics}
              currentTime={currentTime}
              duration={duration || track.duration}
              onOpenEditor={() => setIsLyricModalOpen(true)}
              onSeek={onSeek}
              trackTitle={track.title}
              className="h-[360px] sm:h-[420px] md:h-[460px]"
            />
          </div>
        )}

        {/* TAB 3: QUEUE */}
        {activeTab === 'queue' && (
          <div className="w-full h-64 overflow-y-auto space-y-2 pr-1">
            {/* Queue Source & Shuffle Header Toolbar */}
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-white/50">
                    {playbackSource?.type === 'playlist' ? `Playlist: ${playbackSource.title}` : 'Koleksi Musik'}
                  </div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                    {settings.shuffle ? (
                      <span className="text-[#F27D26] flex items-center gap-1">
                        <Shuffle className="w-3.5 h-3.5" /> Urutan Acak Aktif ({queue.length} Lagu)
                      </span>
                    ) : (
                      <span>Urutan Normal ({queue.length} Lagu)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {settings.shuffle && onDisableShuffle && (
                    <button
                      id="queue-btn-stop-shuffle"
                      onClick={onDisableShuffle}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                      title="Hentikan Mode Acak dan Kembalikan Urutan Asli"
                    >
                      <RotateCcw className="w-3 h-3 text-rose-400" />
                      <span>Hentikan Acak</span>
                    </button>
                  )}

                  <button
                    onClick={onToggleShuffle}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 border border-white/15 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title={settings.shuffle ? 'Hentikan Putar Acak' : 'Acak Antrean Lagu'}
                  >
                    <Shuffle className="w-3 h-3 text-[#F27D26]" />
                    <span>{settings.shuffle ? 'Matikan Acak' : 'Acak Antrean'}</span>
                  </button>
                </div>
              </div>
            </div>

            {queue.map((t, idx) => {
              const isCurr = t.id === track.id;
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTrackFromQueue(t)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                    isCurr
                      ? 'bg-[#F27D26]/20 border border-[#F27D26]/50 text-white font-medium shadow-[0_0_12px_rgba(242,125,38,0.2)]'
                      : 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] text-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-[10px] font-mono w-6 text-center shrink-0 ${
                        settings.shuffle
                          ? 'text-[#F27D26] font-bold bg-[#F27D26]/10 rounded px-1'
                          : 'text-white/40'
                      }`}
                    >
                      {settings.shuffle ? `🎲${idx + 1}` : idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate">{t.title}</div>
                      <div className="text-[10px] text-white/50 truncate">{t.artist}</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70 shrink-0">
                    {t.format}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Song Info & Favorite */}
        <div className="w-full flex items-center justify-between mt-3 px-1">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white truncate tracking-tight">{track.title}</h2>
            <p className="text-xs text-white/50 truncate mt-0.5">
              {track.artist} • {track.album}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-white/45 truncate">
              {(track.filePath || track.fileName) && (
                <span
                  className="truncate flex items-center gap-1 font-mono text-white/40 max-w-[180px] sm:max-w-[240px]"
                  title={`Lokasi berkas: ${track.filePath || track.fileName}`}
                >
                  <HardDrive className="w-3 h-3 text-white/30 shrink-0" />
                  <span className="truncate">{track.filePath || track.fileName}</span>
                </span>
              )}
              {track.hasMatchedLrc || track.lyrics ? (
                <span
                  className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30 shrink-0"
                  title={
                    track.lrcFileName
                      ? `Lirik otomatis dari: ${track.lrcFileName}`
                      : 'Lirik lagu tersinkronisasi'
                  }
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>.LRC Terhubung</span>
                </span>
              ) : null}
            </div>
          </div>
          <button
            onClick={() => onToggleFavorite(track.id)}
            className="p-2.5 rounded-full hover:bg-white/10 text-white/50 hover:text-rose-400 cursor-pointer transition-colors"
          >
            <Heart
              className={`w-6 h-6 ${
                track.isFavorite ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="w-full max-w-md mx-auto px-6 pb-6 pt-2 z-10 space-y-4">
        {/* Progress Bar & Scrubber */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F27D26] hover:h-2 transition-all"
          />
          <div className="flex justify-between text-[11px] font-mono text-white/40 px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Transport Buttons */}
        <div className="flex items-center justify-between px-2">
          <button
            id="btn-transport-shuffle"
            onClick={onToggleShuffle}
            className={`relative p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-95 ${
              settings.shuffle
                ? 'text-[#F27D26] bg-[#F27D26]/20 border-[#F27D26]/50 shadow-md shadow-[#F27D26]/20 ring-1 ring-[#F27D26]/40'
                : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
            }`}
            title={settings.shuffle ? 'Putar Acak Aktif (Klik untuk Hentikan)' : 'Aktifkan Putar Acak'}
          >
            <Shuffle className="w-5 h-5" />
            {settings.shuffle && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#F27D26] shadow-[0_0_8px_#F27D26]" />
            )}
          </button>

          <button
            id="fullscreen-prev-btn"
            onClick={onPrev}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 cursor-pointer transition-all active:scale-90"
            title="Lagu Sebelumnya"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          {/* Big Elegant Play/Pause Button with Multi-layer Glow */}
          <button
            id="fullscreen-play-pause-btn"
            onClick={onTogglePlay}
            className="relative w-18 h-18 rounded-3xl flex items-center justify-center cursor-pointer shadow-2xl transition-all active:scale-95 group"
            style={{
              background: 'linear-gradient(135deg, #FF9B4E 0%, #F27D26 50%, #C34F04 100%)',
              boxShadow: '0 0 35px rgba(242, 125, 38, 0.45), 0 10px 25px rgba(0,0,0,0.5)',
            }}
            title={isPlaying ? 'Jeda' : 'Putar'}
          >
            {/* Top glass highlight */}
            <div className="absolute inset-[1.5px] rounded-[22px] bg-gradient-to-b from-white/30 via-transparent to-black/25 pointer-events-none" />

            {isPlaying ? (
              <Pause className="w-7 h-7 fill-white text-white drop-shadow-md relative z-10" />
            ) : (
              <Play className="w-7 h-7 fill-white text-white drop-shadow-md translate-x-0.5 relative z-10" />
            )}
          </button>

          <button
            id="fullscreen-next-btn"
            onClick={onNext}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 cursor-pointer transition-all active:scale-90"
            title="Lagu Berikutnya"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>

          <button
            id="fullscreen-repeat-btn"
            onClick={onToggleRepeat}
            className={`relative p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-95 ${
              settings.repeatMode !== 'off'
                ? 'text-[#F27D26] bg-[#F27D26]/20 border-[#F27D26]/50 shadow-md shadow-[#F27D26]/20 ring-1 ring-[#F27D26]/40'
                : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
            }`}
            title={`Ulangi: ${
              settings.repeatMode === 'off'
                ? 'Mati'
                : settings.repeatMode === 'all'
                ? 'Semua Lagu'
                : 'Satu Lagu'
            }`}
          >
            {settings.repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
            {settings.repeatMode !== 'off' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#F27D26] shadow-[0_0_8px_#F27D26]" />
            )}
          </button>
        </div>

        {/* Volume & Safe Limiter Bar */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => handleVolumeChange(settings.volume > 0 ? 0 : 0.7)}
            className="text-white/50 hover:text-white cursor-pointer"
          >
            {settings.volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
            />
            {/* Safe limit mark line on slider */}
            {settings.safeVolumeEnforced && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-[2px] h-4 bg-red-500 rounded-full pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.9)]"
                style={{ left: `${settings.safeVolumeLimit * 100}%` }}
                title="Batas Aman Telinga (Safety Limit)"
              />
            )}
          </div>

          <div className="flex items-center gap-1 font-mono text-[10px] text-white/50">
            <span>{Math.round(settings.volume * 100)}%</span>
            {isSafeCapReached && (
              <span
                className="text-[#F27D26] text-[9px] bg-[#F27D26]/10 px-1 py-0.2 rounded border border-[#F27D26]/30"
                title="Batas aman aktif"
              >
                Aman
              </span>
            )}
          </div>

          {/* Quick Gain Booster Toggle */}
          <button
            onClick={() => setShowBoosterControl(!showBoosterControl)}
            className={`p-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              settings.gainBoost > 1.05
                ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/40'
                : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
            }`}
            title="Penguat Gain Suara Lagu Lemah"
          >
            <Zap className="w-3.5 h-3.5" />
            +{Math.round((settings.gainBoost - 1) * 10)}dB
          </button>
        </div>

        {/* Expandable Gain Booster Slider */}
        {showBoosterControl && (
          <div className="p-3 bg-white/[0.04] border border-[#F27D26]/30 rounded-xl space-y-2 backdrop-blur-xl animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#F27D26] font-semibold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#F27D26]" />
                Penguat Volume Lagu (Gain Boost)
              </span>
              <span className="font-mono text-[#F27D26] font-bold">
                +{Math.round((settings.gainBoost - 1) * 10)}dB
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.05"
              value={settings.gainBoost}
              onChange={(e) => handleGainBoostChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
            />
            <p className="text-[10px] text-white/40">
              Gunakan jika rekaman lagu aslinya terlalu kecil atau pelan.
            </p>
          </div>
        )}
      </div>

      {/* Lyric Editor & AI Auto-Lyrics Modal */}
      {isLyricModalOpen && (
        <LyricEditorModal
          track={track}
          currentTime={currentTime}
          duration={duration || track.duration}
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          isOpen={isLyricModalOpen}
          onClose={() => setIsLyricModalOpen(false)}
          onSaveLyrics={async (trackId, newLyrics) => {
            if (onUpdateTrackLyrics) {
              await onUpdateTrackLyrics(trackId, newLyrics);
            }
          }}
        />
      )}
    </div>
  );
}
