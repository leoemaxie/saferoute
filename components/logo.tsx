import React from 'react';

interface LogoIconProps {
  className?: string;
  size?: number;
}

export function LogoIcon({ className = 'h-5 w-5', size = 20 }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sr-logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="17.51%" stopColor="#5b63d3" />
          <stop offset="100%" stopColor="#98a4f7" />
        </linearGradient>
      </defs>

      {/* Hex-shield hairline container representing deterministic verification */}
      <polygon
        points="12,2 20.5,6.5 20.5,17.5 12,22 3.5,17.5 3.5,6.5"
        stroke="#939db8"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeOpacity="0.8"
      />

      {/* Verification pulse arc */}
      <path
        d="M8.5 12.5C9.2 10.5 10.8 9.5 12 9.5"
        stroke="#646e87"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="1.5 1.5"
      />

      {/* Primary route vector path */}
      <path
        d="M7.5 18L12 13.5V9.5"
        stroke="#939db8"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Active verified signal heading with periwinkle gradient */}
      <path
        d="M12 9.5L16.5 5.5"
        stroke="url(#sr-logo-gradient)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Signal endpoint node */}
      <circle cx="16.5" cy="5.5" r="1.5" fill="#98a4f7" />
      {/* Evidence anchor node */}
      <circle cx="12" cy="9.5" r="1.2" fill="#ffffff" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  iconClassName?: string;
  size?: number;
  showWordmark?: boolean;
}

export function Logo({
  className = 'flex items-center gap-2.5',
  iconClassName = 'h-5 w-5',
  size = 20,
  showWordmark = true,
}: LogoProps) {
  return (
    <div className={className}>
      <LogoIcon className={iconClassName} size={size} />
      {showWordmark && (
        <span className="font-display text-[16px] font-medium tracking-[-0.01em] text-pure-white">
          Safe<span className="text-periwinkle-glow">Route</span>
        </span>
      )}
    </div>
  );
}
