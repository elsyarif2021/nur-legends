import { QuickChatDef, QuickChatId } from '../types/game';

export const QUICK_CHATS: QuickChatDef[] = [
  {
    id: 'terima_kasih',
    label: 'Terima Kasih!',
    valueTag: 'Syukur & Adab',
    icon: 'heart',
    tone: 'emerald',
    hotkey: '1',
  },
  {
    id: 'sabar',
    label: 'Sabar, Tetap Tenang!',
    valueTag: 'Sabar',
    icon: 'calm',
    tone: 'blue',
    hotkey: '2',
  },
  {
    id: 'bagus',
    label: 'Bagus Sekali!',
    valueTag: 'Apresiasi',
    icon: 'star',
    tone: 'gold',
    hotkey: '3',
  },
  {
    id: 'bersatu',
    label: 'Ayo Bersatu!',
    valueTag: 'Ukhuwah',
    icon: 'handshake',
    tone: 'blue',
    hotkey: '4',
  },
  {
    id: 'bantu',
    label: 'Mohon Bantuan!',
    valueTag: 'Ta’awun',
    icon: 'shield',
    tone: 'gold',
    hotkey: '5',
  },
  {
    id: 'semangat',
    label: 'Tetap Semangat!',
    valueTag: 'Amanah',
    icon: 'flame',
    tone: 'emerald',
    hotkey: '6',
  },
];

export const QUICK_CHAT_MAP: Record<QuickChatId, QuickChatDef> = QUICK_CHATS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<QuickChatId, QuickChatDef>
);
