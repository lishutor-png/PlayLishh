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
      discSize: 'w-7 h-7',
      playIcon: 'w-3.5 h-3.5',
      title: 'text-sm',
      badge: 'text-[8px] px-1 py-0.2',
      gap: 'gap-2',
      barsH: ['h-2', 'h-3.5', 'h-2.5', 'h-4', 'h-1.5'],
    },
    md: {
      box: 'w-9 h-9',
      discSize: 'w-9 h-9',
      playIcon: 'w-4.5 h-4.5',
      title: 'text-base',
      badge: 'text-[9px] px-1.5 py-0.5',
      gap: 'gap-2.5',
      barsH: ['h-2.5', 'h-4.5', 'h-3', 'h-5', 'h-2'],
    },
    lg: {
      box: 'w-12 h-12',
      discSize: 'w-12 h-12',
      playIcon: 'w-6 h-6',
      title: 'text-xl',
      badge: 'text-[10px] px-2 py-0.5',
      gap: 'gap-3',
      barsH: ['h-3', 'h-6', 'h-4', 'h-7', 'h-2.5'],
    },
    xl: {
      box: 'w-16 h-16',
      discSize: 'w-16 h-16',
      playIcon: 'w-8 h-8',
      title: 'text-2xl',
      badge: 'text-[11px] px-2.5 py-0.5',
      gap: 'gap-3.5',
      barsH: ['h-4', 'h-8', 'h-5.5', 'h-9.5', 'h-3.5'],
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
      aria-label="PlayLish Music Player"
    >
      {/* Attractive Music Player Emblem (Vinyl Sound Groove + Note & Play Fusion) */}
      <div
        className={`relative ${config.box} rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
          onClick ? 'group-hover:scale-105' : ''
        }`}
      >
        {/* Ambient Halo & Sound Waves Glow when Playing */}
        <div
          className={`absolute -inset-1.5 rounded-2xl transition-opacity duration-500 pointer-events-none ${
            isPlaying
              ? 'bg-gradient-to-r from-[#FF7A00]/40 to-[#F27D26]/40 blur-md opacity-100 animate-pulse'
              : 'opacity-0'
          }`}
        />

        {/* Main Emblem Surface: Rich Tangerine-to-Amber Radial/Concentric Base */}
        <div
          className="w-full h-full rounded-2xl p-[1px] relative overflow-hidden shadow-xl shadow-[#F27D26]/25"
          style={{
            background: 'linear-gradient(135deg, #FFA947 0%, #F27D26 40%, #C44E04 80%, #751F00 100%)',
          }}
        >
          {/* Glass Bevel Lighting */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 via-transparent to-black/35 pointer-events-none" />

          {/* Concentric Vinyl Sound Grooves Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-[85%] h-[85%] rounded-full border border-white/50" />
            <div className="w-[60%] h-[60%] rounded-full border border-white/40 absolute" />
            <div className="w-[35%] h-[35%] rounded-full border border-white/30 absolute" />
          </div>

          {/* Center Content: Music Note + Play Symbol Iconography */}
          <div className="w-full h-full relative flex items-center justify-center">
            <svg
              viewBox="0 0 48 48"
              className="w-[70%] h-[70%] text-white drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Harmonic Note Stem & Beam that flows into the Play Triangle */}
              <defs>
                <linearGradient id="emblem-play-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#FFF2E5" />
                </linearGradient>
                <filter id="music-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Musical Eighth Note Flag & Arc */}
              <path
                d="M17 11C17 9.89543 17.8954 9 19 9H27C28.1046 9 29 9.89543 29 11V23.5"
                stroke="url(#emblem-play-grad)"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity="0.95"
              />
              <path
                d="M27 9C31 9 37 11.5 39 17C35 15.5 30 15 28.5 15"
                stroke="url(#emblem-play-grad)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />

              {/* Dynamic Triangular Playhead fused with musical note head */}
              <path
                d="M16 19.5V36.5C16 37.8 17.4 38.6 18.5 37.9L32.2 29.4C33.3 28.7 33.3 27.3 32.2 26.6L18.5 18.1C17.4 17.4 16 18.2 16 19.5Z"
                fill="url(#emblem-play-grad)"
                filter="url(#music-shadow)"
              />

              {/* Center Vinyl Spindle Accent */}
              <circle cx="21" cy="28" r="1.8" fill="#F27D26" />
            </svg>

            {/* Dynamic Equalizer Wave Bars on the right edge */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-end gap-[1.5px] pointer-events-none opacity-80">
              <span
                className={`w-[1.8px] bg-white rounded-full transition-all duration-300 ${
                  isPlaying ? 'h-3 animate-pulse' : 'h-1.5'
                }`}
              />
              <span
                className={`w-[1.8px] bg-white rounded-full transition-all duration-300 ${
                  isPlaying ? 'h-4.5 animate-bounce' : 'h-2.5'
                }`}
              />
              <span
                className={`w-[1.8px] bg-white rounded-full transition-all duration-300 ${
                  isPlaying ? 'h-3.5 animate-pulse delay-100' : 'h-1'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Brand Text (Hidden if icon-only) */}
      {variant !== 'icon-only' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`${config.title} font-black tracking-tight text-white flex items-center`}>
              <span>Play</span>
              <span className="text-[#F27D26] ml-[1px]">Lish</span>
            </span>

            {variant === 'full' && (
              <span
                className={`${config.badge} font-mono font-bold uppercase rounded-md bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30 tracking-wider shadow-sm flex items-center gap-1`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] inline-block animate-pulse" />
                Hi-Res
              </span>
            )}
          </div>

          {variant === 'full' && size !== 'sm' && (
            <span className="text-[10px] text-white/60 tracking-tight font-medium -mt-0.5 flex items-center gap-1">
              <span>Pemutar Musik Hi-Fi & Lossless</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
