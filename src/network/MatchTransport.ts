import { BattleInputBridge, GameMode, HeroId, QuickChatId } from '../types/game';

export type MatchCommand =
  | { type: 'MOVE'; playerId: string; seq: number; vx: number; vy: number }
  | {
      type: 'ACTION';
      playerId: string;
      seq: number;
      action: 'basic' | 's1' | 's2' | 's3' | 'ult' | 'recall' | 'recovery';
    }
  | { type: 'BUY_ITEM'; playerId: string; seq: number; itemId: string }
  | { type: 'QUICK_CHAT'; playerId: string; seq: number; chatId: QuickChatId };

export interface MatchRoomConfig {
  mode: GameMode;
  localPlayerId: string;
  heroId: HeroId;
  tickRateHz: number;
}

export interface IMatchTransport {
  readonly kind: 'local-bot-sim' | 'remote-ws';
  connect(config: MatchRoomConfig): Promise<void>;
  sendCommand(cmd: MatchCommand): void;
  drainRemoteCommands(): MatchCommand[];
  disconnect(): void;
}

/**
 * Local deterministic command transport for 5v5 / Training bot simulation.
 * Isolates player command dispatch from Phaser simulation so a WebSocket or
 * WebRTC authoritative relay transport can replace it in Phase 4+ without
 * rewriting BattleScene combat logic.
 */
export class LocalBotTransport implements IMatchTransport {
  public readonly kind = 'local-bot-sim' as const;
  private commandQueue: MatchCommand[] = [];
  private seqCounter = 0;

  public async connect(_config: MatchRoomConfig): Promise<void> {
    this.commandQueue = [];
    this.seqCounter = 0;
  }

  public sendCommand(cmd: MatchCommand): void {
    this.commandQueue.push(cmd);
  }

  public enqueueBridgeInput(playerId: string, bridge: BattleInputBridge): void {
    this.sendCommand({
      type: 'MOVE',
      playerId,
      seq: ++this.seqCounter,
      vx: bridge.moveX,
      vy: bridge.moveY,
    });

    while (bridge.triggerQueue.length > 0) {
      const action = bridge.triggerQueue.shift()!;
      this.sendCommand({
        type: 'ACTION',
        playerId,
        seq: ++this.seqCounter,
        action,
      });
    }

    while (bridge.buyItemQueue.length > 0) {
      const itemId = bridge.buyItemQueue.shift()!;
      this.sendCommand({
        type: 'BUY_ITEM',
        playerId,
        seq: ++this.seqCounter,
        itemId,
      });
    }

    while (bridge.quickChatQueue.length > 0) {
      const chatId = bridge.quickChatQueue.shift()!;
      this.sendCommand({
        type: 'QUICK_CHAT',
        playerId,
        seq: ++this.seqCounter,
        chatId,
      });
    }
  }

  public drainRemoteCommands(): MatchCommand[] {
    if (this.commandQueue.length === 0) return [];
    const drained = this.commandQueue;
    this.commandQueue = [];
    return drained;
  }

  public disconnect(): void {
    this.commandQueue = [];
  }
}
