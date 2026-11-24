import React, { useEffect, useState } from 'react';
import { HEROES } from '../services/gameCatalog';
import { HeroId } from '../types/game';

interface HeroAvatarProps {
  heroId: HeroId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const HERO_PORTRAITS: Record<HeroId, string> = {
  amin: '/src/assets/images/hero_real_amin_1795513357431.jpg',
  faris: '/src/assets/images/hero_real_faris_1795513357916.jpg',
  hakim: '/src/assets/images/hero_real_hakim_1795513358256.jpg',
  zahra: '/src/assets/images/hero_real_zahra_1795513359066.jpg',
  zaid: '/src/assets/images/hero_real_zaid_1795513358924.jpg',
  mumtaz: '/src/assets/images/hero_real_mumtaz_1795513359251.jpg',
  aina: '/src/assets/images/hero_real_aina_1795513360509.jpg',
};

const PALETTES: Record<
  HeroId,
  { bg1: string; bg2: string; trim: string; glow: string }
> = {
  amin: { bg1: '#064e3b', bg2: '#0f172a', trim: '#d4af37', glow: '#34d399' },
  faris: { bg1: '#78350f', bg2: '#0f172a', trim: '#fef3c7', glow: '#f59e0b' },
  hakim: { bg1: '#134e4a', bg2: '#0f172a', trim: '#d4af37', glow: '#2dd4bf' },
  zahra: { bg1: '#065f46', bg2: '#0f172a', trim: '#fdfbf7', glow: '#6ee7b7' },
  zaid: { bg1: '#0c4a6e', bg2: '#0f172a', trim: '#d4af37', glow: '#38bdf8' },
  mumtaz: { bg1: '#312e81', bg2: '#0f172a', trim: '#fbbf24', glow: '#a5b4fc' },
  aina: { bg1: '#581c87', bg2: '#0f172a', trim: '#fde68a', glow: '#e879f9' },
};

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  heroId,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [heroId]);

  const sizeClass =
    size === 'sm'
      ? 'w-10 h-10'
      : size === 'md'
      ? 'w-14 h-14'
      : size === 'lg'
      ? 'w-28 h-28 sm:w-32 sm:h-32'
      : 'w-52 h-52';

  const hero = HEROES[heroId];
  const p = PALETTES[heroId];
  const src = HERO_PORTRAITS[heroId];
  const isLarge = size === 'lg' || size === 'xl';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full ${sizeClass} ${className}`}
    >
      {/* Outer ornamental gold ring for large showcase avatars */}
      {isLarge && (
        <svg
          viewBox="0 0 120 120"
          className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] pointer-events-none"
          aria-hidden="true"
        >
          <circle
            cx="60"
            cy="60"
            r="58"
            fill="none"
            stroke={p.trim}
            strokeWidth="1.5"
            strokeOpacity="0.65"
            strokeDasharray="6 4"
          />
          <polygon
            points="60,0 62.5,5 60,10 57.5,5"
            fill={p.trim}
          />
          <polygon
            points="60,110 62.5,115 60,120 57.5,115"
            fill={p.trim}
          />
        </svg>
      )}

      {/* Main circular portrait container */}
      <div
        className="relative w-full h-full rounded-full overflow-hidden shadow-lg"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${p.bg1}, ${p.bg2})`,
          border: `${isLarge ? '3px' : '2px'} solid ${p.trim}`,
          boxShadow: isLarge
            ? `0 0 24px -4px ${p.glow}55, inset 0 0 12px rgba(0,0,0,0.6)`
            : `0 2px 8px rgba(0,0,0,0.45)`,
        }}
      >
        {!imgError ? (
          <>
            <img
              src={src}
              alt={`Potret ${hero.name} — ${hero.title}`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-top select-none"
              draggable={false}
            />
            {/* Subtle edge shading for depth */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 50% 45%, transparent 62%, rgba(7, 17, 30, 0.55) 100%)',
              }}
            />
          </>
        ) : (
          /* Styled fallback emblem if image fails to load */
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            aria-label={`Emblem ${hero.name}`}
          >
            <g opacity="0.45">
              <rect
                x="32"
                y="32"
                width="56"
                height="56"
                stroke={p.glow}
                strokeWidth="2"
                fill="none"
              />
              <rect
                x="32"
                y="32"
                width="56"
                height="56"
                transform="rotate(45 60 60)"
                stroke={p.trim}
                strokeWidth="2"
                fill="none"
              />
            </g>
            <text
              x="60"
              y="68"
              textAnchor="middle"
              fill={p.trim}
              fontSize="36"
              fontWeight="bold"
              fontFamily="serif"
            >
              {hero.name.charAt(0)}
            </text>
          </svg>
        )}
      </div>
    </div>
  );
};
