import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Volume2,
  Zap,
  Moon,
  Info,
  Sliders,
  CheckCircle2,
  HardDrive,
  Heart,
  RefreshCw,
  Shuffle,
  Repeat,
  Repeat1,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { AudioSettings, SleepTimerConfig } from '../types';
import { audioEngine } from '../services/audioEngine';
import { AppLogo } from './AppLogo';

interface SettingsViewProps {
  settings: AudioSettings;
  sleepTimer: SleepTimerConfig;
  onUpdateSettings: (newSettings: Partial<AudioSettings>) => void;
  onOpenSleepTimer: () => void;
  onResetAllSettings: () => void;
}

export function SettingsView({
  settings,
  sleepTimer,
  onUpdateSettings,
  onOpenSleepTimer,
  onResetAllSettings,
}: SettingsViewProps) {
  const [showConfirmOverride, setShowConfirmOverride] = useState(false);

  const handleSafeLimitChange = (val: number) => {
    const limit = val / 100;
    audioEngine.setSafeLimit(limit, settings.safeVolumeEnforced);
    onUpdateSettings({ safeVolumeLimit: limit });
  };

  const handleToggleEnforce = (enforced: boolean) => {
    if (!enforced) {
      setShowConfirmOverride(true);
    } else {
      audioEngine.setSafeLimit(settings.safeVolumeLimit, true);
      onUpdateSettings({ safeVolumeEnforced: true });
    }
  };

  const confirmDisableSafety = () => {
    audioEngine.setSafeLimit(settings.safeVolumeLimit, false);
    onUpdateSettings({ safeVolumeEnforced: false });
    setShowConfirmOverride(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 max-w-2xl mx-auto w-full pb-32">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
          Setelan & Proteksi Audio
        </h1>
        <p className="text-xs text-white/50">
          Atur batas keamanan telinga, penguat suara, dan preferensi PlayLish
        </p>
      </div>

      {/* Brand Identity Card with Official Play Logo */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent border border-white/10 shadow-xl backdrop-blur-2xl flex items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F27D26]/10 rounded-full blur-2xl pointer-events-none" />
        <AppLogo size="md" variant="full" />
        <div className="text-right text-[11px] text-white/50 font-mono relative z-10">
          <span className="px-2 py-0.5 rounded-full bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 font-semibold inline-block mb-1">
            Hi-Res Lossless
          </span>
          <span className="block text-white/40">v1.2.0 • Android Audio</span>
        </div>
      </div>

      {/* Auto-Save Persistence Status */}
      <div className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Pengaturan Tersimpan Otomatis</span>
        </div>
        <span className="text-[10px] text-emerald-300/70 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-lg">
          Tetap Tersimpan Saat Keluar
        </span>
      </div>

      {/* SECTION: PLAYBACK & QUEUE PREFERENCES */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl space-y-4 backdrop-blur-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Preferensi Pemutaran</h2>
            <p className="text-xs text-white/50">
              Mode pengulangan, putar acak, dan perilaku antrean tersimpan permanen
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-3 border-t border-white/10">
          {/* Repeat Mode Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 font-medium flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-[#F27D26]" />
                Mode Pengulangan (Repeat):
              </span>
              <span className="font-mono text-[11px] text-[#F27D26]">
                {settings.repeatMode === 'all'
                  ? 'Ulangi Semua Lagu'
                  : settings.repeatMode === 'one'
                  ? 'Ulangi 1 Lagu'
                  : 'Tidak Mengulang'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ repeatMode: 'all' })}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  settings.repeatMode === 'all'
                    ? 'bg-[#F27D26]/20 border-[#F27D26] text-[#F27D26] font-bold ring-1 ring-[#F27D26]/40'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                Semua
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ repeatMode: 'one' })}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  settings.repeatMode === 'one'
                    ? 'bg-[#F27D26]/20 border-[#F27D26] text-[#F27D26] font-bold ring-1 ring-[#F27D26]/40'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Repeat1 className="w-3.5 h-3.5" />
                1 Lagu
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ repeatMode: 'off' })}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  settings.repeatMode === 'off'
                    ? 'bg-white/20 border-white/40 text-white font-bold'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                Mati
              </button>
            </div>
          </div>

          {/* Shuffle Mode Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs">
              <Shuffle className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-white font-medium block">Putar Acak Lagu (Shuffle)</span>
                <span className="text-[11px] text-white/45 block">
                  Urutan lagu diacak secara otomatis saat mulai memutar
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ shuffle: !settings.shuffle })}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                settings.shuffle
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
            >
              {settings.shuffle ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: EAR SAFETY & MAX VOLUME LIMIT */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl space-y-4 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#F27D26]/15 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                Batas Volume Maksimal Aman
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F27D26]/20 text-[#F27D26] font-mono font-semibold">
                  WHO Standard
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Mencegah kerusakan telinga akibat volume berlebih saat memakai earphone/headphone
              </p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={settings.safeVolumeEnforced}
            onChange={(e) => handleToggleEnforce(e.target.checked)}
            className="w-5 h-5 accent-[#F27D26] rounded cursor-pointer"
          />
        </div>

        {/* Safe limit slider */}
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Ambang Batas Keamanan Telinga:</span>
            <span className="font-mono font-bold text-[#F27D26]">
              {Math.round(settings.safeVolumeLimit * 100)}% (~80 dB SPL)
            </span>
          </div>

          <input
            type="range"
            min="50"
            max="95"
            step="5"
            disabled={!settings.safeVolumeEnforced}
            value={Math.round(settings.safeVolumeLimit * 100)}
            onChange={(e) => handleSafeLimitChange(parseInt(e.target.value, 10))}
            className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F27D26] disabled:opacity-30"
          />

          <div className="flex justify-between text-[10px] font-mono text-white/40">
            <span>50% (Sangat Aman)</span>
            <span>80% (Standar Disarankan)</span>
            <span>95% (Keras)</span>
          </div>
        </div>

        {/* Warning if disabled */}
        {!settings.safeVolumeEnforced && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              Perhatian: Batas aman dimatikan. Mendengarkan di atas 85dB dalam waktu lama dapat merusak pendengaran.
            </span>
          </div>
        )}
      </div>

      {/* SECTION 2: VOLUME BOOSTER & PREAMP */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl space-y-4 backdrop-blur-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Penguat Volume Lagu (Gain Booster)
            </h2>
            <p className="text-xs text-white/50">
              Otomatis mendongkrak file audio dengan rekaman asli pelan
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Penguatan Gain Tambahan:</span>
            <span className="font-mono font-bold text-amber-400">
              +{Math.round((settings.gainBoost - 1) * 10)} dB ({Math.round(settings.gainBoost * 100)}%)
            </span>
          </div>

          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.05"
            value={settings.gainBoost}
            onChange={(e) => {
              const boost = parseFloat(e.target.value);
              audioEngine.setGainBoost(boost);
              onUpdateSettings({ gainBoost: boost });
            }}
            className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      </div>

      {/* SECTION 3: SLEEP TIMER SHORTCUT */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl flex items-center justify-between backdrop-blur-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Timer Tidur</h2>
            <p className="text-xs text-white/50">
              {sleepTimer.active
                ? `Aktif: ${Math.ceil(sleepTimer.remainingSeconds / 60)} menit tersisa`
                : 'Pilih durasi tidur dengan time picker'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSleepTimer}
          className="px-4 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 font-semibold text-xs border border-violet-500/40 cursor-pointer transition-colors"
        >
          {sleepTimer.active ? 'Kelola Timer' : 'Buka Timer'}
        </button>
      </div>

      {/* SECTION 4: APP SPECS & HI-RES CAPABILITIES */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl space-y-4 backdrop-blur-2xl">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider text-[10px]">
          <Info className="w-4 h-4 text-[#F27D26]" />
          Spesifikasi Audio PlayLish
        </div>
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-black/30 border border-white/5">
            <span className="text-[10px] text-white/40 uppercase font-mono block">Format Didukung</span>
            <span className="text-white font-semibold mt-0.5 block">FLAC, WAV, ALAC, AAC, MP3</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
            <span className="text-[10px] text-white/40 uppercase font-mono block">Resolusi Audio</span>
            <span className="text-[#F27D26] font-semibold mt-0.5 block">Hingga 24-bit / 96kHz</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
            <span className="text-[10px] text-white/40 uppercase font-mono block">Pemrosesan Suara</span>
            <span className="text-white font-semibold mt-0.5 block">Web Audio API Pipeline</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
            <span className="text-[10px] text-white/40 uppercase font-mono block">Penyimpanan</span>
            <span className="text-emerald-400 font-semibold mt-0.5 block">IndexedDB Offline Ready</span>
          </div>
        </div>
      </div>

      {/* Reset Defaults */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onResetAllSettings}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white py-2 px-3.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Kembalikan Pengaturan ke Standar
        </button>
      </div>

      {/* Safety Override Confirmation Modal */}
      {showConfirmOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0E0E0E] border border-rose-500/50 rounded-3xl p-6 shadow-2xl text-white space-y-4 backdrop-blur-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-sm">Nonaktifkan Batas Aman?</h3>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Mendengarkan audio pada volume maksimum tanpa pembatas dapat berisiko menyebabkan kelelahan telinga dan gangguan pendengaran permanen.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmOverride(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 border border-white/10"
              >
                Tetap Amankan
              </button>
              <button
                onClick={confirmDisableSafety}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
