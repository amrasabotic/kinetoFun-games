import type { HandData, GameAction, AchievementId } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { storage } from '@/storage/localStorage';

const achieveDwell = new DwellSystem(1100);

interface AchievementDef {
  id: AchievementId;
  icon: string;
  name: string;
  desc: string;
  goal: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'slice-master',      icon: '🔪', name: 'Slice Master',       desc: 'Chop 100 vegetables',          goal: 100 },
  { id: 'soup-legend',       icon: '🍜', name: 'Soup Legend',         desc: 'Stir soup for 120 seconds',    goal: 120 },
  { id: 'pancake-pro',       icon: '🥞', name: 'Pancake Pro',         desc: 'Flip 30 perfect pancakes',     goal: 30  },
  { id: 'cake-artist',       icon: '🎂', name: 'Cake Artist',         desc: 'Decorate 20 cakes',            goal: 20  },
  { id: 'combo-king',        icon: '🔥', name: 'Combo King',          desc: 'Reach a x10 combo multiplier', goal: 10  },
  { id: 'no-miss-champion',  icon: '✨', name: 'No-Miss Champion',    desc: 'Complete a game with 0 misses',goal: 1   },
  { id: 'speed-chef',        icon: '⚡', name: 'Speed Chef',          desc: 'Complete a minigame in <20s',  goal: 1   },
  { id: 'ultimate-chef',     icon: '🏆', name: 'Ultimate Chef',       desc: 'Beat the Ultimate Showdown',   goal: 1   },
  { id: 'daily-streak-7',    icon: '📅', name: 'Daily Devotee',       desc: 'Play daily challenge 7 days',  goal: 7   },
  { id: 'party-winner',      icon: '🎉', name: 'Party Champion',      desc: 'Win a 2+ player party game',   goal: 1   },
];

export function updateAchievements(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  void dt;
  const bh = hands.find(h => h.visible) ?? null;
  const fired = achieveDwell.tick(bh);
  if (fired === 'back') { audioSynth.select(); dispatch({ type: 'NAVIGATE', screen: 'menu' }); }
}

export function drawAchievements(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[]): void {
  drawKitchenBg(ctx, W, H);
  ctx.save(); shd(ctx, '#ffd700', 28);
  ctx.font = `bold ${Math.round(H * 0.065)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
  ctx.fillText('⭐ ACHIEVEMENTS', W / 2, H * 0.13); nshd(ctx); ctx.restore();

  const data = storage.getOrDefault('achievements');
  const unlocked = new Set(data.unlocked);
  const progress = data.progress;

  const cols = 2;
  const bw = Math.min(370, W * 0.4), bh = 64, gap = 10;
  const totalW = cols * bw + (cols - 1) * gap;
  const startX = W / 2 - totalW / 2;
  const startY = H * 0.2;

  ACHIEVEMENTS.forEach((ach, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (bw + gap);
    const y = startY + row * (bh + gap);
    const done = unlocked.has(ach.id);
    const prog = progress[ach.id] ?? 0;
    const pct = Math.min(1, prog / ach.goal);

    card(ctx, x, y, bw, bh, 12,
      done ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.06)',
      done ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.12)', done ? 2.5 : 1.5);

    ctx.font = '22px system-ui'; ctx.textAlign = 'left'; ctx.globalAlpha = done ? 1 : 0.35;
    ctx.fillText(ach.icon, x + 12, y + 38);
    ctx.font = `bold 14px system-ui`; ctx.fillStyle = done ? '#ffd700' : '#fff'; ctx.globalAlpha = done ? 1 : 0.5;
    ctx.fillText(ach.name, x + 46, y + 24);
    ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.globalAlpha = 1;
    ctx.fillText(ach.desc, x + 46, y + 42);

    if (!done && ach.goal > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.roundRect?.(x + 46, y + 50, bw - 58, 6, 3); ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.roundRect?.(x + 46, y + 50, (bw - 58) * pct, 6, 3); ctx.fill();
      ctx.font = '10px system-ui'; ctx.fillStyle = 'rgba(255,200,100,0.7)'; ctx.textAlign = 'right';
      ctx.fillText(`${prog}/${ach.goal}`, x + bw - 6, y + 59);
    }
    if (done) {
      ctx.font = '14px system-ui'; ctx.fillStyle = '#44ff88'; ctx.textAlign = 'right';
      ctx.fillText('✓ UNLOCKED', x + bw - 8, y + 42);
    }
  });

  const unlockedCount = unlocked.size;
  ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,220,150,0.75)';
  ctx.fillText(`${unlockedCount} / ${ACHIEVEMENTS.length} Unlocked`, W / 2, H * 0.92);

  const backRegion = [{ id: 'back', x: W / 2 - 110, y: H * 0.94, w: 220, h: 50 }];
  achieveDwell.setRegions(backRegion);
  const { id: hovId, p } = achieveDwell.progress();
  const hov = hovId === 'back';
  ctx.save(); if (hov) shd(ctx, '#ff7c2e', 18);
  card(ctx, backRegion[0].x, backRegion[0].y, 220, 50, 14, hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)', hov ? '#ff7c2e' : 'rgba(255,255,255,0.2)', hov ? 3 : 2);
  if (hov && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(backRegion[0].x, backRegion[0].y + 44, 220 * p, 6, 3); ctx.fillStyle = '#ff7c2e'; ctx.fill(); }
  ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hov ? '#ff7c2e' : '#fff';
  ctx.fillText('← MAIN MENU', W / 2, backRegion[0].y + 31);
  nshd(ctx); ctx.restore();

  hands.forEach(h => drawHandCursor(ctx, h));
}

export function unlockAchievement(id: AchievementId, amount = 1): void {
  storage.update('achievements', a => {
    const already = a.unlocked.includes(id);
    const newProgress = { ...a.progress, [id]: (a.progress[id] ?? 0) + amount };
    const GOALS: Record<AchievementId, number> = {
      'slice-master': 100, 'soup-legend': 120, 'pancake-pro': 30, 'cake-artist': 20,
      'combo-king': 10, 'no-miss-champion': 1, 'speed-chef': 1,
      'ultimate-chef': 1, 'daily-streak-7': 7, 'party-winner': 1,
    };
    const goal = GOALS[id] ?? 1;
    const newUnlocked = !already && (newProgress[id] ?? 0) >= goal
      ? [...a.unlocked, id] : a.unlocked;
    return { ...a, progress: newProgress, unlocked: newUnlocked };
  });
}
