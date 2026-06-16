export class AudioSynth {
  private ac: AudioContext | null = null;
  enabled = true;

  private getAC(): AudioContext {
    if (!this.ac) this.ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return this.ac;
  }

  beep(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0): void {
    if (!this.enabled) return;
    try {
      const a = this.getAC();
      const o = a.createOscillator();
      const g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, a.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + delay + dur);
      o.start(a.currentTime + delay);
      o.stop(a.currentTime + delay + dur + 0.05);
    } catch {}
  }

  chop()    { this.beep(180, 0.08, 'sawtooth', 0.45); this.beep(110, 0.12, 'sawtooth', 0.25, 0.07); }
  sizzle()  { for (let i = 0; i < 3; i++) this.beep(200 + Math.random() * 300, 0.06, 'sawtooth', 0.1, i * 0.04); }
  success() { [523, 659, 784].forEach((f, i) => this.beep(f, 0.18, 'sine', 0.22, i * 0.06)); }
  comboUp() { [784, 880, 988, 1047].forEach((f, i) => this.beep(f, 0.14, 'triangle', 0.2, i * 0.07)); }
  perfect() { [1047, 1175, 1319, 1568].forEach((f, i) => this.beep(f, 0.16, 'sine', 0.28, i * 0.05)); }
  fail()    { this.beep(110, 0.4, 'sawtooth', 0.3); this.beep(80, 0.35, 'sawtooth', 0.2, 0.12); }
  flip()    { this.beep(440, 0.08, 'triangle', 0.35); this.beep(660, 0.14, 'sine', 0.28, 0.09); }
  place()   { this.beep(660, 0.1, 'sine', 0.28); this.beep(880, 0.08, 'sine', 0.18, 0.09); }
  catch_()  { this.beep(523, 0.1, 'triangle', 0.3); this.beep(659, 0.08, 'sine', 0.2, 0.08); }
  countdown() { this.beep(660, 0.12, 'sine', 0.3); }
  go()      { this.beep(880, 0.18, 'sine', 0.4); this.beep(1100, 0.22, 'sine', 0.35, 0.14); }
  star()    { [784, 988, 1175, 1568].forEach((f, i) => this.beep(f, 0.22, 'sine', 0.28, i * 0.12)); }
  select()  { this.beep(880, 0.07, 'sine', 0.2); }
  stir()    { this.beep(280 + Math.random() * 80, 0.05, 'sine', 0.08); }
  miss()    { this.beep(220, 0.15, 'sawtooth', 0.2); }
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => this.beep(f, 0.3, 'sine', 0.25, i * 0.1));
    [784, 988, 1047, 1319].forEach((f, i) => this.beep(f, 0.3, 'triangle', 0.2, 0.4 + i * 0.1));
  }
  unlock()  { [523, 784, 1047, 1568].forEach((f, i) => this.beep(f, 0.25, 'sine', 0.3, i * 0.15)); }

  /** Must be called inside a user gesture to resume suspended AudioContext */
  resume(): void {
    if (this.ac && this.ac.state === 'suspended') this.ac.resume();
    if (!this.ac) this.getAC();
  }
}

export const audioSynth = new AudioSynth();
