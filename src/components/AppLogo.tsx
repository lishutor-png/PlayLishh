interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact' | 'icon-only';
  isPlaying?: boolean;
  className?: string;
  onClick?: () => void;
}

export function AppLogo({
  size = 'md',
  variant = 'full',
  isPlaying = false,
  className = '',
  onClick,
}: AppLogoProps) {
  // Dimension tokens
  const sizeConfig = {
    sm: {
      box: 'w-7 h-7',
      playIcon: 'w-3.5 h-3.5',
      title: 'text-sm',
      badge: 'text-[8px] px-1 py-0.2',
      gap: 'gap-2',
    },
    md: {
      box: 'w-9 h-9',
      playIcon: 'w-4 h-4',
      title: 'text-base',
      badge: 'text-[9px] px-1.5 py-0.5',
      gap: 'gap-2.5',
    },
    lg: {
      box: 'w-12 h-12',
      playIcon: 'w-6 h-6',
      title: 'text-xl',
      badge: 'text-[10px] px-2 py-0.5',
      gap: 'gap-3',
    },
    xl: {
      box: 'w-16 h-16',
      playIcon: 'w-8 h-8',
      title: 'text-2xl',
      badge: 'text-[11px] px-2.5 py-0.5',
      gap: 'gap-3.5',
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${config.gap} ${
        onClick ? 'cursor-pointer group' : ''
      } select-none ${className}`}
      role={onClick ? 'button' : undefined}
      aria-label="PlayLish Logo"
    >
      {/* Elegant Play Icon Emblem */}
      <div
        className={`relative ${config.box} rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[#F27D26]/20 transition-all duration-300 ${
          onClick ? 'group-hover:scale-105 group-hover:shadow-[#F27D26]/40' : ''
        }`}
        style={{
          background: 'linear-gradient(135deg, #FF9544 0%, #F27D26 50%, #C85408 100%)',
        }}
      >
        {/* Soft Glass Layer & Border */}
        <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/25 via-transparent to-black/30 pointer-events-none" />

        {/* Ambient Ring / Pulse when Playing */}
        {isPlaying && (
          <div className="absolute -inset-1 rounded-2xl bg-[#F27D26]/40 animate-ping pointer-events-none" />
        )}

        {/* Precision Play Button Triangle */}
        <svg
          viewBox="0 0 24 24"
          className={`${config.playIcon} text-white drop-shadow-md fill-white translate-x-[1px]`}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
        >
          <path d="M7 4.5V19.5C7 20.3 7.85 20.8 8.55 20.4L20.5 12.9C21.15 12.5 21.15 11.5 20.5 11.1L8.55 3.6C7.85 3.2 7 3.7 7 4.5Z" />
        </svg>

        {/* Subtle Wave Accents on the right */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-[1.5px] opacity-40 group-hover:opacity-70 transition-opacity">
          <span
            className={`w-[2px] bg-white rounded-full transition-all ${
              isPlaying ? 'h-3 animate-pulse' : 'h-1.5'
            }`}
          />
          <span
            className={`w-[2px] bg-white rounded-full transition-all ${
              isPlaying ? 'h-4 animate-pulse delay-75' : 'h-2.5'
            }`}
          />
        </div>
      </div>

      {/* Brand Text (Hidden if icon-only) */}
      {variant !== 'icon-only' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`${config.title} font-extrabold tracking-tight text-white flex items-center`}>
              <span>Play</span>
              <span className="text-[#F27D26] ml-[1px]">Lish</span>
            </span>

            {variant === 'full' && (
              <span
                className={`${config.badge} font-mono font-bold uppercase rounded-md bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30 tracking-wider shadow-sm`}
              >
                Hi-Res
              </span>
            )}
          </div>

          {variant === 'full' && size !== 'sm' && (
            <span className="text-[10px] text-white/50 tracking-tight font-medium -mt-0.5">
              Lossless Master Audio Player
            </span>
          )}
        </div>
      )}
    </div>
  );
}
