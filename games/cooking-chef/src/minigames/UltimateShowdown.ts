import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, shd, nshd } from '@/game/drawHelpers';
import { VegChopModule } from './VegChop';
import { StirSoupModule } from './StirSoup';
import { FlipPancakeModule } from './FlipPancake';
import { BurgerStackModule } from './BurgerStack';
import { SmoothieFrenzyModule } from './SmoothieFrenzy';

const ROTATION = [VegChopModule, StirSoupModule, FlipPancakeModule, BurgerStackModule, SmoothieFrenzyModule];
let rotIdx = 0;
let burstTimer = 0;
const BURST_DUR = 7; // seconds per burst
let mgTime = 0;
let perfects = 0;
let initialized = false;
let currentCtx: MinigameContext | null = null;
let speedMult = 1;

export const UltimateShowdownModule: MinigameModule = {
  id: 'ultimate-showdown', name: 'Ultimate Chef Showdown!', icon: '👑',
  hint: 'Handle all stations at maximum speed!', duration: 60, maxScore: 1200,

  init(ctx: MinigameContext) {
    rotIdx = 0; burstTimer = BURST_DUR; mgTime = this.duration; perfects = 0; initialized = false; speedMult = 1;
    currentCtx = ctx;
    ROTATION[0].init(ctx);
    initialized = true;
    ctx.audio.fanfare();
  },

  update(ctx: MinigameContext): boolean | void {
    mgTime -= ctx.dt;
    burstTimer -= ctx.dt;
    speedMult = 1 + (1 - mgTime / this.duration) * 1.5;

    if (burstTimer <= 0) {
      ROTATION[rotIdx].dispose?.();
      rotIdx = (rotIdx + 1) % ROTATION.length;
      burstTimer = Math.max(4, BURST_DUR - speedMult);
      ROTATION[rotIdx].init(ctx);
      ctx.audio.select(); ctx.particles.confetti(ctx.W / 2, ctx.H / 4);
    }

    const earlyDone = ROTATION[rotIdx].update(ctx);
    if (earlyDone) { perfects++; burstTimer = 0; }

    // Boss overlay
    ctx.ctx.save();
    shd(ctx.ctx, '#ff7c2e', 30);
    ctx.ctx.font = `bold ${Math.round(ctx.H * 0.055)}px system-ui`;
    ctx.ctx.textAlign = 'center'; ctx.ctx.fillStyle = '#ffd700';
    ctx.ctx.fillText('👑 ULTIMATE SHOWDOWN', ctx.W / 2, ctx.H * 0.08);
    nshd(ctx.ctx);
    ctx.ctx.font = 'bold 18px system-ui'; ctx.ctx.fillStyle = 'rgba(255,200,100,0.8)';
    ctx.ctx.fillText(`Station: ${ROTATION[rotIdx].icon} ${ROTATION[rotIdx].name}  (${Math.ceil(burstTimer)}s)`, ctx.W / 2, ctx.H * 0.13);
    // Speed indicator
    const spd = speedMult.toFixed(1);
    ctx.ctx.fillStyle = speedMult > 2 ? '#ff3344' : speedMult > 1.5 ? '#ff7c2e' : '#44ff88';
    ctx.ctx.fillText(`⚡ Speed: x${spd}`, ctx.W / 2, ctx.H * 0.95);
    ctx.ctx.restore();
  },

  finish(ctx: MinigameContext): MinigameResult {
    ROTATION[rotIdx].dispose?.();
    if (perfects >= 3) { ctx.score.add(300, ctx.W / 2, ctx.H / 2, 'ULTIMATE CHEF! 👑'); ctx.audio.fanfare(); }
    return { score: ctx.score.roundScore, maxScore: this.maxScore, stars: ctx.score.computeStars(this.maxScore), perfectCount: perfects, combo: ctx.score.maxCombo };
  },

  dispose() {
    ROTATION[rotIdx].dispose?.();
    initialized = false; currentCtx = null;
  },
};
