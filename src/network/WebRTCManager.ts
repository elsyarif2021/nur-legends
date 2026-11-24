import { onlineClient } from './OnlineRoomClient';

export interface MediaSnapshot {
  camOn: boolean;
  micOn: boolean;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  speakingIds: Record<string, boolean>;
  error: string | null;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class WebRTCManager {
  private localStream: MediaStream | null = null;
  private camOn = false;
  private micOn = false;
  private lastError: string | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private speakingIds = new Map<string, boolean>();
  private listeners = new Set<(snap: MediaSnapshot) => void>();
  private audioCtx: AudioContext | null = null;
  private analyserCleanups = new Map<string, () => void>();
  private unsubSignal: (() => void) | null = null;

  public subscribe(listener: (snap: MediaSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): MediaSnapshot {
    const remoteObj: Record<string, MediaStream> = {};
    for (const [id, st] of this.remoteStreams.entries()) {
      remoteObj[id] = st;
    }
    const speakObj: Record<string, boolean> = {};
    for (const [id, sp] of this.speakingIds.entries()) {
      if (sp) speakObj[id] = true;
    }
    return {
      camOn: this.camOn,
      micOn: this.micOn,
      localStream: this.localStream,
      remoteStreams: remoteObj,
      speakingIds: speakObj,
      error: this.lastError,
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const l of this.listeners) l(snap);
  }

  public bindRoomSignaling(): void {
    if (this.unsubSignal) return;
    this.unsubSignal = onlineClient.subscribe({
      onRoomState: (room) => {
        if (!room) {
          this.closeAllPeers();
          return;
        }
        const localId = onlineClient.getPlayerId();
        if (!localId) return;
        const activePeerIds = new Set(
          room.players.filter((p) => p.id !== localId).map((p) => p.id)
        );
        // Remove stale peers
        for (const peerId of [...this.peers.keys()]) {
          if (!activePeerIds.has(peerId)) {
            this.removePeer(peerId);
          }
        }
        // Connect to new peers
        for (const peerId of activePeerIds) {
          if (!this.peers.has(peerId)) {
            const shouldOffer = localId < peerId;
            void this.ensurePeerConnection(peerId, shouldOffer);
          }
        }
      },
      onPeerLeft: (peerId) => {
        this.removePeer(peerId);
      },
      onRtcSignal: (msg) => {
        void this.handleSignal(msg);
      },
    });
  }

  public async toggleCamera(nextOn?: boolean): Promise<boolean> {
    const target = nextOn !== undefined ? nextOn : !this.camOn;
    this.lastError = null;
    if (!target) {
      if (this.localStream) {
        for (const tr of this.localStream.getVideoTracks()) {
          tr.stop();
          this.localStream.removeTrack(tr);
        }
      }
      this.camOn = false;
      this.cleanupEmptyLocalStream();
      onlineClient.updateMember({ camOn: false });
      await this.syncTracksToPeers();
      this.emit();
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.lastError = 'Browser ini tidak mendukung akses kamera.';
      this.emit();
      return false;
    }

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
      });
      const vTrack = videoStream.getVideoTracks()[0];
      if (!vTrack) throw new Error('Kamera tidak tersedia.');

      if (!this.localStream) {
        this.localStream = new MediaStream([vTrack]);
      } else {
        for (const old of this.localStream.getVideoTracks()) {
          old.stop();
          this.localStream.removeTrack(old);
        }
        this.localStream.addTrack(vTrack);
      }

      this.camOn = true;
      onlineClient.updateMember({ camOn: true });
      await this.syncTracksToPeers();
      this.emit();
      return true;
    } catch {
      this.lastError = 'Izin kamera ditolak atau kamera tidak ditemukan.';
      this.camOn = false;
      onlineClient.updateMember({ camOn: false });
      this.emit();
      return false;
    }
  }

  public async toggleMicrophone(nextOn?: boolean): Promise<boolean> {
    const target = nextOn !== undefined ? nextOn : !this.micOn;
    this.lastError = null;
    if (!target) {
      if (this.localStream) {
        for (const tr of this.localStream.getAudioTracks()) {
          tr.stop();
          this.localStream.removeTrack(tr);
        }
      }
      this.micOn = false;
      this.stopVolumeMonitor('local');
      this.cleanupEmptyLocalStream();
      onlineClient.updateMember({ micOn: false });
      await this.syncTracksToPeers();
      this.emit();
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.lastError = 'Browser ini tidak mendukung akses mikrofon.';
      this.emit();
      return false;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const aTrack = audioStream.getAudioTracks()[0];
      if (!aTrack) throw new Error('Mikrofon tidak tersedia.');

      if (!this.localStream) {
        this.localStream = new MediaStream([aTrack]);
      } else {
        for (const old of this.localStream.getAudioTracks()) {
          old.stop();
          this.localStream.removeTrack(old);
        }
        this.localStream.addTrack(aTrack);
      }

      this.micOn = true;
      this.startVolumeMonitor('local', this.localStream);
      onlineClient.updateMember({ micOn: true });
      await this.syncTracksToPeers();
      this.emit();
      return true;
    } catch {
      this.lastError = 'Izin mikrofon ditolak atau mikrofon tidak ditemukan.';
      this.micOn = false;
      onlineClient.updateMember({ micOn: false });
      this.emit();
      return false;
    }
  }

  public stopLocalMedia(): void {
    if (this.localStream) {
      for (const tr of this.localStream.getTracks()) {
        tr.stop();
      }
      this.localStream = null;
    }
    this.camOn = false;
    this.micOn = false;
    this.stopVolumeMonitor('local');
    onlineClient.updateMember({ camOn: false, micOn: false });
    this.closeAllPeers();
    this.emit();
  }

  private cleanupEmptyLocalStream(): void {
    if (this.localStream && this.localStream.getTracks().length === 0) {
      this.localStream = null;
    }
  }

  private async ensurePeerConnection(peerId: string, initiateOffer: boolean): Promise<RTCPeerConnection> {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peers.set(peerId, pc);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        onlineClient.sendRtcSignal('rtc:ice', peerId, {
          candidate: ev.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (ev) => {
      let stream = ev.streams[0];
      if (!stream) {
        stream = this.remoteStreams.get(peerId) || new MediaStream();
        stream.addTrack(ev.track);
      }
      this.remoteStreams.set(peerId, stream);
      if (ev.track.kind === 'audio') {
        this.startVolumeMonitor(peerId, stream);
      }
      ev.track.onended = () => {
        this.emit();
      };
      this.emit();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(peerId);
      }
    };

    if (initiateOffer) {
      try {
        // Ensure a transceiver exists even if local stream isn't active yet so peer can send us media
        if (!this.localStream) {
          pc.addTransceiver('audio', { direction: 'recvonly' });
          pc.addTransceiver('video', { direction: 'recvonly' });
        }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        onlineClient.sendRtcSignal('rtc:offer', peerId, {
          sdp: pc.localDescription || offer,
        });
      } catch {
        // Ignore transient negotiation errors
      }
    }

    return pc;
  }

  private async syncTracksToPeers(): Promise<void> {
    for (const [peerId, pc] of this.peers.entries()) {
      const senders = pc.getSenders();
      const tracks = this.localStream ? this.localStream.getTracks() : [];

      for (const sender of senders) {
        if (sender.track && !tracks.some((t) => t.id === sender.track?.id)) {
          pc.removeTrack(sender);
        }
      }

      for (const track of tracks) {
        const alreadySending = senders.some((s) => s.track?.id === track.id);
        if (!alreadySending && this.localStream) {
          pc.addTrack(track, this.localStream);
        }
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        onlineClient.sendRtcSignal('rtc:offer', peerId, {
          sdp: pc.localDescription || offer,
        });
      } catch {
        // Ignore renegotiation glare
      }
    }
  }

  private async handleSignal(msg: {
    type: 'rtc:offer' | 'rtc:answer' | 'rtc:ice';
    from: string;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  }): Promise<void> {
    if (!msg.from) return;
    const pc = await this.ensurePeerConnection(msg.from, false);

    try {
      if (msg.type === 'rtc:offer' && msg.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        onlineClient.sendRtcSignal('rtc:answer', msg.from, {
          sdp: pc.localDescription || answer,
        });
      } else if (msg.type === 'rtc:answer' && msg.sdp) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        }
      } else if (msg.type === 'rtc:ice' && msg.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      }
    } catch {
      // Ignore stale ICE / SDP timing mismatches
    }
  }

  private removePeer(peerId: string): void {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.stopVolumeMonitor(peerId);
    this.emit();
  }

  private closeAllPeers(): void {
    for (const peerId of [...this.peers.keys()]) {
      this.removePeer(peerId);
    }
  }

  private startVolumeMonitor(id: string, stream: MediaStream): void {
    this.stopVolumeMonitor(id);
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx || stream.getAudioTracks().length === 0) return;

    try {
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const timer = window.setInterval(() => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        const speaking = avg > 14;
        if (this.speakingIds.get(id) !== speaking) {
          this.speakingIds.set(id, speaking);
          this.emit();
        }
      }, 180);

      this.analyserCleanups.set(id, () => {
        window.clearInterval(timer);
        try {
          source.disconnect();
        } catch {
          // ignore
        }
        this.speakingIds.delete(id);
      });
    } catch {
      // ignore AudioContext restriction
    }
  }

  private stopVolumeMonitor(id: string): void {
    const cleanup = this.analyserCleanups.get(id);
    if (cleanup) {
      cleanup();
      this.analyserCleanups.delete(id);
    }
  }
}

export const webrtcManager = new WebRTCManager();
