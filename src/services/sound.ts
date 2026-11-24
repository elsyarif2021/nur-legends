class SoundEngine {
  private ctx: AudioContext | null = null;
  private volume = 0.65;
  private muted = false;
  private ambientEnabled = true;
  private ambientGain: GainNode | null = null;
  private ambientRunning = false;
  private ambientTimer: number | null = null;
  private lastFootstepTime = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public configure(volume: number, muted: boolean, ambientEnabled: boolean): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.muted = muted;
    this.ambientEnabled = ambientEnabled;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(
        this.muted || !this.ambientEnabled ? 0 : this.volume * 0.08,
        this.ctx.currentTime,
        0.15
      );
    }
    if (this.muted || !this.ambientEnabled) {
      this.stopAmbientChimes();
    }
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && this.ambientEnabled && !this.muted && !this.ambientRunning) {
      this.startAmbient();
    }
  }

  public startAmbient(): void {
    if (this.muted || !this.ambientEnabled || this.ambientRunning) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.ambientRunning = true;

    // Gentle desert breeze filtered noise
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 1.8;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 340;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.value = this.volume * 0.06;
    this.ambientGain = gain;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    // Soft Hijaz-inspired gentle wind chime notes every few seconds
    const scale = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    this.ambientTimer = window.setInterval(() => {
      if (this.muted || !this.ambientEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const note = scale[Math.floor(Math.random() * scale.length)];
      this.playTone(note, 0.9, 'sine', 0.035, 0.06);
    }, 3800);
  }

  private stopAmbientChimes(): void {
    if (this.ambientTimer !== null) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainScale: number,
    attack = 0.01,
    freqEnd?: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
    }
    const peak = Math.max(0.001, this.volume * gainScale);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick(): void {
    this.playTone(620, 0.08, 'triangle', 0.14, 0.005, 820);
  }

  public playFootstep(): void {
    const now = performance.now();
    if (now - this.lastFootstepTime < 280) return;
    this.lastFootstepTime = now;
    this.playTone(135 + Math.random() * 25, 0.055, 'sine', 0.05, 0.004, 80);
  }

  public playAttack(isRanged: boolean): void {
    if (isRanged) {
      this.playTone(760, 0.12, 'triangle', 0.14, 0.005, 340);
    } else {
      this.playTone(260, 0.11, 'sawtooth', 0.1, 0.005, 110);
    }
  }

  public playHit(): void {
    this.playTone(190, 0.09, 'square', 0.08, 0.003, 75);
  }

  public playSkill(isUltimate = false): void {
    if (isUltimate) {
      this.playTone(440, 0.35, 'triangle', 0.22, 0.01, 880);
      setTimeout(() => this.playTone(659.25, 0.35, 'sine', 0.18, 0.01, 987.77), 70);
    } else {
      this.playTone(520, 0.18, 'sine', 0.16, 0.008, 780);
    }
  }

  public playHeal(): void {
    this.playTone(523.25, 0.25, 'sine', 0.14, 0.02, 659.25);
    setTimeout(() => this.playTone(783.99, 0.28, 'sine', 0.12, 0.02), 80);
  }

  public playLevelUp(): void {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.26, 'triangle', 0.16, 0.01), idx * 75);
    });
  }

  public playTurretDestroy(): void {
    this.playTone(180, 0.45, 'sawtooth', 0.2, 0.01, 55);
    setTimeout(() => this.playTone(330, 0.35, 'triangle', 0.16, 0.01, 165), 90);
  }

  public playVictory(): void {
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.42, 'triangle', 0.2, 0.015), idx * 120);
    });
  }

  public playDefeat(): void {
    const tones = [392, 349.23, 311.13, 261.63];
    tones.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.4, 'sine', 0.18, 0.02), idx * 140);
    });
  }
}

export const soundEngine = new SoundEngine();
