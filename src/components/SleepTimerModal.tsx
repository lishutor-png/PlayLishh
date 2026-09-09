import { useState } from 'react';
import { Moon, Clock, X, Check, VolumeX, Sparkles, Plus, AlertCircle } from 'lucide-react';
import { SleepTimerConfig } from '../types';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sleepTimer: SleepTimerConfig;
  onStartTimer: (hours: number, minutes: number, autoFade: boolean) => void;
  onCancelTimer: () => void;
  onAddMinutes: (mins: number) => void;
}

export function SleepTimerModal({
  isOpen,
  onClose,
  sleepTimer,
  onStartTimer,
  onCancelTimer,
  onAddMinutes,
}: SleepTimerModalProps) {
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [autoFade, setAutoFade] = useState(true);

  if (!isOpen) return null;

  const quickPresets = [
    { label: '15 Mnt', h: 0, m: 15 },
    { label: '30 Mnt', h: 0, m: 30 },
    { label: '45 Mnt', h: 0, m: 45 },
    { label: '60 Mnt', h: 1, m: 0 },
    { label: '90 Mnt', h: 1, m: 30 },
    { label: '2 Jam', h: 2, m: 0 },
  ];

  const handleSetPreset = (h: number, m: number) => {
    setSelectedHours(h);
    setSelectedMinutes(m);
  };

  const handleStart = () => {
    onStartTimer(selectedHours, selectedMinutes, autoFade);
    onClose();
  };

  const formatTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs}j ${mins < 10 ? '0' : ''}${mins}m ${secs < 10 ? '0' : ''}${secs}d`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}d`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div
        id="sleep-timer-dialog"
        className="w-full max-w-md bg-[#0E0E0E] border border-white/15 rounded-3xl p-6 shadow-2xl text-white flex flex-col gap-5 backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/15 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white tracking-tight">Timer Tidur</h2>
              <p className="text-xs text-white/50">
                Otomatis menghentikan musik saat Anda tertidur
              </p>
            </div>
          </div>
          <button
            id="close-sleep-timer-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If Active: Show Countdown View */}
        {sleepTimer.active ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-[#F27D26]/5 border border-[#F27D26]/20 rounded-3xl backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[#F27D26] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Timer Sedang Berjalan
            </div>
            <div className="text-4xl font-mono font-bold tracking-tight text-[#F27D26] mb-2 drop-shadow-[0_0_20px_rgba(242,125,38,0.3)]">
              {formatTime(sleepTimer.remainingSeconds)}
            </div>
            <p className="text-xs text-white/50 max-w-xs mb-5">
              Musik akan meredup dan berhenti secara otomatis ketika waktu habis.
            </p>

            <div className="flex items-center gap-2.5 w-full">
              <button
                id="add-10min-btn"
                onClick={() => onAddMinutes(10)}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-white/10"
              >
                <Plus className="w-4 h-4 text-[#F27D26]" />
                +10 Menit
              </button>
              <button
                id="cancel-sleep-timer-btn"
                onClick={() => {
                  onCancelTimer();
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-xs font-medium text-rose-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-rose-500/30"
              >
                <VolumeX className="w-4 h-4" />
                Batalkan Timer
              </button>
            </div>
          </div>
        ) : (
          /* Time Picker Interface */
          <div className="flex flex-col gap-4">
            {/* Interactive Digital Time Picker */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs text-white/50 mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#F27D26]" /> Pilih Durasi (Jam : Menit)
              </span>

              <div className="flex items-center justify-center gap-4 my-2">
                {/* Hours Column */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-white/40 mb-1">Jam</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      id="timer-hour-minus"
                      onClick={() => setSelectedHours(Math.max(0, selectedHours - 1))}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center cursor-pointer border border-white/10"
                    >
                      -
                    </button>
                    <div className="w-16 h-14 bg-black/40 border border-[#F27D26]/40 rounded-2xl flex items-center justify-center text-2xl font-mono font-bold text-[#F27D26] shadow-inner">
                      {selectedHours < 10 ? `0${selectedHours}` : selectedHours}
                    </div>
                    <button
                      id="timer-hour-plus"
                      onClick={() => setSelectedHours(Math.min(12, selectedHours + 1))}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center cursor-pointer border border-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>

                <span className="text-2xl font-bold text-white/30 mt-4">:</span>

                {/* Minutes Column */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-white/40 mb-1">Menit</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      id="timer-min-minus"
                      onClick={() => setSelectedMinutes(Math.max(0, selectedMinutes - 5))}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center cursor-pointer border border-white/10"
                    >
                      -
                    </button>
                    <div className="w-16 h-14 bg-black/40 border border-[#F27D26]/40 rounded-2xl flex items-center justify-center text-2xl font-mono font-bold text-[#F27D26] shadow-inner">
                      {selectedMinutes < 10 ? `0${selectedMinutes}` : selectedMinutes}
                    </div>
                    <button
                      id="timer-min-plus"
                      onClick={() => setSelectedMinutes(Math.min(55, selectedMinutes + 5))}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center cursor-pointer border border-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {selectedHours === 0 && selectedMinutes === 0 && (
                <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Pilih minimal 5 menit
                </div>
              )}
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <div className="text-xs text-white/50 mb-2 font-medium">Pilihan Cepat:</div>
              <div className="grid grid-cols-3 gap-2">
                {quickPresets.map((preset) => {
                  const isSelected =
                    selectedHours === preset.h && selectedMinutes === preset.m;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => handleSetPreset(preset.h, preset.m)}
                      className={`py-2 px-3 rounded-2xl text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/60 shadow-[0_0_12px_rgba(242,125,38,0.25)]'
                          : 'bg-white/[0.03] text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Fade Out Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">
                  Peredupan Halus (Fade-Out)
                </span>
                <span className="text-[11px] text-white/40">
                  Volume mengecil perlahan di 30 detik terakhir
                </span>
              </div>
              <input
                type="checkbox"
                id="timer-fade-toggle"
                checked={autoFade}
                onChange={(e) => setAutoFade(e.target.checked)}
                className="w-4 h-4 accent-[#F27D26] cursor-pointer rounded"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium cursor-pointer transition-colors border border-white/10"
              >
                Batal
              </button>
              <button
                id="start-timer-btn"
                disabled={selectedHours === 0 && selectedMinutes === 0}
                onClick={handleStart}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-[#F27D26] hover:bg-[#ff8a3d] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F27D26]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Check className="w-4 h-4" />
                Mulai Timer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
