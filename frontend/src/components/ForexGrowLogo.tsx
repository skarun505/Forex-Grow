import React from 'react';

export interface ForexGrowLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  variant?: 'trader' | 'admin' | 'manager' | 'login';
  className?: string;
  badgeText?: string;
  subtitle?: string;
}

export const ForexGrowLogo: React.FC<ForexGrowLogoProps> = ({
  size = 'md',
  showText = true,
  variant = 'trader',
  className = '',
  badgeText,
  subtitle,
}) => {
  // Determine pixel size for icon
  let iconPx = 36;
  let textScale = 'text-sm sm:text-base';
  if (size === 'xs') {
    iconPx = 24;
    textScale = 'text-xs';
  } else if (size === 'sm') {
    iconPx = 30;
    textScale = 'text-xs sm:text-sm';
  } else if (size === 'md') {
    iconPx = 36;
    textScale = 'text-sm sm:text-base';
  } else if (size === 'lg') {
    iconPx = 44;
    textScale = 'text-base sm:text-lg';
  } else if (size === 'xl') {
    iconPx = 56;
    textScale = 'text-xl sm:text-2xl';
  } else if (typeof size === 'number') {
    iconPx = size;
  }

  // Accent colors per role
  const isManager = variant === 'manager';
  const isAdmin = variant === 'admin';

  const defaultBadge = isAdmin ? 'ROOT' : isManager ? 'OPERATIONS' : 'PRO';
  const activeBadge = badgeText || defaultBadge;

  const badgeClasses = isAdmin
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : isManager
    ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

  const gradId = `fgGrad_${variant}_${iconPx}`;
  const glowId = `fgGlow_${variant}_${iconPx}`;

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* Dynamic Vector Icon */}
      <div
        style={{ width: iconPx, height: iconPx }}
        className="shrink-0 relative transition-transform hover:scale-105"
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
              {isAdmin ? (
                <>
                  <stop offset="0%" stopColor="#D97706" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#FCD34D" />
                </>
              ) : isManager ? (
                <>
                  <stop offset="0%" stopColor="#0284C7" />
                  <stop offset="50%" stopColor="#0EA5E9" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#00C853" />
                  <stop offset="50%" stopColor="#00E676" />
                  <stop offset="100%" stopColor="#00F5D4" />
                </>
              )}
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Squircle Plate */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="24"
            fill="#121722"
            stroke={`url(#${gradId})`}
            strokeWidth="2.5"
            strokeOpacity="0.45"
          />

          {/* Ambient Glow */}
          <circle
            cx="58"
            cy="44"
            r="26"
            fill={isAdmin ? '#F59E0B' : isManager ? '#0EA5E9' : '#00E676'}
            opacity="0.15"
            filter={`url(#${glowId})`}
          />

          {/* Candlestick 1 */}
          <line
            x1="28"
            y1="46"
            x2="28"
            y2="70"
            stroke={`url(#${gradId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <rect
            x="24"
            y="52"
            width="8"
            height="14"
            rx="2"
            fill={`url(#${gradId})`}
            opacity="0.85"
          />

          {/* Candlestick 2 */}
          <line
            x1="46"
            y1="32"
            x2="46"
            y2="66"
            stroke={`url(#${gradId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <rect
            x="42"
            y="38"
            width="8"
            height="22"
            rx="2"
            fill={`url(#${gradId})`}
          />

          {/* Candlestick 3 (High Alpha) */}
          <line
            x1="64"
            y1="20"
            x2="64"
            y2="58"
            stroke={isAdmin ? '#FCD34D' : isManager ? '#38BDF8' : '#00F5D4'}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <rect
            x="60"
            y="26"
            width="8"
            height="26"
            rx="2"
            fill={`url(#${gradId})`}
            filter={`url(#${glowId})`}
          />

          {/* Upward Growth Trend Arrow */}
          <path
            d="M 18 68 Q 42 60 72 24"
            fill="none"
            stroke={isAdmin ? '#FCD34D' : isManager ? '#38BDF8' : '#00F5D4'}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points="72,24 61,26 69,34"
            fill={isAdmin ? '#FCD34D' : isManager ? '#38BDF8' : '#00F5D4'}
          />
        </svg>
      </div>

      {/* Typography Brandmark */}
      {showText && (
        <div className="leading-tight">
          <div className={`font-black tracking-wide flex items-center space-x-1.5 whitespace-nowrap text-white ${textScale}`}>
            <span>FOREX GROW</span>
            <span
              className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${badgeClasses}`}
            >
              {activeBadge}
            </span>
          </div>
          {subtitle && (
            <div className="text-[9px] sm:text-[10px] text-gray-400 font-medium truncate max-w-[210px] sm:max-w-none">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
