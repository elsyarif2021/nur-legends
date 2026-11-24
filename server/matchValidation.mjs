// Pure validation at the relay boundary; this is not an authoritative simulation.
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const integer = (n, min, max) => Number.isSafeInteger(n) && finite(n,min,max);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const id = v => typeof v === 'string' && v.length > 0 && v.length <= 80;
export function validSnapshot(s) {
 if (!object(s) || !integer(s.seq,0,Number.MAX_SAFE_INTEGER) || !finite(s.matchTimeSec,0,86400) || !integer(s.blueKills,0,10000) || !integer(s.redKills,0,10000)) return false;
 if (!Array.isArray(s.heroes) || s.heroes.length !== 10 || !Array.isArray(s.minions) || s.minions.length > 256 || !Array.isArray(s.structures) || s.structures.length > 32 || !Array.isArray(s.guardians) || s.guardians.length > 16) return false;
 const unique = (rows,key) => new Set(rows.map(r=>r[key])).size === rows.length;
 const position = r => finite(r.x,0,2800) && finite(r.y,0,2800);
 const health = r => finite(r.maxHp,1,1000000) && finite(r.hp,0,r.maxHp+1);
 if (!s.heroes.every(h=>object(h)&&id(h.id)&&position(h)&&health(h)&&finite(h.facing,-10,10)&&finite(h.maxMana,1,1000000)&&finite(h.mana,0,h.maxMana+1)&&finite(h.shield,0,1000000)&&integer(h.level,1,1000)&&finite(h.xp,0,1000000)&&finite(h.maxXp,1,1000000)&&finite(h.gold,0,10000000)&&['kills','deaths','assists'].every(k=>integer(h[k],0,10000))&&typeof h.isDead==='boolean'&&['respawnTimer','recallTimer','recoveryCooldown','guardianBuffTimer'].every(k=>finite(h[k],-1,10000))&&Array.isArray(h.skillCooldowns)&&h.skillCooldowns.length===4&&h.skillCooldowns.every(n=>finite(n,-1,10000))&&Array.isArray(h.items)&&h.items.length<=6&&h.items.every(id))||!unique(s.heroes,'id')) return false;
 if (!s.minions.every(m=>object(m)&&integer(m.idx,0,1024)&&position(m)&&health(m)&&['blue','red'].includes(m.team)&&typeof m.isRanged==='boolean')||!unique(s.minions,'idx')) return false;
 if (!s.structures.every(r=>object(r)&&id(r.id)&&finite(r.hp,0,1000000)&&typeof r.destroyed==='boolean')||!unique(s.structures,'id')) return false;
 if (!s.guardians.every(r=>object(r)&&id(r.id)&&finite(r.hp,0,1000000)&&typeof r.alive==='boolean'&&finite(r.respawnTimer,-1,10000))||!unique(s.guardians,'id')) return false;
 if (s.matchResult !== null) {
  const r=s.matchResult;
  if (!object(r)||!['blue','red'].includes(r.winner)||!finite(r.durationSec,0,86400)||!['blueKills','redKills','playerKills','playerDeaths','playerAssists','turretsDestroyedByPlayerTeam','goldReward','xpReward'].every(k=>finite(r[k],0,10000000))||!id(r.mvpHeroId)) return false;
 }
 return true;
}
export function canAcceptSnapshot(previous,next) {
 return validSnapshot(next) && (!previous || (next.seq>previous.seq && next.matchTimeSec>=previous.matchTimeSec && next.blueKills>=previous.blueKills && next.redKills>=previous.redKills));
}
