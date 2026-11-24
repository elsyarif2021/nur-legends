import React from 'react';
import { HeroId } from '../types/game';

interface HeroAvatarProps {
  heroId: HeroId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  heroId,
  size = 'md',
  className = '',
}) => {
  const sizeClass =
    size === 'sm'
      ? 'w-10 h-10'
      : size === 'md'
      ? 'w-14 h-14'
      : size === 'lg'
      ? 'w-24 h-24'
      : 'w-52 h-52';

  const palettes: Record<HeroId, { bg1: string; bg2: string; cloak: string; trim: string; glow: string }> = {
    amin: { bg1: '#064e3b', bg2: '#0f172a', cloak: '#047857', trim: '#d4af37', glow: '#34d399' },
    faris: { bg1: '#78350f', bg2: '#0f172a', cloak: '#b45309', trim: '#fef3c7', glow: '#f59e0b' },
    hakim: { bg1: '#134e4a', bg2: '#0f172a', cloak: '#0f766e', trim: '#d4af37', glow: '#2dd4bf' },
    zahra: { bg1: '#065f46', bg2: '#0f172a', cloak: '#10b981', trim: '#fdfbf7', glow: '#6ee7b7' },
    zaid: { bg1: '#0c4a6e', bg2: '#0f172a', cloak: '#0369a1', trim: '#d4af37', glow: '#38bdf8' },
  };

  const p = palettes[heroId];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass} ${className}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-lg" aria-label={`Ilustrasi ${heroId}`}>
        <defs>
          <radialGradient id={`bg_${heroId}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor={p.bg1} />
            <stop offset="100%" stopColor={p.bg2} />
          </radialGradient>
        </defs>

        {/* Outer geometric frame */}
        <circle cx="60" cy="60" r="56" fill={`url(#bg_${heroId})`} stroke={p.trim} strokeWidth="2.5" />
        <circle cx="60" cy="60" r="50" fill="none" stroke={p.glow} strokeWidth="1" strokeOpacity="0.45" strokeDasharray="4 4" />

        {/* Back 8-pointed light halo */}
        <g opacity="0.35">
          <rect x="34" y="34" width="52" height="52" stroke={p.glow} strokeWidth="1.5" fill="none" />
          <rect x="34" y="34" width="52" height="52" transform="rotate(45 60 60)" stroke={p.glow} strokeWidth="1.5" fill="none" />
        </g>

        {/* Stylized faceless shoulders & armored/robed torso */}
        <path
          d="M24 102 C26 78 40 68 60 68 C80 68 94 78 96 102 Z"
          fill={p.cloak}
          stroke={p.trim}
          strokeWidth="2"
        />

        {/* Chest geometric ornament */}
        <path d="M60 72 L68 84 L60 96 L52 84 Z" fill={p.trim} fillOpacity="0.85" />

        {/* Stylized faceless head silhouette (hood / helmet / veil) */}
        <path
          d="M42 52 C42 34 50 26 60 26 C70 26 78 34 78 52 C78 62 70 69 60 69 C50 69 42 62 42 52 Z"
          fill="#0b1524"
          stroke={p.trim}
          strokeWidth="2.2"
        />
        {/* Faceless luminous visor/veil detail (no facial features) */}
        <path
          d="M48 47 Q60 43 72 47 Q60 54 48 47 Z"
          fill={p.glow}
          fillOpacity="0.82"
        />

        {/* Hero-specific gear silhouette */}
        {heroId === 'amin' && (
          <g>
            {/* Royal helmet crest + golden kite shield */}
            <path d="M56 26 L60 16 L64 26 Z" fill={p.trim} />
            <path d="M80 60 L98 67 V83 C98 92 90 99 80 102 C70 99 62 92 62 83 V67 Z" fill="#065f46" stroke={p.trim} strokeWidth="2.2" />
            <path d="M80 71 L86 80 L80 89 L74 80 Z" fill={p.glow} />
          </g>
        )}
        {heroId === 'faris' && (
          <g>
            {/* Desert keffiyeh wrap + golden bow */}
            <path d="M40 44 Q60 22 80 44" fill="none" stroke={p.trim} strokeWidth="3" />
            <path d="M86 30 C98 48 98 76 86 94" fill="none" stroke={p.trim} strokeWidth="3" strokeLinecap="round" />
            <line x1="86" y1="32" x2="86" y2="92" stroke="#fef3c7" strokeWidth="1.2" />
            <line x1="68" y1="62" x2="100" y2="62" stroke={p.glow} strokeWidth="2.5" />
          </g>
        )}
        {heroId === 'hakim' && (
          <g>
            {/* Scholar turban crest + geometric crystal orb */}
            <ellipse cx="60" cy="29" rx="19" ry="7" fill={p.cloak} stroke={p.trim} strokeWidth="2" />
            <circle cx="60" cy="24" r="3.5" fill={p.glow} />
            <circle cx="88" cy="64" r="9" fill={p.glow} fillOpacity="0.3" stroke={p.glow} strokeWidth="2" />
            <rect x="83" y="59" width="10" height="10" transform="rotate(45 88 64)" stroke={p.trim} strokeWidth="1.5" fill="none" />
          </g>
        )}
        {heroId === 'zahra' && (
          <g>
            {/* Flowing modest emerald veil + luminous leaf staff */}
            <path d="M39 54 C36 70 30 82 28 96" stroke={p.glow} strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M81 54 C84 70 90 82 92 96" stroke={p.glow} strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="60" cy="25" r="4" fill={p.trim} />
            <line x1="28" y1="42" x2="28" y2="98" stroke={p.trim} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="28" cy="38" r="6" fill={p.glow} fillOpacity="0.85" />
          </g>
        )}
        {heroId === 'zaid' && (
          <g>
            {/* Desert wind headband + twin curved scimitars */}
            <path d="M41 37 Q60 32 79 37" stroke={p.trim} strokeWidth="3" fill="none" />
            <path d="M26 90 Q22 62 38 42" stroke={p.glow} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M94 90 Q98 62 82 42" stroke={p.trim} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </g>
        )}
      </svg>
    </div>
  );
};
