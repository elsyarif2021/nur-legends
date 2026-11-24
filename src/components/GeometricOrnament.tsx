import React from 'react';
import { SkillDef } from '../types/game';

export const StarEmblem: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-6 h-6',
  color = '#d4af37',
}) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <rect
      x="14"
      y="14"
      width="36"
      height="36"
      stroke={color}
      strokeWidth="2.5"
      fill="none"
    />
    <rect
      x="14"
      y="14"
      width="36"
      height="36"
      transform="rotate(45 32 32)"
      stroke={color}
      strokeWidth="2.5"
      fill="none"
    />
    <circle cx="32" cy="32" r="7" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.2" />
  </svg>
);

export const CornerFiligree: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <path d="M2 24V6C2 3.8 3.8 2 6 2H24" stroke="#d4af37" strokeWidth="2" strokeOpacity="0.7" />
    <path d="M8 18V10C8 8.9 8.9 8 10 8H18" stroke="#14b8a6" strokeWidth="1.5" strokeOpacity="0.65" />
    <circle cx="8" cy="8" r="2" fill="#d4af37" />
  </svg>
);

export const SkillIcon: React.FC<{
  type: SkillDef['iconType'] | 'sword' | 'recall' | 'recovery';
  className?: string;
}> = ({ type, className = 'w-6 h-6' }) => {
  switch (type) {
    case 'shield':
    case 'teamshield':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3L4 6.5V11.5C4 16.5 7.4 20.6 12 22C16.6 20.6 20 16.5 20 11.5V6.5L12 3Z"
            stroke="currentColor"
            strokeWidth="2"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <path d="M12 7V17M8 11H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'barrier':
    case 'fortress':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
          <path
            d="M12 5L6 8V12.5C6 16 8.6 18.8 12 20C15.4 18.8 18 16 18 12.5V8L12 5Z"
            fill="currentColor"
            fillOpacity="0.28"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case 'charge':
    case 'dash':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M4 17L13 8M13 8H8M13 8V13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 20L20 11M20 11H15M20 11V16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'arrow':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M4 20L19 5M19 5H13M19 5V11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 15L9 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'rapid':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 16L13 6M8 20L18 10M13 21L21 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="17" cy="6" r="2" fill="currentColor" />
        </svg>
      );
    case 'wind':
    case 'speed':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 9H15C16.7 9 18 7.7 18 6C18 4.3 16.7 3 15 3C13.6 3 12.4 4 12.1 5.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 14H19C20.7 14 22 15.3 22 17C22 18.7 20.7 20 19 20C17.6 20 16.4 19 16.1 17.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'rain':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M6 4V14M12 3V17M18 5V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 12L6 15L8 12M10 15L12 18L14 15M16 12L18 15L20 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'orb':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="6" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'circle':
    case 'storm':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="6" y="6" width="12" height="12" stroke="currentColor" strokeWidth="1.8" />
          <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );
    case 'crystal':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 2L19 9L12 22L5 9L12 2Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 2V22M5 9H19" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'heal':
    case 'recovery':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.55" />
        </svg>
      );
    case 'garden':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 21V11M12 11C12 6.5 16 4 20 4C20 8 17.5 11 12 11ZM12 14C12 9.5 8 7 4 7C4 11 6.5 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );
    case 'slash':
    case 'sword':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M19 3L9 13M14 4L20 4L20 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 11L13 17M5 19L9 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'spin':
    case 'cyclone':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 3C16.97 3 21 7.03 21 12C21 15.5 19 18.5 16 19.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 21C7.03 21 3 16.97 3 12C3 8.5 5 5.5 8 4.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    case 'recall':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 10.5L12 3L21 10.5V20C21 20.6 20.6 21 20 21H4C3.4 21 3 20.6 3 20V10.5Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" />
          <path d="M9 21V14H15V21" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
  }
};

export const EmoteIcon: React.FC<{
  type: 'heart' | 'calm' | 'star' | 'handshake' | 'shield' | 'flame';
  className?: string;
}> = ({ type, className = 'w-5 h-5' }) => {
  switch (type) {
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 20.5C12 20.5 4.5 15.6 4.5 9.8C4.5 7.1 6.6 5 9.2 5C10.7 5 12 5.8 12 5.8C12 5.8 13.3 5 14.8 5C17.4 5 19.5 7.1 19.5 9.8C19.5 15.6 12 20.5 12 20.5Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'calm':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.16" />
          <path d="M8 13.5C9.5 15.2 14.5 15.2 16 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9.2" cy="9.5" r="1.2" fill="currentColor" />
          <circle cx="14.8" cy="9.5" r="1.2" fill="currentColor" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="6" y="6" width="12" height="12" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.18" />
          <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        </svg>
      );
    case 'handshake':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M7 12L10.5 8.5C11.5 7.5 13 7.5 14 8.5L17 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.5 12.5L7 9L12 14L17 9L20.5 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 15.5L12 19L15.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3.5L5 6.5V11.8C5 16.3 8 19.9 12 21.2C16 19.9 19 16.3 19 11.8V6.5L12 3.5Z"
            fill="currentColor"
            fillOpacity="0.22"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M12 8V15M8.5 11.5H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'flame':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3C12 3 17.5 7.5 17.5 13C17.5 16.6 15 19.5 12 19.5C9 19.5 6.5 16.6 6.5 13C6.5 10.2 8.2 7.6 9.8 6C9.8 6 10.2 8.5 12 9.5C11.5 7 12 3 12 3Z"
            fill="currentColor"
            fillOpacity="0.24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};
