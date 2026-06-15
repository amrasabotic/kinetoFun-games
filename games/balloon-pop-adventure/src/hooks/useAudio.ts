import { useRef, useCallback } from 'react';
import type { Settings } from '../game/types';

// ─── Audio engine using Web Audio API (no external files) ─────────────────

type SoundName = 'pop' | 'goldPop' | 'bomb' | 'freeze' | 'rainbow' | 'countdown' | 'victory' | 'tick';

export function useAudio(settings: Settings) {
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext | null {
    if (!settings.soundEnabled) return null;
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      try {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }

  const play = useCallback((name: string) => {
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (name as SoundName) {
      case 'pop':        playPop(ctx, now);        break;
      case 'goldPop':    playGoldPop(ctx, now);    break;
      case 'bomb':       playBomb(ctx, now);       break;
      case 'freeze':     playFreeze(ctx, now);     break;
      case 'rainbow':    playRainbow(ctx, now);    break;
      case 'countdown':  playCountdown(ctx, now);  break;
      case 'victory':    playVictory(ctx, now);    break;
      case 'tick':       playTick(ctx, now);       break;
    }
  }, [settings.soundEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const destroy = useCallback(() => {
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }, []);

  return { play, destroy };
}

// ─── Sound synthesizers ───────────────────────────────────────────────────

function playPop(ctx: AudioContext, t: number): void {
  // Short burst noise pop
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.6;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
}

function playGoldPop(ctx: AudioContext, t: number): void {
  // Bright ascending chord
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, t + i * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5 + i * 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + i * 0.04);
    osc.stop(t + 0.5 + i * 0.04);
  });
}

function playBomb(ctx: AudioContext, t: number): void {
  // Low rumble + explosion
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
  gain.gain.setValueAtTime(0.7, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.35);

  // Noise layer
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.5, t);
  src.connect(ng);
  ng.connect(ctx.destination);
  src.start(t);
}

function playFreeze(ctx: AudioContext, t: number): void {
  // Crystalline bell cascade
  const freqs = [1200, 1600, 2000, 1400];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, t + i * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6 + i * 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + i * 0.07);
    osc.stop(t + 0.6 + i * 0.07);
  });
}

function playRainbow(ctx: AudioContext, t: number): void {
  // Ascending glissando
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(261.63, t);      // C4
  osc.frequency.exponentialRampToValueAtTime(1046.5, t + 0.5);  // C6
  gain.gain.setValueAtTime(0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.7);
}

function playCountdown(ctx: AudioContext, t: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880; // A5
  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

function playVictory(ctx: AudioContext, t: number): void {
  // Fanfare — C major arpeggio then chord
  const melody = [
    [0,    261.63, 0.08],
    [0.1,  329.63, 0.08],
    [0.2,  392.00, 0.08],
    [0.3,  523.25, 0.15],
    [0.5,  523.25, 0.15],
    [0.65, 659.25, 0.15],
    [0.8,  783.99, 0.3],
  ] as [number, number, number][];

  for (const [delay, freq, dur] of melody) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.35, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + delay);
    osc.stop(t + delay + dur);
  }
}

function playTick(ctx: AudioContext, t: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.05);
}
