type OscType = OscillatorType;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicNodes: OscillatorNode[] = [];
  private musicLfoNodes: OscillatorNode[] = [];
  private musicEnabled = true;
  private sfxEnabled = true;
  private musicVolume = 0.25;
  private sfxVolume = 0.5;
  private currentEnv: string | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1;
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicVolume;
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(this.masterGain);
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  /** Resume AudioContext (must be called from a user gesture) */
  resume(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  beep(
    freq: number,
    dur: number,
    type: OscType = 'sine',
    vol = 0.4,
    delay = 0
  ): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur + 0.05);
  }

  sfxJump(): void {
    // Rising tone
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.sfxEnabled) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(520, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  sfxSlide(): void {
    // Whoosh descending
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.sfxEnabled) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  }

  sfxLaneChange(): void {
    // Quick click
    this.beep(600, 0.06, 'square', 0.2);
  }

  sfxCoin(): void {
    // Bright ping
    this.beep(880, 0.08, 'sine', 0.35);
    this.beep(1320, 0.06, 'sine', 0.2, 0.08);
  }

  sfxPowerUp(): void {
    // Ascending arpeggio
    [523, 659, 784, 1047].forEach((f, i) => {
      this.beep(f, 0.12, 'sine', 0.3, i * 0.08);
    });
  }

  sfxCollision(): void {
    // Bass thud
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.sfxEnabled) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);

    // Noise burst
    const bufSize = ctx.sampleRate * 0.15;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.5, ctx.currentTime);
    nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    src.connect(nGain);
    nGain.connect(this.sfxGain);
    src.start(ctx.currentTime);
  }

  sfxGameOver(): void {
    // Descending dramatic
    [440, 370, 294, 220].forEach((f, i) => {
      this.beep(f, 0.4, 'square', 0.3, i * 0.18);
    });
  }

  sfxCountdown(): void {
    this.beep(440, 0.1, 'sine', 0.4);
  }

  sfxCountdownGo(): void {
    // Rising GO!
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.sfxEnabled) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  }

  sfxShield(): void {
    // Shield activation chime
    [660, 880, 1100].forEach((f, i) => {
      this.beep(f, 0.15, 'sine', 0.25, i * 0.07);
    });
  }

  // ---- Background Music ----

  private getMusicFreq(env: string): number[] {
    switch (env) {
      case 'neon-city': return [55, 82.5, 110, 165];
      case 'jungle':    return [65.4, 98.0, 130.8, 196];
      case 'desert':    return [73.4, 110, 146.8, 220];
      case 'snow':      return [61.7, 92.5, 123.5, 185];
      default:          return [55, 82.5, 110, 165];
    }
  }

  startMusic(env: string): void {
    if (!this.musicEnabled) return;
    if (this.currentEnv === env) return;
    this.stopMusic();
    this.currentEnv = env;

    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const freqs = this.getMusicFreq(env);

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = 0.08 / (i + 1);
      osc.connect(gain);
      gain.connect(this.musicGain!);
      osc.start();
      this.musicNodes.push(osc);

      // Slow LFO for pulse
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.3 + i * 0.07;
      lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      this.musicLfoNodes.push(lfo);
    });
  }

  stopMusic(): void {
    this.musicNodes.forEach((n) => { try { n.stop(); } catch {} });
    this.musicLfoNodes.forEach((n) => { try { n.stop(); } catch {} });
    this.musicNodes = [];
    this.musicLfoNodes = [];
    this.currentEnv = null;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
    if (this.musicGain) {
      this.musicGain.gain.value = enabled ? this.musicVolume : 0;
    }
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (this.sfxGain) {
      this.sfxGain.gain.value = enabled ? this.sfxVolume : 0;
    }
  }

  setVolume(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    if (this.musicGain) this.musicGain.gain.value = this.musicEnabled ? music : 0;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxEnabled ? sfx : 0;
  }

  dispose(): void {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

// Singleton
let _instance: AudioManager | null = null;
export function getAudioManager(): AudioManager {
  if (!_instance) _instance = new AudioManager();
  return _instance;
}
