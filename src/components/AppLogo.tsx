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
      title: 'text-sm',
      badge: 'text-[8px] px-1 py-0.2',
      gap: 'gap-2',
    },
    md: {
      box: 'w-9 h-9',
      title: 'text-base',
      badge: 'text-[9px] px-1.5 py-0.5',
      gap: 'gap-2.5',
    },
    lg: {
      box: 'w-12 h-12',
      title: 'text-xl',
      badge: 'text-[10px] px-2 py-0.5',
      gap: 'gap-3',
    },
    xl: {
      box: 'w-16 h-16',
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
      aria-label="PlayLish Music Player"
    >
      {/* Vinyl Record (Piringan Hitam) with Orange Play Button (Tombol Play Oranye) */}
      <div
        className={`relative ${config.box} flex items-center justify-center shrink-0 transition-transform duration-300 ${
          onClick ? 'group-hover:scale-105' : ''
        }`}
      >
        {/* Ambient Orange Glow when Playing */}
        <div
          className={`absolute -inset-1 rounded-full transition-opacity duration-500 pointer-events-none ${
            isPlaying
              ? 'bg-[#F27D26]/40 blur-md opacity-100 animate-pulse'
              : 'opacity-0'
          }`}
        />

        {/* The Vinyl Record Disc (Spins when isPlaying is true) */}
        <div
          className={`w-full h-full rounded-full transition-transform ${
            isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
          }`}
        >
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full drop-shadow-xl select-none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Vinyl Deep Black Body */}
              <radialGradient id={`vinyl-disc-base-${size}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1e1e23" />
                <stop offset="45%" stopColor="#0d0d10" />
                <stop offset="85%" stopColor="#151518" />
                <stop offset="100%" stopColor="#060608" />
              </radialGradient>

              {/* Vinyl Specular Reflection Sheen (Opposing Light Cones) */}
              <linearGradient id={`vinyl-sheen-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.0" />
                <stop offset="60%" stopColor="#ffffff" stopOpacity="0.0" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.18" />
              </linearGradient>

              {/* Orange Play Button Gradient */}
              <linearGradient id={`orange-play-btn-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFA03A" />
                <stop offset="45%" stopColor="#F27D26" />
                <stop offset="100%" stopColor="#C94E03" />
              </linearGradient>

              {/* Orange Button Glow Filter */}
              <filter id={`btn-glow-${size}`} x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F27D26" floodOpacity="0.5" />
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.6" />
              </filter>

              {/* Play Triangle Shadow */}
              <filter id={`play-shadow-${size}`} x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* 1. Main Black Vinyl Outer Disc */}
            <circle
              cx="60"
              cy="60"
              r="58"
              fill={`url(#vinyl-disc-base-${size})`}
              stroke="#2e2e36"
              strokeWidth="1.2"
            />

            {/* 2. Realistic Concentric Audio Grooves */}
            <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
            <circle cx="60" cy="60" r="50" stroke="rgba(0,0,0,0.7)" strokeWidth="0.9" />
            <circle cx="60" cy="60" r="47" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
            <circle cx="60" cy="60" r="43" stroke="rgba(0,0,0,0.6)" strokeWidth="0.8" />
            <circle cx="60" cy="60" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="0.7" />
            <circle cx="60" cy="60" r="36" stroke="rgba(0,0,0,0.7)" strokeWidth="0.8" />
            <circle cx="60" cy="60" r="33" stroke="rgba(255,255,255,0.07)" strokeWidth="0.7" />
            <circle cx="60" cy="60" r="29" stroke="rgba(0,0,0,0.8)" strokeWidth="0.9" />

            {/* 3. Dual Conical Light Sheen Across Disc */}
            <path
              d="M60 60 L18 18 A58 58 0 0 1 102 18 Z M60 60 L102 102 A58 58 0 0 1 18 102 Z"
              fill={`url(#vinyl-sheen-${size})`}
              opacity="0.8"
            />

            {/* 4. Inner Label Run-out Ring */}
            <circle cx="60" cy="60" r="26" fill="#121215" stroke="#25252b" strokeWidth="1.5" />
            <circle
              cx="60"
              cy="60"
              r="23.5"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.6"
              strokeDasharray="1 1.5"
            />

            {/* 5. Center Orange Play Button (Tombol Play Berwarna Oranye) */}
            <circle
              cx="60"
              cy="60"
              r="19"
              fill={`url(#orange-play-btn-${size})`}
              filter={`url(#btn-glow-${size})`}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.2"
            />

            {/* Inner Rim of Orange Play Button for 3D depth */}
            <circle cx="60" cy="60" r="16.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />

            {/* 6. Centered Crisp Play Symbol Triangle */}
            <path
              d="M55 49.5C55 48.5 56.1 47.9 57 48.5L71 58.5C71.8 59.1 71.8 60.3 71 60.9L57 70.9C56.1 71.5 55 70.9 55 69.9V49.5Z"
              fill="#FFFFFF"
              filter={`url(#play-shadow-${size})`}
            />

            {/* Subtle center point accent */}
            <circle cx="60" cy="60" r="1.2" fill="#C84F04" opacity="0.6" />
          </svg>
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
