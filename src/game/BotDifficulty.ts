import type { BotDifficulty } from '../types/game';
export const BOT_DIFFICULTIES = {
 easy: { label: 'Easy', retreat: .18, awareness: 300, skillRange: 150, buyInterval: 14, ultimateThreshold: .25 },
 normal: { label: 'Normal', retreat: .26, awareness: 420, skillRange: 260, buyInterval: 8, ultimateThreshold: .65 },
 hard: { label: 'Hard', retreat: .32, awareness: 480, skillRange: 290, buyInterval: 6, ultimateThreshold: .7 },
 expert: { label: 'Expert', retreat: .36, awareness: 540, skillRange: 320, buyInterval: 4, ultimateThreshold: .8 },
 legendary: { label: 'Legendary', retreat: .4, awareness: 600, skillRange: 350, buyInterval: 3, ultimateThreshold: .85 },
} as const;
export function readDifficulty(): BotDifficulty {
 try { const value = localStorage.getItem('nur_bot_difficulty'); if (value && Object.prototype.hasOwnProperty.call(BOT_DIFFICULTIES,value)) return value as BotDifficulty; } catch {}
 return 'normal';
}
