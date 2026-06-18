let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.18,
  startAt = 0,
  freqEnd?: number,
): void {
  const c = ac();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    const t = c.currentTime + startAt;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    }
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  } catch { /* audio unavailable */ }
}

export function playJumpSound(): void {
  tone(523, 0.13, 'square', 0.16, 0, 700);
}

export function playDuckSound(): void {
  tone(330, 0.1, 'square', 0.12, 0, 220);
}

export function playGameOverSound(): void {
  // Descending tones
  tone(880, 0.18, 'square', 0.18, 0);
  tone(660, 0.18, 'square', 0.15, 0.15);
  tone(440, 0.18, 'square', 0.13, 0.30);
  tone(220, 0.28, 'square', 0.15, 0.45);
}

export function playMilestoneSound(): void {
  // Ascending arpeggio
  ([523, 659, 784, 1047] as const).forEach((f, i) => {
    tone(f, 0.1, 'triangle', 0.12, i * 0.065);
  });
}
