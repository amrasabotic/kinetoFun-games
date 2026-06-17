// ============================================================
// GESTURE SIDEBAR CONTROLLER
//
// Converts existing sidebar mouse interaction → gesture input.
// Responsibilities:
//   1. Map hand Y position → focused sidebar item
//   2. Detect DRAW-hold (400 ms) → trigger existing click handler
//   3. Guard zone: only active when cursorX > 0.70
//
// Does NOT modify:
//   - Sidebar UI / layout
//   - Button click handlers
//   - Game engine / drawing system
//   - GestureEngine output
//
// Integration:
//   _onFrame (playing phase only)
//     └── GestureSidebar.onGestureState(gs)
//           ├── zone guard  (x > 0.70)
//           ├── Y → item focus  (getBoundingClientRect)
//           └── DRAW hold 400ms → el.click()  ← reuses existing handlers
// ============================================================

import type { GestureState } from "../../types";

const ZONE_X      = 0.70;  // normalized X threshold for sidebar zone
const HOLD_MS     = 400;   // ms DRAW must be stable to confirm
const COOLDOWN_MS = 600;   // ms min between consecutive triggers
const LERP_Y      = 0.22;  // cursor Y smoothing

export class GestureSidebarController {
  private focusedEl: HTMLElement | null = null;
  private holdStart: number | null      = null;
  private lastActionTime                = 0;
  private smoothY                       = 0.5;
  private inZone                        = false;

  /** Call every frame during the playing phase. */
  onGestureState(gs: GestureState): void {
    const nowInZone = gs.cursorX > ZONE_X;

    if (nowInZone !== this.inZone) {
      this.inZone = nowInZone;
      this._setZoneEdge(nowInZone);
      if (!nowInZone) {
        this._setFocus(null);
        this.holdStart = null;
        this._setProgress(0);
      }
    }

    if (!this.inZone) return;

    // Smooth Y to prevent flicker from noisy landmarks
    this.smoothY += (gs.cursorY - this.smoothY) * LERP_Y;
    const screenY = this.smoothY * window.innerHeight;

    this._setFocus(this._itemAtY(screenY));

    if (gs.gesture === "DRAW" && gs.isStable && this.focusedEl) {
      if (!this.holdStart) this.holdStart = performance.now();
      const held = performance.now() - this.holdStart;
      this._setProgress(held / HOLD_MS);

      if (held >= HOLD_MS) {
        const now = performance.now();
        if (now - this.lastActionTime >= COOLDOWN_MS) {
          this.lastActionTime = now;
          this.holdStart      = null;
          this._setProgress(0);
          this.focusedEl.click(); // trigger existing onclick — unchanged
        }
      }
    } else {
      this.holdStart = null;
      this._setProgress(0);
    }
  }

  /** True when hand is in the sidebar zone — caller should skip drawing. */
  isInZone(): boolean {
    return this.inZone;
  }

  // ── Private helpers ────────────────────────────────────────

  private _items(): HTMLElement[] {
    const sb = document.getElementById("sidebar");
    if (!sb) return [];
    return ([...sb.querySelectorAll(".sb-btn, .action-btn")] as HTMLElement[]).filter((el) => {
      const cs = getComputedStyle(el);
      return cs.display !== "none" && cs.visibility !== "hidden";
    });
  }

  private _itemAtY(screenY: number): HTMLElement | null {
    for (const el of this._items()) {
      const r = el.getBoundingClientRect();
      if (screenY >= r.top && screenY <= r.bottom) return el;
    }
    return null;
  }

  private _setFocus(el: HTMLElement | null): void {
    if (el === this.focusedEl) return;
    if (this.focusedEl) {
      this.focusedEl.classList.remove("sb-focused");
      this.focusedEl.style.removeProperty("--hp");
    }
    this.focusedEl = el;
    if (this.focusedEl) this.focusedEl.classList.add("sb-focused");
    this.holdStart = null; // reset hold when focus changes
  }

  private _setProgress(ratio: number): void {
    if (this.focusedEl) {
      this.focusedEl.style.setProperty("--hp", String(Math.max(0, Math.min(1, ratio))));
    }
  }

  private _setZoneEdge(active: boolean): void {
    const el = document.getElementById("sb-zone-edge");
    if (el) el.className = active ? "active" : "";
  }
}
