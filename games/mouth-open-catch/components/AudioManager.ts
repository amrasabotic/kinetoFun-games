export type SoundEffect =
  | 'catch' | 'coin' | 'diamond' | 'bomb' | 'rotten' | 'mushroom' | 'chili'
  | 'combo' | 'powerup' | 'gameOver' | 'levelUp' | 'treasure' | 'miss'
  | 'menuSelect' | 'menuHover' | 'countdown' | 'bossWave' | 'achievement';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private musicPlaying = false;
  private soundEnabled = true;
  private musicEnabled = true;
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private beatIndex = 0;

  constructor(soundEnabled: boolean, musicEnabled: boolean) {
    this.soundEnabled = soundEnabled;
    this.musicEnabled = musicEnabled;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private playTone(
    freq: number, duration: number, type: OscillatorType = 'sine',
    gainVal = 0.4, delay = 0, fadeOut = true
  ): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime + delay);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    }
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.01);
  }

  play(effect: SoundEffect): void {
    if (!this.soundEnabled) return;
    switch (effect) {
      case 'catch': this.playCatch(); break;
      case 'coin': this.playCoin(); break;
      case 'diamond': this.playDiamond(); break;
      case 'bomb': this.playBomb(); break;
      case 'rotten': this.playRotten(); break;
      case 'mushroom': this.playMushroom(); break;
      case 'chili': this.playChili(); break;
      case 'combo': this.playCombo(); break;
      case 'powerup': this.playPowerUp(); break;
      case 'gameOver': this.playGameOver(); break;
      case 'levelUp': this.playLevelUp(); break;
      case 'treasure': this.playTreasure(); break;
      case 'menuSelect': this.playMenuSelect(); break;
      case 'menuHover': this.playMenuHover(); break;
      case 'countdown': this.playCountdown(); break;
      case 'bossWave': this.playBossWave(); break;
      case 'achievement': this.playAchievement(); break;
      case 'miss': this.playMiss(); break;
    }
  }

  private playCatch(): void {
    this.playTone(523, 0.1, 'sine', 0.5);
    this.playTone(659, 0.1, 'sine', 0.4, 0.08);
  }

  private playCoin(): void {
    this.playTone(880, 0.08, 'sine', 0.4);
    this.playTone(1108, 0.12, 'sine', 0.35, 0.06);
  }

  private playDiamond(): void {
    const notes = [659, 784, 988, 1319];
    notes.forEach((f, i) => this.playTone(f, 0.12, 'sine', 0.3, i * 0.07));
  }

  private playBomb(): void {
    const ctx = this.ensureContext();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    src.buffer = buf;
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    src.start();
    src.stop(ctx.currentTime + 0.5);
  }

  private playRotten(): void {
    this.playTone(200, 0.2, 'sawtooth', 0.3);
    this.playTone(150, 0.3, 'sawtooth', 0.2, 0.1);
  }

  private playMushroom(): void {
    this.playTone(180, 0.15, 'sawtooth', 0.4);
    this.playTone(120, 0.25, 'sawtooth', 0.35, 0.1);
    this.playTone(90, 0.4, 'sine', 0.3, 0.2);
  }

  private playChili(): void {
    this.playTone(440, 0.05, 'sawtooth', 0.5);
    this.playTone(660, 0.05, 'sawtooth', 0.4, 0.05);
    this.playTone(880, 0.05, 'sawtooth', 0.3, 0.1);
  }

  private playCombo(): void {
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((f, i) => this.playTone(f, 0.1, 'sine', 0.35, i * 0.06));
  }

  private playPowerUp(): void {
    for (let i = 0; i < 8; i++) {
      this.playTone(220 + i * 110, 0.08, 'sine', 0.3, i * 0.05);
    }
  }

  private playGameOver(): void {
    const notes = [523, 494, 440, 392, 349];
    notes.forEach((f, i) => this.playTone(f, 0.3, 'sine', 0.4, i * 0.15));
  }

  private playLevelUp(): void {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => this.playTone(f, 0.12, 'triangle', 0.35, i * 0.07));
  }

  private playTreasure(): void {
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => this.playTone(f, 0.15, 'sine', 0.3, i * 0.06));
  }

  private playMenuSelect(): void {
    this.playTone(660, 0.08, 'sine', 0.35);
    this.playTone(880, 0.1, 'sine', 0.3, 0.07);
  }

  private playMenuHover(): void {
    this.playTone(440, 0.05, 'sine', 0.15);
  }

  private playCountdown(): void {
    this.playTone(880, 0.12, 'sine', 0.4);
  }

  private playBossWave(): void {
    const notes = [220, 277, 330, 440, 554, 659, 880];
    notes.forEach((f, i) => {
      this.playTone(f, 0.2, 'sawtooth', 0.2, i * 0.08);
      this.playTone(f * 2, 0.2, 'sine', 0.15, i * 0.08);
    });
  }

  private playAchievement(): void {
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
    notes.forEach((f, i) => this.playTone(f, 0.2, 'sine', 0.25, i * 0.08));
  }

  private playMiss(): void {
    this.playTone(220, 0.15, 'sawtooth', 0.2);
  }

  startMusic(): void {
    if (!this.musicEnabled || this.musicPlaying) return;
    this.musicPlaying = true;
    this.beatIndex = 0;
    this.playMusicBeat();
  }

  private playMusicBeat(): void {
    if (!this.musicPlaying || !this.musicEnabled) return;
    const ctx = this.ensureContext();
    const bpm = 128;
    const beatDur = 60 / bpm;

    const bassline = [110, 110, 138, 110, 165, 138, 110, 138];
    const melody =   [523, 659, 784, 659, 523,   0, 659, 784];

    const bass = bassline[this.beatIndex % bassline.length];
    const mel = melody[this.beatIndex % melody.length];

    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'triangle';
    bassOsc.frequency.value = bass;
    bassGain.gain.setValueAtTime(0.15, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + beatDur * 0.8);
    bassOsc.connect(bassGain);
    bassGain.connect(this.musicGain!);
    bassOsc.start();
    bassOsc.stop(ctx.currentTime + beatDur);

    if (mel > 0) {
      const melOsc = ctx.createOscillator();
      const melGain = ctx.createGain();
      melOsc.type = 'sine';
      melOsc.frequency.value = mel;
      melGain.gain.setValueAtTime(0.08, ctx.currentTime);
      melGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + beatDur * 0.6);
      melOsc.connect(melGain);
      melGain.connect(this.musicGain!);
      melOsc.start();
      melOsc.stop(ctx.currentTime + beatDur);
    }

    this.beatIndex++;
    this.musicInterval = setTimeout(() => this.playMusicBeat(), beatDur * 1000);
  }

  stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
    else if (!this.musicPlaying) this.startMusic();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }
}
