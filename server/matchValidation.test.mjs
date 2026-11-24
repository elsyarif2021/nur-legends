import test from 'node:test';
import assert from 'node:assert/strict';
import { validSnapshot, canAcceptSnapshot } from './matchValidation.mjs';
const snapshot = () => ({seq:1,matchTimeSec:2,blueKills:0,redKills:0,heroes:Array.from({length:10},(_,i)=>({id:'h'+i,x:500,y:500,facing:0,hp:100,maxHp:100,mana:50,maxMana:50,shield:0,level:1,xp:0,maxXp:140,gold:350,kills:0,deaths:0,assists:0,isDead:false,respawnTimer:0,recallTimer:0,recoveryCooldown:0,guardianBuffTimer:0,skillCooldowns:[0,0,0,0],items:[]})),minions:[],structures:[],guardians:[],matchResult:null});
test('valid snapshot',()=>assert.equal(validSnapshot(snapshot()),true));
test('malformed payload',()=>assert.equal(validSnapshot({}),false));
test('invalid health and coordinates',()=>{const s=snapshot();s.heroes[0].hp=999;assert.equal(validSnapshot(s),false);s.heroes[0].hp=100;s.heroes[0].x=99999;assert.equal(validSnapshot(s),false)});
test('reject duplicate identifiers',()=>{const s=snapshot();s.heroes[1].id=s.heroes[0].id;assert.equal(validSnapshot(s),false)});
test('reject replay and time regression',()=>{const s=snapshot();assert.equal(canAcceptSnapshot(s,s),false);assert.equal(canAcceptSnapshot(s,{...s,seq:2,matchTimeSec:1}),false);assert.equal(canAcceptSnapshot(s,{...s,seq:2}),true)});
