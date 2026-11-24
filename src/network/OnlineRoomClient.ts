import { getWebSocketUrl } from '../config/endpoints';
import {
  HeroId,
  OnlineChatMessage,
  OnlineFxEvent,
  OnlineRoomState,
  OnlineRoomSummary,
  OnlineWorldSnapshot,
  TeamSide,
} from '../types/game';
import { MatchCommand } from './MatchTransport';

export type OnlineConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface OnlineClientEvents {
  onStatusChange?: (status: OnlineConnectionStatus) => void;
  onWelcome?: (playerId: string) => void;
  onRoomList?: (rooms: OnlineRoomSummary[]) => void;
  onRoomState?: (room: OnlineRoomState | null) => void;
  onRoomStarted?: (room: OnlineRoomState) => void;
  onRoomChat?: (message: OnlineChatMessage) => void;
  onError?: (message: string) => void;
  onPeerJoined?: (peerId: string) => void;
  onPeerLeft?: (peerId: string) => void;
  onRtcSignal?: (msg: {
    type: 'rtc:offer' | 'rtc:answer' | 'rtc:ice';
    from: string;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  }) => void;
  onGameInput?: (fromPlayerId: string, command: MatchCommand) => void;
  onGameState?: (snapshot: OnlineWorldSnapshot) => void;
  onGameFx?: (events: OnlineFxEvent[]) => void;
}

class OnlineRoomClient {
  private ws: WebSocket | null = null;
  private status: OnlineConnectionStatus = 'disconnected';
  private playerId: string | null = null;
  private room: OnlineRoomState | null = null;
  private rooms: OnlineRoomSummary[] = [];
  private listeners = new Set<OnlineClientEvents>();
  private reconnectTimer: number | null = null;
  private intentionalClose = false;
  private reconnectAttempts = 0;

  public subscribe(listener: OnlineClientEvents): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): OnlineConnectionStatus {
    return this.status;
  }

  public getPlayerId(): string | null {
    return this.playerId;
  }

  public getRoom(): OnlineRoomState | null {
    return this.room;
  }

  public getRoomList(): OnlineRoomSummary[] {
    return this.rooms;
  }

  public connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.intentionalClose = false;
    this.setStatus('connecting');

    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(ev.data) as Record<string, unknown>;
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;
      this.handleMessage(msg);
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.setStatus('disconnected');
      if (!this.intentionalClose) {
        if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
        const delay = Math.min(15000, 1000 * 2 ** Math.min(4, this.reconnectAttempts++));
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null;
          if (!this.intentionalClose) this.connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      // handled by onclose
    };
  }

  public disconnect(): void {
    this.intentionalClose = true;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.room = null;
    this.playerId = null;
    this.setStatus('disconnected');
  }

  private setStatus(next: OnlineConnectionStatus): void {
    this.status = next;
    for (const l of this.listeners) l.onStatusChange?.(next);
  }

  private send(payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private handleMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case 'welcome': {
        const previousId = this.playerId;
        this.playerId = String(msg.playerId || '');
        if (previousId && previousId !== this.playerId && this.room) {
          this.room = null;
          for (const l of this.listeners) { l.onRoomState?.(null); l.onError?.('Koneksi pulih. Silakan masuk kembali ke ruang permainan.'); }
        }
        if (Array.isArray(msg.rooms)) {
          this.rooms = msg.rooms as OnlineRoomSummary[];
          for (const l of this.listeners) l.onRoomList?.(this.rooms);
        }
        for (const l of this.listeners) l.onWelcome?.(this.playerId);
        break;
      }
      case 'room:list': {
        this.rooms = Array.isArray(msg.rooms) ? (msg.rooms as OnlineRoomSummary[]) : [];
        for (const l of this.listeners) l.onRoomList?.(this.rooms);
        break;
      }
      case 'room:state': {
        this.room = (msg.room as OnlineRoomState) || null;
        for (const l of this.listeners) l.onRoomState?.(this.room);
        break;
      }
      case 'room:started': {
        this.room = (msg.room as OnlineRoomState) || null;
        if (this.room) {
          for (const l of this.listeners) l.onRoomStarted?.(this.room);
        }
        break;
      }
      case 'room:left': {
        this.room = null;
        for (const l of this.listeners) l.onRoomState?.(null);
        break;
      }
      case 'room:chat': {
        if (msg.message) {
          for (const l of this.listeners) l.onRoomChat?.(msg.message as OnlineChatMessage);
        }
        break;
      }
      case 'room:error': {
        const message = typeof msg.message === 'string' ? msg.message : 'Terjadi kesalahan jaringan.';
        for (const l of this.listeners) l.onError?.(message);
        break;
      }
      case 'room:peer_joined': {
        const peer = msg.peer as { id?: string } | undefined;
        if (peer?.id) {
          for (const l of this.listeners) l.onPeerJoined?.(peer.id);
        }
        break;
      }
      case 'room:peer_left': {
        if (typeof msg.peerId === 'string') {
          for (const l of this.listeners) l.onPeerLeft?.(msg.peerId);
        }
        break;
      }
      case 'rtc:offer':
      case 'rtc:answer':
      case 'rtc:ice': {
        for (const l of this.listeners) {
          l.onRtcSignal?.({
            type: msg.type,
            from: String(msg.from || ''),
            sdp: msg.sdp as RTCSessionDescriptionInit | undefined,
            candidate: msg.candidate as RTCIceCandidateInit | undefined,
          });
        }
        break;
      }
      case 'game:input': {
        if (typeof msg.fromPlayerId === 'string' && msg.command) {
          for (const l of this.listeners) {
            l.onGameInput?.(msg.fromPlayerId, msg.command as MatchCommand);
          }
        }
        break;
      }
      case 'game:state': {
        if (msg.snapshot) {
          for (const l of this.listeners) {
            l.onGameState?.(msg.snapshot as OnlineWorldSnapshot);
          }
        }
        break;
      }
      case 'game:fx': {
        if (Array.isArray(msg.events)) {
          for (const l of this.listeners) {
            l.onGameFx?.(msg.events as OnlineFxEvent[]);
          }
        }
        break;
      }
      default:
        break;
    }
  }

  public refreshRooms(): void {
    this.send({ type: 'room:list' });
  }

  public createRoom(opts: {
    playerName: string;
    roomName: string;
    heroId: HeroId;
    isPublic: boolean;
    camOn: boolean;
    micOn: boolean;
  }): void {
    this.send({ type: 'room:create', ...opts });
  }

  public quickMatch(opts: {
    playerName: string;
    heroId: HeroId;
    camOn: boolean;
    micOn: boolean;
  }): void {
    this.send({ type: 'room:quick_match', ...opts });
  }

  public joinRoom(opts: {
    code: string;
    playerName: string;
    heroId: HeroId;
    camOn: boolean;
    micOn: boolean;
  }): void {
    this.send({ type: 'room:join', ...opts });
  }

  public updateMember(patch: {
    playerName?: string;
    heroId?: HeroId;
    team?: TeamSide;
    ready?: boolean;
    camOn?: boolean;
    micOn?: boolean;
  }): void {
    this.send({ type: 'room:update', ...patch });
  }

  public sendRoomChat(text: string): void {
    this.send({ type: 'room:chat', text });
  }

  public startMatch(): void {
    this.send({ type: 'room:start' });
  }

  public leaveRoom(): void {
    this.send({ type: 'room:leave' });
    this.room = null;
  }

  public sendGameInput(command: MatchCommand): void {
    this.send({ type: 'game:input', command });
  }

  public sendGameState(snapshot: OnlineWorldSnapshot): void {
    this.send({ type: 'game:state', snapshot });
  }

  public sendGameFx(events: OnlineFxEvent[]): void {
    if (events.length === 0) return;
    this.send({ type: 'game:fx', events });
  }

  public sendGameEnd(): void {
    this.send({ type: 'game:end' });
  }

  public sendRtcSignal(
    type: 'rtc:offer' | 'rtc:answer' | 'rtc:ice',
    to: string,
    payload: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
  ): void {
    this.send({ type, to, ...payload });
  }
}

export const onlineClient = new OnlineRoomClient();
