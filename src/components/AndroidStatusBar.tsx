import { useState, useEffect } from 'react';
import { ShieldCheck, Moon, WifiOff, Volume2, ShieldAlert } from 'lucide-react';
import { SleepTimerConfig, AudioSettings } from '../types';
import { AppLogo } from './AppLogo';

interface AndroidStatusBarProps {
  sleepTimer: SleepTimerConfig;
  settings: AudioSettings;
  isOffline: boolean;
  onOpenTimer: () => void;
  onOpenSettings: () => void;
}

export function AndroidStatusBar({
  sleepTimer,
  settings,
  isOffline,
  onOpenTimer,
  onOpenSettings,
}: AndroidStatusBarProps) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isVolumeExceedingSafe = settings.volume > settings.safeVolumeLimit;

  return (
    <div className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-white/50 border-b border-white/10 bg-[#0B0B0B]/90 backdrop-blur-2xl sticky top-0 z-30 select-none">
      {/* Left: Time & App Brand Logo with Play Button */}
      <div className="flex items-center gap-2.5 font-medium tracking-tight text-white/90">
        <span className="font-semibold text-white/80 font-mono text-xs">{timeStr || '12:00'}</span>
        <div className="h-3 w-[1px] bg-white/20" />
        <AppLogo size="sm" variant="compact" />
      </div>

      {/* Right: Badges and status indicators */}
      <div className="flex items-center gap-1.5">
        {/* Offline Badge */}
        {isOffline && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {/* Sleep Timer Indicator */}
        {sleepTimer.active && (
          <button
            onClick={onOpenTimer}
            className="flex items-center gap-1 text-[10px] font-mono text-[#F27D26] bg-[#F27D26]/15 px-2 py-0.5 rounded-full border border-[#F27D26]/30 animate-pulse cursor-pointer hover:bg-[#F27D26]/25 transition-colors"
            title="Timer Tidur Aktif"
          >
            <Moon className="w-3 h-3 text-[#F27D26]" />
            <span>{formatTimer(sleepTimer.remainingSeconds)}</span>
          </button>
        )}

        {/* Safe Hearing Volume Badge */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
            isVolumeExceedingSafe && !settings.safeVolumeEnforced
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              : settings.safeVolumeEnforced
              ? 'bg-[#F27D26]/10 text-[#F27D26] border-[#F27D26]/25 hover:bg-[#F27D26]/20'
              : 'bg-white/5 text-white/40 border-white/10'
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
            {settings.safeVolumeEnforced ? 'Aman' : 'Vol Bebas'}
          </span>
          <span className="font-mono text-[9px] opacity-80">
            {Math.round(settings.volume * 100)}%
          </span>
        </button>

        {/* Booster active indicator */}
        {settings.gainBoost > 1.05 && (
          <span className="text-[10px] font-mono font-bold text-[#F27D26] bg-[#F27D26]/10 px-1.5 py-0.5 rounded border border-[#F27D26]/20">
            +{Math.round((settings.gainBoost - 1) * 10)}dB Boost
          </span>
        )}
      </div>
    </div>
  );
}

