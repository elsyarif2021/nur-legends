import 'dotenv/config';
import { canAcceptSnapshot } from './server/matchValidation.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';

type HeroId = 'amin' | 'faris' | 'hakim' | 'zahra' | 'zaid' | 'mumtaz' | 'aina';
type TeamSide = 'blue' | 'red';

interface RoomPlayer {
  id: string;
  name: string;
  heroId: HeroId;
  team: TeamSide;
  slotIndex: number;
  isHost: boolean;
  ready: boolean;
  camOn: boolean;
  micOn: boolean;
}

interface RoomRecord {
  code: string;
  name: string;
  isPublic: boolean;
  status: 'waiting' | 'playing';
  hostId: string;
  maxPlayers: number;
  players: RoomPlayer[];
  createdAt: number;
  lastSnapshot?: Record<string, unknown>;
}

interface ClientSession {
  playerId: string;
  ws: WebSocket;
  roomCode: string | null;
  isAlive: boolean;
  resumeKey: string;
  expiresAt?: number;
  lastCommandSeq?: number;
}

const VALID_HERO_IDS = new Set<HeroId>([
  'amin',
  'faris',
  'hakim',
  'zahra',
  'zaid',
  'mumtaz',
  'aina',
]);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

const ALLOWED_ORIGINS = new Set<string>([
  'https://nur-legends-git-main-elsyarif2021s-projects.vercel.app',
  'https://nur-legends.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const appOrigin = normalizeOrigin(process.env.APP_URL);
if (appOrigin) ALLOWED_ORIGINS.add(appOrigin);

if (process.env.ALLOWED_ORIGINS) {
  for (const part of process.env.ALLOWED_ORIGINS.split(',')) {
    const norm = normalizeOrigin(part);
    if (norm) ALLOWED_ORIGINS.add(norm);
  }
}

function isOriginAllowed(origin: string | undefined, hostHeader?: string): boolean {
  if (!origin) return true; // same-origin / non-browser client without Origin header
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (hostHeader) {
    if (origin === `https://${hostHeader}` || origin === `http://${hostHeader}`) {
      return true;
    }
  }
  return false;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ACCOUNTS_FILE = path.resolve(DATA_DIR, 'accounts.json');

interface StoredAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  updatedAt: number;
  progress: Record<string, unknown> | null;
}

const accountsByEmail = new Map<string, StoredAccount>();
const accountsById = new Map<string, StoredAccount>();
const revokedTokenIds = new Set<string>();
const authRateMap = new Map<string, { count: number; resetAt: number }>();

const rooms = new Map<string, RoomRecord>();
const sessions = new Map<string, ClientSession>();

function loadAccountsFromDisk(): void {
  try {
    if (!ACCOUNTS_FILE.startsWith(DATA_DIR + path.sep)) return;
    if (!fs.existsSync(ACCOUNTS_FILE)) return;
    const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as StoredAccount[];
    if (!Array.isArray(parsed)) return;
    for (const acc of parsed) {
      if (acc && typeof acc.id === 'string' && typeof acc.email === 'string') {
        accountsByEmail.set(acc.email, acc);
        accountsById.set(acc.id, acc);
      }
    }
  } catch (err) {
    console.error('Failed to load accounts store:', err);
  }
}

function saveAccountsToDisk(): void {
  try {
    if (!ACCOUNTS_FILE.startsWith(DATA_DIR + path.sep)) return;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    }
    const list = Array.from(accountsById.values());
    const tmpFile = path.resolve(DATA_DIR, 'accounts.json.tmp');
    if (!tmpFile.startsWith(DATA_DIR + path.sep)) return;
    fs.writeFileSync(tmpFile, JSON.stringify(list, null, 2), { mode: 0o600 });
    fs.renameSync(tmpFile, ACCOUNTS_FILE);
  } catch (err) {
    console.error('Failed to save accounts store:', err);
  }
}

loadAccountsFromDisk();

function isValidEmail(email: string): boolean {
  return email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actualBuf = Buffer.from(hashPassword(password, salt), 'hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function signSessionToken(userId: string): string {
  const payload = {
    sub: userId,
    jti: crypto.randomUUID(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(
  token: string
): { sub: string; jti: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const bufA = Buffer.from(providedSig, 'utf8');
  const bufB = Buffer.from(expectedSig, 'utf8');
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as { sub?: string; jti?: string; exp?: number };
    if (
      typeof parsed.sub !== 'string' ||
      typeof parsed.jti !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (Date.now() > parsed.exp || revokedTokenIds.has(parsed.jti)) {
      return null;
    }
    return { sub: parsed.sub, jti: parsed.jti, exp: parsed.exp };
  } catch {
    return null;
  }
}

function extractBearerToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = authRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    authRateMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 25) return false;
  entry.count += 1;
  return true;
}

function sanitizeStoredProgress(
  raw: unknown,
  fallbackName: string
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const settingsSrc =
    src.settings && typeof src.settings === 'object' && !Array.isArray(src.settings)
      ? (src.settings as Record<string, unknown>)
      : {};

  return {
    playerName: sanitizeText(src.playerName, fallbackName, 24),
    level: Math.max(1, Math.min(999, Math.floor(Number(src.level) || 1))),
    xp: Math.max(0, Math.min(1000000, Math.floor(Number(src.xp) || 0))),
    gold: Math.max(0, Math.min(10000000, Math.floor(Number(src.gold) || 500))),
    selectedHeroId: sanitizeHeroId(src.selectedHeroId),
    dailyMissions: Array.isArray(src.dailyMissions) ? src.dailyMissions.slice(0, 12) : [],
    lastMissionDate:
      typeof src.lastMissionDate === 'string'
        ? src.lastMissionDate.slice(0, 20)
        : '',
    battleHistory: Array.isArray(src.battleHistory) ? src.battleHistory.slice(0, 20) : [],
    quizAnsweredIds: Array.isArray(src.quizAnsweredIds)
      ? src.quizAnsweredIds.slice(0, 100)
      : [],
    quizCorrectCount: Math.max(0, Math.min(1000, Math.floor(Number(src.quizCorrectCount) || 0))),
    settings: {
      volume: Math.max(0, Math.min(1, Number(settingsSrc.volume ?? 0.65))),
      muted: Boolean(settingsSrc.muted),
      ambientEnabled: settingsSrc.ambientEnabled !== false,
      quality:
        settingsSrc.quality === 'low' ||
        settingsSrc.quality === 'medium' ||
        settingsSrc.quality === 'high'
          ? settingsSrc.quality
          : 'high',
      showTutorialOnStart: settingsSrc.showTutorialOnStart !== false,
    },
    tutorialCompleted: Boolean(src.tutorialCompleted),
  };
}

function publicUser(acc: StoredAccount) {
  return {
    id: acc.id,
    name: acc.name,
    email: acc.email,
    createdAt: acc.createdAt,
  };
}

function sanitizeText(raw: unknown, fallback: string, maxLen: number): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLen);
}

function sanitizeHeroId(raw: unknown): HeroId {
  if (typeof raw === 'string' && VALID_HERO_IDS.has(raw as HeroId)) {
    return raw as HeroId;
  }
  return 'amin';
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[crypto.randomInt(0, chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToRoom(room: RoomRecord, payload: unknown, excludePlayerId?: string): void {
  const raw = JSON.stringify(payload);
  for (const p of room.players) {
    if (excludePlayerId && p.id === excludePlayerId) continue;
    const sess = sessions.get(p.id);
    if (sess && sess.ws.readyState === WebSocket.OPEN) {
      sess.ws.send(raw);
    }
  }
}

function getPublicRoomSummaries() {
  const list: Array<{
    code: string;
    name: string;
    hostName: string;
    playerCount: number;
    maxPlayers: number;
    status: 'waiting' | 'playing';
    isPublic: boolean;
  }> = [];

  for (const r of rooms.values()) {
    if (!r.isPublic) continue;
    const host = r.players.find((p) => p.id === r.hostId);
    list.push({
      code: r.code,
      name: r.name,
      hostName: host ? host.name : 'Penjaga',
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
      status: r.status,
      isPublic: r.isPublic,
    });
  }

  return list.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'waiting' ? -1 : 1;
    return b.playerCount - a.playerCount;
  });
}

function broadcastPublicRoomList(): void {
  const listPayload = JSON.stringify({ type: 'room:list', rooms: getPublicRoomSummaries() });
  for (const sess of sessions.values()) {
    if (!sess.roomCode && sess.ws.readyState === WebSocket.OPEN) {
      sess.ws.send(listPayload);
    }
  }
}

function serializeRoom(room: RoomRecord) {
  return {
    code: room.code,
    name: room.name,
    isPublic: room.isPublic,
    status: room.status,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    players: room.players,
  };
}

function pickTeamAndSlot(room: RoomRecord, preferredTeam?: TeamSide): { team: TeamSide; slotIndex: number } | null {
  const blueUsed = new Set(room.players.filter((p) => p.team === 'blue').map((p) => p.slotIndex));
  const redUsed = new Set(room.players.filter((p) => p.team === 'red').map((p) => p.slotIndex));

  const tryTeam = (team: TeamSide): { team: TeamSide; slotIndex: number } | null => {
    const used = team === 'blue' ? blueUsed : redUsed;
    for (let idx = 0; idx < 5; idx++) {
      if (!used.has(idx)) return { team, slotIndex: idx };
    }
    return null;
  };

  if (preferredTeam) {
    return tryTeam(preferredTeam);
  }

  // Auto-balance toward smaller team
  const firstTeam: TeamSide = blueUsed.size <= redUsed.size ? 'blue' : 'red';
  return tryTeam(firstTeam) || tryTeam(firstTeam === 'blue' ? 'red' : 'blue');
}

function leaveCurrentRoom(session: ClientSession): void {
  if (!session.roomCode) return;
  const room = rooms.get(session.roomCode);
  session.roomCode = null;
  if (!room) return;

  const idx = room.players.findIndex((p) => p.id === session.playerId);
  if (idx === -1) return;
  room.players.splice(idx, 1);

  if (room.players.length === 0) {
    rooms.delete(room.code);
    broadcastPublicRoomList();
    return;
  }

  // Reassign host if previous host disconnected/left
  if (room.hostId === session.playerId) {
    room.hostId = room.players[0].id;
    for (const p of room.players) {
      p.isHost = p.id === room.hostId;
      if (p.isHost) p.ready = true;
    }
  }

  broadcastToRoom(room, { type: 'room:peer_left', peerId: session.playerId });
  broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
  broadcastPublicRoomList();
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // Origin-allowlisted CORS for cross-origin Vercel frontend integration (no wildcard '*')
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin, req.headers.host)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size, playersOnline: [...sessions.values()].filter(s => s.ws.readyState === WebSocket.OPEN).length, protocolVersion: 3, simulation: 'host-relay' });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getPublicRoomSummaries() });
  });

  app.get('/api/leaderboard', async (_req, res) => {
    const convexUrl = (process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || '').trim();
    if (convexUrl) {
      try {
        const client = new ConvexHttpClient(convexUrl);
        const ref = makeFunctionReference<'query', Record<string, never>, unknown[]>(
          'catalog:getLeaderboard'
        );
        const entries = await client.query(ref, {});
        res.json({ entries });
        return;
      } catch {
        // Fall back to local in-memory accounts if Convex query fails
      }
    }

    const entries = Array.from(accountsById.values())
      .map((acc) => {
        const prog = (acc.progress || {}) as Record<string, unknown>;
        const history = Array.isArray(prog.battleHistory)
          ? (prog.battleHistory as Array<Record<string, unknown>>)
          : [];
        const wins = history.filter((h) => h && h.result === 'victory').length;
        return {
          playerName: acc.name,
          heroId: sanitizeHeroId(prog.selectedHeroId),
          level: Math.max(1, Math.floor(Number(prog.level) || 1)),
          xp: Math.max(0, Math.floor(Number(prog.xp) || 0)),
          wins,
          matches: history.length,
          updatedAt: acc.updatedAt,
        };
      })
      .sort((a, b) => b.level - a.level || b.xp - a.xp || b.wins - a.wins)
      .slice(0, 25);

    res.json({ entries });
  });

  app.post('/api/auth/register', (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkAuthRateLimit(clientIp)) {
      res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    const name = sanitizeText(body?.name, '', 24);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (name.length < 2) {
      res.status(400).json({ error: 'Nama minimal 2 karakter.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Format alamat email tidak valid.' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: 'Password minimal 6 karakter.' });
      return;
    }
    if (accountsByEmail.has(email)) {
      res.status(409).json({ error: 'Email ini sudah terdaftar. Silakan masuk dengan password Anda.' });
      return;
    }

    const id = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const now = Date.now();
    const initialProgress = sanitizeStoredProgress(body?.progress, name);

    const account: StoredAccount = {
      id,
      name,
      email,
      passwordHash,
      salt,
      createdAt: now,
      updatedAt: now,
      progress: initialProgress ? { ...initialProgress, playerName: name } : null,
    };

    accountsByEmail.set(email, account);
    accountsById.set(id, account);
    saveAccountsToDisk();

    const token = signSessionToken(id);
    res.status(201).json({
      token,
      user: publicUser(account),
      progress: account.progress,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkAuthRateLimit(clientIp)) {
      res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const optionalName = sanitizeText(body?.name, '', 24);

    if (!isValidEmail(email) || password.length < 1 || password.length > 128) {
      res.status(400).json({ error: 'Masukkan email dan password yang valid.' });
      return;
    }

    const account = accountsByEmail.get(email);
    if (!account || !verifyPassword(password, account.salt, account.passwordHash)) {
      res.status(401).json({ error: 'Email atau password tidak sesuai.' });
      return;
    }

    if (optionalName.length >= 2 && optionalName !== account.name) {
      account.name = optionalName;
      account.updatedAt = Date.now();
      if (account.progress) {
        account.progress.playerName = optionalName;
      }
      saveAccountsToDisk();
    }

    const token = signSessionToken(account.id);
    res.json({
      token,
      user: publicUser(account),
      progress: account.progress,
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = extractBearerToken(req);
    const verified = token ? verifySessionToken(token) : null;
    if (!verified) {
      res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir.' });
      return;
    }
    const account = accountsById.get(verified.sub);
    if (!account) {
      res.status(401).json({ error: 'Akun tidak ditemukan.' });
      return;
    }
    res.json({
      user: publicUser(account),
      progress: account.progress,
    });
  });

  app.put('/api/auth/progress', (req, res) => {
    const token = extractBearerToken(req);
    const verified = token ? verifySessionToken(token) : null;
    if (!verified) {
      res.status(401).json({ error: 'Sesi tidak valid.' });
      return;
    }
    const account = accountsById.get(verified.sub);
    if (!account) {
      res.status(404).json({ error: 'Akun tidak ditemukan.' });
      return;
    }

    const sanitized = sanitizeStoredProgress(req.body?.progress, account.name);
    if (!sanitized) {
      res.status(400).json({ error: 'Data kemajuan tidak valid.' });
      return;
    }
    account.progress = sanitized;
    if (typeof sanitized.playerName === 'string' && sanitized.playerName.length >= 2) {
      account.name = sanitized.playerName;
    }
    account.updatedAt = Date.now();
    saveAccountsToDisk();

    res.json({ ok: true, user: publicUser(account) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    const verified = token ? verifySessionToken(token) : null;
    if (verified) {
      revokedTokenIds.add(verified.jti);
    }
    res.json({ ok: true });
  });

  const server = http.createServer(app);

  // Attach WebSocket server on /ws using the same HTTP server (port 3000)
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 64 * 1024,
    verifyClient: (info, done) => {
      const origin = info.origin || info.req.headers.origin;
      if (isOriginAllowed(origin, info.req.headers.host)) {
        done(true);
      } else {
        done(false, 403, 'Origin not allowed');
      }
    },
  });

  wss.on('connection', (ws, req) => {
    const resumeKey = new URL(req.url || '/ws', 'http://localhost').searchParams.get('resume');
    const prior = resumeKey && /^[a-f0-9]{64}$/.test(resumeKey) ? [...sessions.values()].find(s => s.resumeKey === resumeKey && s.ws.readyState !== WebSocket.OPEN && (s.expiresAt ?? 0) > Date.now()) : undefined;
    const playerId = prior?.playerId ?? crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const session: ClientSession = prior ?? { playerId, ws, roomCode: null, isAlive: true, resumeKey: crypto.randomBytes(32).toString('hex') };
    session.ws = ws;
    session.isAlive = true;
    session.expiresAt = undefined;
    let windowStart = Date.now(), messageCount = 0;
    sessions.set(playerId, session);

    sendJson(ws, {
      type: 'welcome',
      playerId,
      resumeKey: session.resumeKey,
      rooms: getPublicRoomSummaries(),
    });

    if (prior?.roomCode) {
      const room = rooms.get(prior.roomCode);
      if (room) {
        sendJson(ws, { type: 'room:state', room: serializeRoom(room) });
        if (room.status === 'playing' && room.lastSnapshot && room.hostId !== playerId) sendJson(ws, { type: 'game:state', snapshot: room.lastSnapshot });
      }
    }

    ws.on('pong', () => {
      session.isAlive = true;
    });

    ws.on('message', (rawBuf) => {
      if (session.ws !== ws) return;
      if (Date.now() - windowStart >= 1000) { windowStart = Date.now(); messageCount = 0; }
      if (++messageCount > 180) { ws.close(1008, 'Rate limit'); return; }
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawBuf.toString('utf8')) as Record<string, unknown>;
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'room:list': {
          sendJson(ws, { type: 'room:list', rooms: getPublicRoomSummaries() });
          break;
        }

        case 'room:create': {
          leaveCurrentRoom(session);
          const playerName = sanitizeText(msg.playerName, 'Penjaga Cahaya', 20);
          const roomName = sanitizeText(msg.roomName, `Arena ${playerName}`, 32);
          const heroId = sanitizeHeroId(msg.heroId);
          const isPublic = msg.isPublic !== false;
          const code = generateRoomCode();

          const room: RoomRecord = {
            code,
            name: roomName,
            isPublic,
            status: 'waiting',
            hostId: playerId,
            maxPlayers: 10,
            createdAt: Date.now(),
            players: [
              {
                id: playerId,
                name: playerName,
                heroId,
                team: 'blue',
                slotIndex: 0,
                isHost: true,
                ready: true,
                camOn: Boolean(msg.camOn),
                micOn: Boolean(msg.micOn),
              },
            ],
          };

          rooms.set(code, room);
          session.roomCode = code;
          sendJson(ws, { type: 'room:state', room: serializeRoom(room) });
          broadcastPublicRoomList();
          break;
        }

        case 'room:quick_match': {
          leaveCurrentRoom(session);
          const playerName = sanitizeText(msg.playerName, 'Penjaga Cahaya', 20);
          const heroId = sanitizeHeroId(msg.heroId);
          const camOn = Boolean(msg.camOn);
          const micOn = Boolean(msg.micOn);

          let targetRoom: RoomRecord | null = null;
          const candidates = [...rooms.values()].filter(r => r.isPublic && r.status === 'waiting' && r.players.length < r.maxPlayers && sessions.get(r.hostId)?.ws.readyState === WebSocket.OPEN);
          candidates.sort((a,b) => b.players.length - a.players.length || a.createdAt - b.createdAt);
          targetRoom = candidates[0] ?? null;

          if (!targetRoom) {
            const code = generateRoomCode();
            targetRoom = {
              code,
              name: `Arena Global #${code.slice(0, 3)}`,
              isPublic: true,
              status: 'waiting',
              hostId: playerId,
              maxPlayers: 10,
              createdAt: Date.now(),
              players: [
                {
                  id: playerId,
                  name: playerName,
                  heroId,
                  team: 'blue',
                  slotIndex: 0,
                  isHost: true,
                  ready: true,
                  camOn,
                  micOn,
                },
              ],
            };
            rooms.set(code, targetRoom);
            session.roomCode = code;
            sendJson(ws, { type: 'room:state', room: serializeRoom(targetRoom) });
            broadcastPublicRoomList();
            break;
          }

          const slot = pickTeamAndSlot(targetRoom);
          if (!slot) {
            sendJson(ws, { type: 'room:error', message: 'Ruang sedang penuh.' });
            break;
          }

          const newPlayer: RoomPlayer = {
            id: playerId,
            name: playerName,
            heroId,
            team: slot.team,
            slotIndex: slot.slotIndex,
            isHost: false,
            ready: false,
            camOn,
            micOn,
          };
          targetRoom.players.push(newPlayer);
          session.roomCode = targetRoom.code;

          broadcastToRoom(targetRoom, { type: 'room:peer_joined', peer: newPlayer }, playerId);
          broadcastToRoom(targetRoom, { type: 'room:state', room: serializeRoom(targetRoom) });
          broadcastPublicRoomList();
          break;
        }

        case 'room:join': {
          const code = sanitizeText(msg.code, '', 10).toUpperCase();
          const room = rooms.get(code);
          if (!room) {
            sendJson(ws, { type: 'room:error', message: `Kode ruang "${code}" tidak ditemukan.` });
            break;
          }
          if (room.players.length >= room.maxPlayers) {
            sendJson(ws, { type: 'room:error', message: 'Ruang sudah penuh (maksimal 10 pemain).' });
            break;
          }
          if (room.status === 'playing') {
            sendJson(ws, { type: 'room:error', message: 'Pertandingan di ruang ini sedang berlangsung.' });
            break;
          }

          leaveCurrentRoom(session);
          const slot = pickTeamAndSlot(room);
          if (!slot) {
            sendJson(ws, { type: 'room:error', message: 'Tidak ada slot tim tersisa.' });
            break;
          }

          const newPlayer: RoomPlayer = {
            id: playerId,
            name: sanitizeText(msg.playerName, 'Penjaga Cahaya', 20),
            heroId: sanitizeHeroId(msg.heroId),
            team: slot.team,
            slotIndex: slot.slotIndex,
            isHost: false,
            ready: false,
            camOn: Boolean(msg.camOn),
            micOn: Boolean(msg.micOn),
          };
          room.players.push(newPlayer);
          session.roomCode = room.code;

          broadcastToRoom(room, { type: 'room:peer_joined', peer: newPlayer }, playerId);
          broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
          broadcastPublicRoomList();
          break;
        }

        case 'room:update': {
          if (!session.roomCode) break;
          const room = rooms.get(session.roomCode);
          if (!room) break;
          const player = room.players.find((p) => p.id === playerId);
          if (!player) break;

          if (typeof msg.playerName === 'string') {
            player.name = sanitizeText(msg.playerName, player.name, 20);
          }
          if (typeof msg.heroId === 'string') {
            player.heroId = sanitizeHeroId(msg.heroId);
          }
          if (typeof msg.ready === 'boolean') {
            player.ready = player.isHost ? true : msg.ready;
          }
          if (typeof msg.camOn === 'boolean') {
            player.camOn = msg.camOn;
          }
          if (typeof msg.micOn === 'boolean') {
            player.micOn = msg.micOn;
          }
          if (msg.team === 'blue' || msg.team === 'red') {
            if (room.status === 'waiting' && msg.team !== player.team) {
              const targetSlot = pickTeamAndSlot(room, msg.team);
              if (targetSlot) {
                player.team = targetSlot.team;
                player.slotIndex = targetSlot.slotIndex;
              }
            }
          }

          broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
          break;
        }

        case 'room:chat': {
          if (!session.roomCode) break;
          const room = rooms.get(session.roomCode);
          if (!room) break;
          const player = room.players.find((p) => p.id === playerId);
          if (!player) break;
          const text = sanitizeText(msg.text, '', 160);
          if (!text) break;

          broadcastToRoom(room, {
            type: 'room:chat',
            message: {
              id: crypto.randomUUID().slice(0, 10),
              senderId: playerId,
              senderName: player.name,
              text,
              timestamp: Date.now(),
            },
          });
          break;
        }

        case 'room:start': {
          if (!session.roomCode) break;
          const room = rooms.get(session.roomCode);
          if (!room || room.hostId !== playerId) break;
          if (room.status === 'playing') break;
          room.status = 'playing';
          room.lastSnapshot = undefined;
          for (const p of room.players) { const member = sessions.get(p.id); if (member) member.lastCommandSeq = undefined; }
          broadcastToRoom(room, { type: 'room:started', room: serializeRoom(room) });
          broadcastPublicRoomList();
          break;
        }

        case 'room:leave': {
          leaveCurrentRoom(session);
          sendJson(ws, { type: 'room:left' });
          break;
        }

        case 'game:input': {
          if (!session.roomCode) break;
          const room = rooms.get(session.roomCode);
          if (!room || room.status !== 'playing') break;
          const command = msg.command as Record<string, unknown> | undefined;
          if (!command || !Number.isSafeInteger(command.seq) || Number(command.seq) < 0) break;
          if (command.type === 'MOVE') {
            if (typeof command.vx !== 'number' || typeof command.vy !== 'number' || !Number.isFinite(command.vx) || !Number.isFinite(command.vy) || Math.hypot(command.vx, command.vy) > 1.01) break;
          } else if (command.type === 'ACTION') {
            if (!['basic','s1','s2','s3','ult','recall','recovery'].includes(String(command.action))) break;
          } else if (command.type === 'BUY_ITEM' || command.type === 'QUICK_CHAT') {
            const value = command.type === 'BUY_ITEM' ? command.itemId : command.chatId;
            if (typeof value !== 'string' || value.length > 80) break;
          } else break;
          if (Number(command.seq) <= (session.lastCommandSeq ?? -1)) break;
          session.lastCommandSeq = Number(command.seq);
          const hostSession = sessions.get(room.hostId);
          if (!hostSession || hostSession.ws.readyState !== WebSocket.OPEN) break;

          // Server stamps authentic sender playerId before forwarding to host
          sendJson(hostSession.ws, {
            type: 'game:input',
            fromPlayerId: playerId,
            command: { ...command, playerId },
          });
          break;
        }

        case 'game:state': {
          if (!session.roomCode) break;
          const room = rooms.get(session.roomCode);
          if (!room || room.hostId !== playerId || room.status !== 'playing') break;
          if (!canAcceptSnapshot(room.lastSnapshot, msg.snapshot)) break;
          room.lastSnapshot = msg.snapshot as Record<string, unknown>;
          broadcastToRoom(
            room,
            { type: 'game:state', snapshot: msg.snapshot },
            playerId
          );
          break;
        }

        case 'game:fx': {
          if (!session.roomCode) break;
          const room = rooms.get(session.roomCode);
          if (!room || room.hostId !== playerId) break;
          broadcastToRoom(
            room,
            { type: 'game:fx', events: msg.events },
            playerId
          );
          break;
        }

        case 'game:end': {
          if (!session.roomCode) break;
          const room = rooms.get(session.roomCode);
          if (!room || room.hostId !== playerId) break;
          if (room.status !== 'playing' || !room.lastSnapshot?.matchResult) break;
          room.status = 'waiting';
          room.lastSnapshot = undefined;
          for (const p of room.players) {
            p.ready = p.isHost;
          }
          broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
          broadcastPublicRoomList();
          break;
        }

        case 'rtc:offer':
        case 'rtc:answer':
        case 'rtc:ice': {
          if (!session.roomCode || typeof msg.to !== 'string') break;
          const room = rooms.get(session.roomCode);
          if (!room) break;
          // Ensure target peer is in the exact same room
          const targetInRoom = room.players.some((p) => p.id === msg.to);
          if (!targetInRoom) break;
          const targetSession = sessions.get(msg.to);
          if (!targetSession || targetSession.ws.readyState !== WebSocket.OPEN) break;

          sendJson(targetSession.ws, {
            type: msg.type,
            from: playerId,
            sdp: msg.sdp,
            candidate: msg.candidate,
          });
          break;
        }

        default:
          break;
      }
    });

    ws.on('close', () => {
      if (session.ws !== ws) return;
      if (!session.roomCode) { sessions.delete(playerId); return; }
      const currentRoom = rooms.get(session.roomCode);
      if (currentRoom?.status === 'playing' && currentRoom.hostId !== playerId) {
        const host = sessions.get(currentRoom.hostId);
        if (host) sendJson(host.ws, { type: 'game:input', fromPlayerId: playerId, command: { type: 'MOVE', playerId, seq: session.lastCommandSeq ?? 0, vx: 0, vy: 0 } });
      }
      session.expiresAt = Date.now() + 60000;
      setTimeout(() => {
        if (session.ws !== ws || !session.expiresAt || session.expiresAt > Date.now()) return;
        leaveCurrentRoom(session);
        sessions.delete(playerId);
      }, 60500);
    });
  });

  // WebSocket heartbeat cleanup
  const heartbeat = setInterval(() => {
    for (const [id, sess] of sessions.entries()) {
      if (sess.ws.readyState !== WebSocket.OPEN) continue;
      if (!sess.isAlive) {
        sess.ws.terminate();
        continue;
      }
      sess.isAlive = false;
      sess.ws.ping();
    }
  }, 25000);

  wss.on('close', () => clearInterval(heartbeat));

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output missing');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Nur Legends Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
