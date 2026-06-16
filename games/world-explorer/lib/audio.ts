let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3, delay = 0) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();
    osc.connect(gainNode);
    gainNode.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    gainNode.gain.setValueAtTime(0, ac.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(gain, ac.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration + 0.05);
  } catch {}
}

export function playCorrect() {
  playTone(523, 0.12, 'sine', 0.25, 0);
  playTone(659, 0.12, 'sine', 0.25, 0.1);
  playTone(784, 0.25, 'sine', 0.3, 0.2);
}

export function playWrong() {
  playTone(220, 0.1, 'sawtooth', 0.2, 0);
  playTone(196, 0.2, 'sawtooth', 0.2, 0.12);
}

export function playStreak(multiplier: number) {
  const notes = [523, 659, 784, 1047];
  const count = Math.min(multiplier, notes.length);
  for (let i = 0; i < count; i++) {
    playTone(notes[i], 0.15, 'sine', 0.2, i * 0.1);
  }
}

export function playSelect() {
  playTone(880, 0.06, 'sine', 0.15);
}

export function playHover() {
  playTone(660, 0.04, 'sine', 0.08);
}

export function playWave() {
  playTone(440, 0.08, 'sine', 0.1, 0);
  playTone(550, 0.08, 'sine', 0.1, 0.1);
  playTone(440, 0.08, 'sine', 0.1, 0.2);
}

export function playArrival() {
  playTone(392, 0.1, 'sine', 0.2, 0);
  playTone(494, 0.1, 'sine', 0.2, 0.1);
  playTone(587, 0.2, 'sine', 0.25, 0.2);
}
