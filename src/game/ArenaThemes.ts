export const ARENA_THEMES = {
  oasis: { name: 'Oasis of Light', description: 'Oasis hijau dan jalan batu pasir', ground: 0x13382e, grid: 0x1b4d3e, lane: 0xb89c6d, runner: 0xd8c59e, river: 0x0f766e, water: 0x14b8a6, bridge: 0xe7dec8, trim: 0xd4af37, wall: 0x927238, preview: '#13382e' },
  desert: { name: 'Golden Desert', description: 'Gurun keemasan dan kanal oasis', ground: 0x674a2e, grid: 0x98764b, lane: 0xb99558, runner: 0xf0d399, river: 0x176b83, water: 0x5cb6c5, bridge: 0xe7c98e, trim: 0xf6d278, wall: 0xa97742, preview: '#674a2e' },
  forest: { name: 'Emerald Forest', description: 'Hutan zamrud dan jalur batu lumut', ground: 0x102e23, grid: 0x275139, lane: 0x748778, runner: 0xa8c4a0, river: 0x165e52, water: 0x44a89a, bridge: 0xa7bda3, trim: 0x91cc94, wall: 0x456749, preview: '#102e23' },
  citadel: { name: 'Royal Citadel', description: 'Benteng kerajaan dan halaman marmer', ground: 0x273246, grid: 0x46536a, lane: 0x8d95a5, runner: 0xc9d0df, river: 0x294b79, water: 0x719aca, bridge: 0xcbd5e1, trim: 0xe1b95b, wall: 0x69758a, preview: '#273246' },
  crystal: { name: 'Crystal Mountain', description: 'Pegunungan kristal dan sungai es', ground: 0x253f58, grid: 0x466881, lane: 0x7795ad, runner: 0xc7e5ef, river: 0x24609c, water: 0x7fcdec, bridge: 0xd2eaf7, trim: 0x9cdbf7, wall: 0x58788c, preview: '#253f58' },
} as const;
export type ArenaId = keyof typeof ARENA_THEMES;
export function readArena(): ArenaId {
  try { const id = localStorage.getItem('nur_arena'); if (id && Object.prototype.hasOwnProperty.call(ARENA_THEMES, id)) return id as ArenaId; } catch {}
  return 'oasis';
}
