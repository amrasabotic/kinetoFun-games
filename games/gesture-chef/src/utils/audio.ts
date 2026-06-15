// Synthesized audio via Web Audio API — no external files required.

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicIntervalId: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  soundEnabled = true;
  musicEnabled = false;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.3,
    delay = 0
  ): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(this.masterGain);
      osc.type = type;
      osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.01);
    } catch { /* ignore */ }
  }

  chop(): void {
    this.tone(180, 0.04, 'sawtooth', 0.4);
    this.tone(130, 0.07, 'sawtooth', 0.25, 0.04);
  }

  combo(level: number): void {
    const base = [523, 659, 784, 988, 1175];
    const notes = base.slice(0, Math.min(level + 1, base.length));
    notes.forEach((f, i) => this.tone(f, 0.18, 'sine', 0.32, i * 0.09));
  }

  stir(): void {
    this.tone(380 + Math.random() * 60, 0.08, 'sine', 0.12);
  }

  bubble(): void {
    this.tone(350 + Math.random() * 150, 0.06, 'sine', 0.1);
  }

  sizzle(): void {
    this.tone(300, 0.05, 'sawtooth', 0.15);
    this.tone(250, 0.08, 'sawtooth', 0.1, 0.03);
  }

  flip(): void {
    this.tone(523, 0.08, 'sine', 0.28);
    this.tone(698, 0.15, 'sine', 0.22, 0.08);
  }

  perfectFlip(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.3, i * 0.08));
  }

  decorate(): void {
    this.tone(880, 0.08, 'sine', 0.18);
    this.tone(1100, 0.06, 'sine', 0.12, 0.06);
  }

  miss(): void {
    this.tone(220, 0.12, 'sawtooth', 0.2);
    this.tone(180, 0.1, 'sawtooth', 0.15, 0.1);
  }

  star(): void {
    [784, 988, 1175, 1568].forEach((f, i) =>
      this.tone(f, 0.22, 'sine', 0.28, i * 0.1)
    );
  }

  complete(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.tone(f, 0.28, 'sine', 0.3, i * 0.11);
      this.tone(f * 1.5, 0.18, 'sine', 0.15, i * 0.11 + 0.06);
    });
  }

  unlock(): void {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) =>
      this.tone(f, 0.3, 'triangle', 0.32, i * 0.1)
    );
  }

  tick(): void {
    this.tone(900, 0.04, 'sine', 0.1);
  }

  startMusic(): void {
    if (!this.musicEnabled || this.musicIntervalId !== null) return;
    const melody = [261, 294, 329, 349, 392, 349, 329, 294];
    const bass   = [130, 130, 165, 174, 196, 174, 165, 130];
    this.musicStep = 0;
    this.musicIntervalId = setInterval(() => {
      const i = this.musicStep % melody.length;
      this.tone(melody[i], 0.25, 'triangle', 0.08);
      this.tone(bass[i],   0.3,  'sine',     0.05);
      this.musicStep++;
    }, 300);
  }

  stopMusic(): void {
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  setSoundEnabled(v: boolean): void { this.soundEnabled = v; }

  setMusicEnabled(v: boolean): void {
    this.musicEnabled = v;
    if (v) this.startMusic();
    else this.stopMusic();
  }
}

export const audioManager = new AudioManager();
