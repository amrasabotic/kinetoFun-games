interface ScorePopup {
  x: number; y: number;
  text: string; col: string;
  life: number; max: number; vy: number;
}

const COMBO_TABLE: [number, number][] = [[2, 2], [5, 3], [10, 5], [15, 8], [20, 10]];

function getComboMult(c: number): number {
  let m = 1;
  for (const [th, ml] of COMBO_TABLE) if (c >= th) m = ml;
  return m;
}

export class ScoreSystem {
  roundScore = 0;
  totalScore = 0;
  combo = 0;
  comboMult = 1;
  maxCombo = 0;
  perfectCount = 0;
  private popups: ScorePopup[] = [];

  reset(): void {
    this.roundScore = 0; this.totalScore = 0;
    this.combo = 0; this.comboMult = 1;
    this.maxCombo = 0; this.perfectCount = 0;
    this.popups = [];
  }

  add(pts: number, x: number, y: number, label?: string): number {
    const actual = Math.round(pts * this.comboMult);
    this.roundScore += actual; this.totalScore += actual;
    const col = this.comboMult >= 8 ? '#ff7c2e' : this.comboMult >= 3 ? '#ffd700' : '#ffffff';
    const text = label || ('+' + actual) + (this.comboMult > 1 ? ' x' + this.comboMult : '');
    this.popups.push({ x, y: y - 20, text, col, life: 90, max: 90, vy: -1.8 });
    return actual;
  }

  addCombo(audio?: { comboUp(): void }): void {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    const nm = getComboMult(this.combo);
    if (nm > this.comboMult) { this.comboMult = nm; audio?.comboUp(); }
  }

  breakCombo(): void { this.combo = 0; this.comboMult = 1; }

  addPerfect(): void { this.perfectCount++; }

  tick(): void {
    this.popups = this.popups.filter(p => {
      p.y += p.vy; p.vy *= 0.96; p.life--;
      return p.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.popups.forEach(p => {
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 2);
      const sz = 22 + Math.round((1 - p.life / p.max) * 6);
      ctx.font = `bold ${sz}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = p.col;
      ctx.shadowColor = p.col; ctx.shadowBlur = 12;
      ctx.fillText(p.text, p.x, p.y);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
  }

  drawHUD(ctx: CanvasRenderingContext2D, W: number, _H: number): void {
    ctx.save();
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'right';
    ctx.shadowColor = '#ff7c2e'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffd700';
    ctx.fillText('⭐ ' + this.roundScore, W - 20, 40);
    ctx.shadowBlur = 0;

    if (this.combo >= 2) {
      const col = this.comboMult >= 8 ? '#ff7c2e' : this.comboMult >= 3 ? '#ffd700' : '#fff';
      ctx.shadowColor = col; ctx.shadowBlur = 18;
      ctx.font = `bold ${30 + this.comboMult * 2}px system-ui`;
      ctx.textAlign = 'left';
      ctx.fillStyle = col;
      ctx.fillText(`🔥 x${this.comboMult} COMBO (${this.combo})`, 20, 40);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  computeStars(maxPossible: number): 0 | 1 | 2 | 3 {
    const ratio = this.roundScore / maxPossible;
    if (ratio >= 0.85) return 3;
    if (ratio >= 0.55) return 2;
    if (ratio >= 0.2) return 1;
    return 0;
  }
}

export const scoreSystem = new ScoreSystem();
