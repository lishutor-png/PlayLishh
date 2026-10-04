import { ShieldCheck, Moon, Volume2, ShieldAlert, Zap } from 'lucide-react';
import { SleepTimerConfig, AudioSettings } from '../types';
import { AppLogo } from './AppLogo';

interface AndroidStatusBarProps {
  sleepTimer: SleepTimerConfig;
  settings: AudioSettings;
  onOpenTimer: () => void;
  onOpenSettings: () => void;
}

export function AndroidStatusBar({
  sleepTimer,
  settings,
  onOpenTimer,
  onOpenSettings,
}: AndroidStatusBarProps) {
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isVolumeExceedingSafe = settings.volume > settings.safeVolumeLimit;

  return (
    <header className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-white/50 border-b border-white/10 bg-[#0B0B0B]/95 backdrop-blur-2xl sticky top-0 z-30 select-none">
      {/* Left: App Brand Logo */}
      <div className="flex items-center gap-2 font-medium tracking-tight text-white/90">
        <AppLogo size="sm" variant="compact" />
      </div>

      {/* Right: Quick Action Pills (Sleep Timer, Volume Protection, Gain Boost) */}
      <div className="flex items-center gap-1.5">
        {/* 1-Tap Sleep Timer Button (Always Accessible) */}
        <button
          onClick={onOpenTimer}
          className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95 ${
            sleepTimer.active
              ? 'font-mono font-bold text-[#F27D26] bg-[#F27D26]/15 border-[#F27D26]/40 shadow-sm'
              : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
          }`}
          title="Atur Timer Tidur Otomatis"
        >
          <Moon className={`w-3 h-3 ${sleepTimer.active ? 'text-[#F27D26]' : 'text-violet-400'}`} />
          <span>
            {sleepTimer.active ? formatTimer(sleepTimer.remainingSeconds) : 'Timer'}
          </span>
        </button>

        {/* Safe Hearing Volume Badge */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95 ${
            isVolumeExceedingSafe && !settings.safeVolumeEnforced
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              : settings.safeVolumeEnforced
              ? 'bg-[#F27D26]/10 text-[#F27D26] border-[#F27D26]/25 hover:bg-[#F27D26]/20'
              : 'bg-white/5 text-white/50 border-white/10'
          }`}
          title="Status Proteksi Pendengaran Aman"
        >
          {settings.safeVolumeEnforced ? (
            <ShieldCheck className="w-3 h-3 text-[#F27D26]" />
          ) : isVolumeExceedingSafe ? (
            <ShieldAlert className="w-3 h-3 text-rose-400" />
          ) : (
            <Volume2 className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">
            {settings.safeVolumeEnforced ? 'Aman' : 'Vol'}
          </span>
          <span className="font-mono text-[10px] font-semibold">
            {Math.round(settings.volume * 100)}%
          </span>
        </button>

        {/* Booster active indicator */}
        {settings.gainBoost > 1.05 && (
          <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-1 rounded-full border border-amber-500/30">
            <Zap className="w-2.5 h-2.5" />
            +{Math.round((settings.gainBoost - 1) * 10)}dB
          </span>
        )}
      </div>
    </header>
  );
}
