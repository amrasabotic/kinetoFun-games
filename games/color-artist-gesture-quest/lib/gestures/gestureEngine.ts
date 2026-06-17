// ============================================================
// LAYER 2: GESTURE ENGINE — Stability-Critical System
//
// Rules enforced:
//  • History buffer: last 10 frames
//  • Majority vote ≥ 70% to promote a candidate
//  • Debounce: candidate must hold for 300 ms before commit
//  • Neutral fallback: OPEN_PALM when confidence < threshold
//  • Pinch: geometric distance / hand size (no heuristics)
//  • Cursor: lerp(prev, raw, 0.2) — never raw landmarks
// ============================================================

import type { HandFrame, HandLandmark, Gesture, GestureState } from "../../types";

const HISTORY_SIZE = 10;
const MAJORITY_THRESHOLD = 0.70;
const DEBOUNCE_MS = 300;
const LERP_ALPHA = 0.20;
const PINCH_RATIO = 0.38; // normalized distance threshold

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class GestureEngine {
  private history: Gesture[] = [];

  private committed: Gesture = "OPEN_PALM";
  private candidate: Gesture = "OPEN_PALM";
  private candidateSince: number = 0;

  private cursorX = 0.5;
  private cursorY = 0.5;

  // ── Public entry point ─────────────────────────────────────

  process(frame: HandFrame | null): GestureState {
    if (!frame) {
      return this.buildState("OPEN_PALM", 0, false);
    }

    const raw = this.classifyRaw(frame.landmarks, frame.handedness);
    this.pushHistory(raw);

    const { winner, confidence } = this.majorityVote();
    const stable = this.debounce(winner, performance.now());

    this.smoothCursor(frame.landmarks);

    return this.buildState(stable, confidence, stable === this.committed);
  }

  reset(): void {
    this.history = [];
    this.committed = "OPEN_PALM";
    this.candidate = "OPEN_PALM";
    this.cursorX = 0.5;
    this.cursorY = 0.5;
  }

  // ── Raw gesture classification ──────────────────────────────

  private classifyRaw(lm: HandLandmark[], _hand: "Left" | "Right"): Gesture {
    // Pinch test (geometric, normalized by hand size)
    const handSize = Math.hypot(
      lm[9].x - lm[0].x,
      lm[9].y - lm[0].y,
      lm[9].z - lm[0].z
    );
    const pinchDist = Math.hypot(
      lm[4].x - lm[8].x,
      lm[4].y - lm[8].y,
      lm[4].z - lm[8].z
    );
    if (handSize > 0.01 && pinchDist / handSize < PINCH_RATIO) return "PINCH";

    // Finger extension: tip.y < pip.y means pointing up
    const idx = lm[8].y < lm[6].y;
    const mid = lm[12].y < lm[10].y;
    const rng = lm[16].y < lm[14].y;
    const pky = lm[20].y < lm[18].y;
    const count = [idx, mid, rng, pky].filter(Boolean).length;

    if (count === 0) return "FIST";
    if (count === 4) return "OPEN_PALM";
    if (idx && !mid && !rng && !pky) return "DRAW";
    if (idx && mid && !rng && !pky) return "PEACE";

    return "UNKNOWN";
  }

  // ── Stability: history buffer ───────────────────────────────

  private pushHistory(g: Gesture): void {
    this.history.push(g);
    if (this.history.length > HISTORY_SIZE) this.history.shift();
  }

  private majorityVote(): { winner: Gesture; confidence: number } {
    if (!this.history.length) return { winner: "OPEN_PALM", confidence: 0 };

    const counts: Record<string, number> = {};
    for (const g of this.history) counts[g] = (counts[g] ?? 0) + 1;

    let winner: Gesture = "OPEN_PALM";
    let max = 0;
    for (const [g, n] of Object.entries(counts)) {
      if (n > max) { max = n; winner = g as Gesture; }
    }

    const confidence = max / this.history.length;

    // Fall back to neutral if below majority threshold
    if (confidence < MAJORITY_THRESHOLD) return { winner: "OPEN_PALM", confidence };
    return { winner, confidence };
  }

  // ── Stability: debounce ─────────────────────────────────────

  private debounce(winner: Gesture, now: number): Gesture {
    if (winner !== this.candidate) {
      this.candidate = winner;
      this.candidateSince = now;
    }
    if (now - this.candidateSince >= DEBOUNCE_MS && this.candidate !== this.committed) {
      this.committed = this.candidate;
    }
    return this.committed;
  }

  // ── Cursor smoothing ────────────────────────────────────────

  private smoothCursor(lm: HandLandmark[]): void {
    // Mirror X so hand movement feels natural (right → right on screen)
    const rawX = 1 - lm[8].x;
    const rawY = lm[8].y;
    this.cursorX = lerp(this.cursorX, rawX, LERP_ALPHA);
    this.cursorY = lerp(this.cursorY, rawY, LERP_ALPHA);
  }

  // ── Output builder ──────────────────────────────────────────

  private buildState(gesture: Gesture, confidence: number, isStable: boolean): GestureState {
    return { gesture, confidence, isStable, cursorX: this.cursorX, cursorY: this.cursorY };
  }
}
