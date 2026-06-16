import type { HandData, GameAction } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { storage } from '@/storage/localStorage';

const settingsDwell = new DwellSystem(1100);

interface SettingItem {
  id: string;
  label: string;
  getValue: () => string;
}

const SETTINGS: SettingItem[] = [
  { id: 'sound',      label: '🔊 Sound Effects', getValue: () => storage.getOrDefault('settings').soundEnabled ? 'ON' : 'OFF' },
  { id: 'music',      label: '🎵 Music',          getValue: () => storage.getOrDefault('settings').musicEnabled ? 'ON' : 'OFF' },
  { id: 'difficulty', label: '⚡ Difficulty',     getValue: () => storage.getOrDefault('settings').difficulty.toUpperCase() },
  { id: 'handedness', label: '✋ Handedness',     getValue: () => storage.getOrDefault('settings').gestureHandedness.toUpperCase() },
  { id: 'dwell',      label: '⏱ Dwell Speed',    getValue: () => {
    const ms = storage.getOrDefault('settings').dwellTimeMs;
    if (ms <= 700) return 'FAST';
    if (ms <= 1100) return 'NORMAL';
    return 'SLOW';
  }},
  { id: 'back',       label: '← BACK',           getValue: () => '' },
];

function cycleSetting(id: string): void {
  storage.update('settings', s => {
    switch (id) {
      case 'sound':      return { ...s, soundEnabled: !s.soundEnabled };
      case 'music':      return { ...s, musicEnabled: !s.musicEnabled };
      case 'difficulty': {
        const cycle: Array<'easy'|'medium'|'hard'> = ['easy','medium','hard'];
        return { ...s, difficulty: cycle[(cycle.indexOf(s.difficulty) + 1) % cycle.length] };
      }
      case 'handedness': {
        const cycle: Array<'right'|'left'|'both'> = ['right','left','both'];
        return { ...s, gestureHandedness: cycle[(cycle.indexOf(s.gestureHandedness) + 1) % cycle.length] };
      }
      case 'dwell': {
        const steps = [700, 1100, 1600];
        const idx = steps.indexOf(s.dwellTimeMs);
        const next = steps[(idx + 1) % steps.length];
        settingsDwell.dwellMs = next;
        return { ...s, dwellTimeMs: next };
      }
      default: return s;
    }
  });
}

export function initSettings(): void {
  const ms = storage.getOrDefault('settings').dwellTimeMs;
  settingsDwell.dwellMs = ms;
}

export function updateSettings(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  void dt;
  const bh = hands.find(h => h.visible) ?? null;
  const fired = settingsDwell.tick(bh);
  if (!fired) return;
  audioSynth.select();
  if (fired === 'back') { dispatch({ type: 'NAVIGATE', screen: 'menu' }); return; }
  cycleSetting(fired);
}

export function drawSettings(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[]): void {
  drawKitchenBg(ctx, W, H);
  ctx.save(); shd(ctx, '#88ccff', 28);
  ctx.font = `bold ${Math.round(H * 0.065)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#88ccff';
  ctx.fillText('⚙ SETTINGS', W / 2, H * 0.14); nshd(ctx); ctx.restore();

  const bw = Math.min(500, W * 0.55), bh = 58, gap = 12;
  const totalH = SETTINGS.length * (bh + gap) - gap;
  const startY = H * 0.22;
  const regions = SETTINGS.map((s, i) => ({ id: s.id, x: W / 2 - bw / 2, y: startY + i * (bh + gap), w: bw, h: bh }));
  settingsDwell.setRegions(regions);
  const { id: hovId, p } = settingsDwell.progress();

  SETTINGS.forEach((item, i) => {
    const r = regions[i];
    const hov = hovId === item.id;
    const col = item.id === 'back' ? '#ff7c2e' : '#88ccff';
    ctx.save(); if (hov) shd(ctx, col, 18);
    card(ctx, r.x, r.y, bw, bh, 14, hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)', hov ? col : 'rgba(255,255,255,0.18)', hov ? 3 : 2);
    if (hov && p > 0) {
      ctx.beginPath();
      (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(r.x, r.y + bh - 6, bw * p, 6, 3);
      ctx.fillStyle = col; ctx.fill();
    }
    ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = hov ? col : '#fff';
    ctx.fillText(item.label, r.x + 20, r.y + 37);
    const val = item.getValue();
    if (val) {
      ctx.textAlign = 'right'; ctx.font = 'bold 17px system-ui';
      ctx.fillStyle = hov ? col : 'rgba(255,200,100,0.9)';
      ctx.fillText(val, r.x + bw - 20, r.y + 37);
    }
    nshd(ctx); ctx.restore();
  });

  ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,200,100,0.6)';
  ctx.fillText('👋 Hover 1 second to toggle each setting', W / 2, H * 0.96);
  hands.forEach(h => drawHandCursor(ctx, h));
}
