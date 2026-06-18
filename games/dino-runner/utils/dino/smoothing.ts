import type { GestureState } from '@/game/dino/types';

// Sliding window majority-vote smoother.
// Duck needs higher threshold (stability), jump needs lower (responsiveness).
const WINDOW = 8;
const JUMP_THRESHOLD = 3;  // 3/8 ≈ 37 %
const DUCK_THRESHOLD = 5;  // 5/8 ≈ 62 %

export class GestureSmoother {
  private buf: GestureState[] = new Array(WINDOW).fill('none' as GestureState);
  private idx = 0;

  update(raw: GestureState): GestureState {
    this.buf[this.idx] = raw;
    this.idx = (this.idx + 1) % WINDOW;

    let jump = 0, duck = 0;
    for (const g of this.buf) {
      if (g === 'jump') jump++;
      else if (g === 'duck') duck++;
    }

    // Duck takes priority (prevents accidental jump while ducking)
    if (duck >= DUCK_THRESHOLD) return 'duck';
    if (jump >= JUMP_THRESHOLD) return 'jump';
    return 'none';
  }

  reset(): void {
    this.buf.fill('none');
    this.idx = 0;
  }
}
