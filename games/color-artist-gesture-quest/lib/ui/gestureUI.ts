// ============================================================
// GESTURE UI NAVIGATION LAYER
//
// Sole responsibility: menu navigation via gestures.
// This module sits between the GestureEngine output and the
// game's screen transitions. It NEVER touches:
//   - GestureEngine (no modifications)
//   - GameEngine    (no modifications)
//   - Drawing system (untouched)
//   - Scoring logic  (untouched)
//
// Integration:
//   MediaPipe → GestureEngine → GestureUI → (screen actions)
//                                  ↓
//                             GameEngine (via callbacks only)
// ============================================================

import type { GestureState, Gesture } from "../../types";

// ── Types ─────────────────────────────────────────────────

export type MenuScreen =
  | "menu-screen"
  | "world-screen"
  | "level-screen"
  | "pause-screen"
  | "complete-screen"
  | null; // null = game is playing, GestureUI is idle

/** All navigation actions the host (game orchestrator) must provide. */
export interface GestureUIActions {
  goMenu:       () => void;
  goWorlds:     () => void;
  goLevels:     () => void;
  resume:       () => void;
  quitToLevels: () => void;
  selectWorld:  (worldId: number) => void;
  selectLevel:  (worldId: number, levelId: number) => void;
  retry:        (() => void) | null;
  nextLevel:    (() => void) | null;
}

// ── Constants ─────────────────────────────────────────────

const ACTION_COOLDOWN  = 500;    // ms min between any two actions
const HOLD_CONFIRM_MS  = 400;    // ms DRAW must be held to confirm
const SWIPE_VEL        = 0.0018; // normalized cursor-units / ms
const SWIPE_MIN_DT     = 90;     // ms
const SWIPE_MAX_DT     = 550;    // ms
const HOLD_CIRCUMF     = 125.6;  // 2π × 20 (SVG circle r=20)

// ── GestureUI class ───────────────────────────────────────

export class GestureUI {
  private activeScreen: MenuScreen = null;
  private items: Element[]         = [];
  private focusIdx                 = 0;

  private lastActionTime = 0;
  private drawHoldStart: number | null = null;
  private cursorHistory: Array<{ x: number; t: number }> = [];

  private actions: GestureUIActions;

  constructor(actions: GestureUIActions) {
    this.actions = actions;
  }

  /** Update dynamic actions (e.g. retry/next after a level finishes). */
  updateActions(patch: Partial<GestureUIActions>): void {
    Object.assign(this.actions, patch);
  }

  // ── Screen activation ──────────────────────────────────

  setScreen(screenId: MenuScreen): void {
    this.activeScreen    = screenId;
    this.focusIdx        = 0;
    this.drawHoldStart   = null;
    this.cursorHistory   = [];

    this._refresh();
    this._applyFocus();

    const isMenu = !!screenId;
    this._setCursorVisible(isMenu);
    this._setNavHint(isMenu);
    this._setArc(0);
  }

  // ── Main per-frame entry point ─────────────────────────

  /** Call every frame with the latest GestureEngine output. */
  onGestureState(gs: GestureState): void {
    if (!this.activeScreen) return;

    this._updateCursor(gs.cursorX, gs.cursorY, gs.gesture);
    this._detectSwipe(gs.cursorX);

    if (gs.gesture === "DRAW") {
      if (!this.drawHoldStart) this.drawHoldStart = performance.now();
      const held = performance.now() - this.drawHoldStart;
      this._setArc(held / HOLD_CONFIRM_MS);
      if (held >= HOLD_CONFIRM_MS) this._confirm();
    } else {
      if (this.drawHoldStart) {
        this.drawHoldStart = null;
        this._setArc(0);
      }
    }
  }

  /** Call whenever the committed gesture changes. */
  onGestureChange(next: Gesture): void {
    if (!this.activeScreen) return;
    if (next === "FIST") this._back();
  }

  // ── Private: item collection ───────────────────────────

  private _refresh(): void {
    this.items = [];
    if (!this.activeScreen) return;
    const root = document.getElementById(this.activeScreen);
    if (!root) return;
    this.items = [...root.querySelectorAll(
      "button, .world-card:not(.locked), .level-card"
    )].filter((el) => {
      const cs = getComputedStyle(el);
      return cs.display !== "none" && cs.visibility !== "hidden";
    });
    this.focusIdx = Math.max(0, Math.min(this.focusIdx, this.items.length - 1));
  }

  private _applyFocus(): void {
    document.querySelectorAll(".gu-focused")
      .forEach((e) => e.classList.remove("gu-focused"));
    const el = this.items[this.focusIdx] as HTMLElement | undefined;
    if (el) {
      el.classList.add("gu-focused");
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // ── Private: navigation ────────────────────────────────

  private _navigate(delta: number): void {
    const now = performance.now();
    if (now - this.lastActionTime < ACTION_COOLDOWN) return;
    this.lastActionTime = now;
    this._refresh();
    if (!this.items.length) return;
    this.focusIdx = (this.focusIdx + delta + this.items.length) % this.items.length;
    this._applyFocus();
  }

  // ── Private: confirm ───────────────────────────────────

  private _confirm(): void {
    const now = performance.now();
    if (now - this.lastActionTime < ACTION_COOLDOWN) return;
    this.lastActionTime = now;
    this.drawHoldStart = null;
    this._setArc(0);
    this._refresh();

    const el = this.items[this.focusIdx] as HTMLElement | undefined;
    if (!el) return;

    const id = (el as HTMLElement).id;

    if      (id === "btn-play")         this.actions.goWorlds();
    else if (id === "btn-back-menu")    this.actions.goMenu();
    else if (id === "btn-back-worlds")  this.actions.goWorlds();
    else if (id === "btn-resume")       this.actions.resume();
    else if (id === "btn-quit-pause")   this.actions.quitToLevels();
    else if (id === "btn-retry")        this.actions.retry?.();
    else if (id === "btn-next")         this.actions.nextLevel?.();
    else if (id === "btn-to-levels")    this.actions.goLevels();
    else if (el.classList.contains("world-card")) {
      const wId = parseInt((el as HTMLElement).dataset.worldId ?? "");
      if (!isNaN(wId)) this.actions.selectWorld(wId);
    }
    else if (el.classList.contains("level-card")) {
      const wId = parseInt((el as HTMLElement).dataset.worldId ?? "");
      const lId = parseInt((el as HTMLElement).dataset.levelId ?? "");
      if (!isNaN(wId) && !isNaN(lId)) this.actions.selectLevel(wId, lId);
    }
  }

  // ── Private: back ──────────────────────────────────────

  private _back(): void {
    const now = performance.now();
    if (now - this.lastActionTime < ACTION_COOLDOWN) return;
    this.lastActionTime = now;

    if      (this.activeScreen === "world-screen")    this.actions.goMenu();
    else if (this.activeScreen === "level-screen")    this.actions.goWorlds();
    else if (this.activeScreen === "pause-screen")    this.actions.resume();
    else if (this.activeScreen === "complete-screen") this.actions.goLevels();
  }

  // ── Private: swipe detection ───────────────────────────

  private _detectSwipe(x: number): void {
    const now = performance.now();
    this.cursorHistory.push({ x, t: now });
    if (this.cursorHistory.length > 10) this.cursorHistory.shift();
    if (this.cursorHistory.length < 3) return;

    const old = this.cursorHistory[0];
    const cur = this.cursorHistory[this.cursorHistory.length - 1];
    const dt  = cur.t - old.t;
    const dx  = cur.x - old.x;

    if (dt >= SWIPE_MIN_DT && dt <= SWIPE_MAX_DT && Math.abs(dx / dt) > SWIPE_VEL) {
      this._navigate(dx > 0 ? 1 : -1);
      this.cursorHistory = [];
    }
  }

  // ── Private: DOM helpers ───────────────────────────────

  private _updateCursor(cx: number, cy: number, gesture: Gesture): void {
    const el = document.getElementById("gesture-cursor");
    if (!el) return;
    el.style.left = `${cx * window.innerWidth}px`;
    el.style.top  = `${cy * window.innerHeight}px`;
    el.className  = gesture === "DRAW" ? "draw-active" : "";
  }

  private _setArc(ratio: number): void {
    const arc = document.getElementById("gu-hold-arc");
    if (!arc) return;
    const len = Math.max(0, Math.min(1, ratio)) * HOLD_CIRCUMF;
    (arc as SVGCircleElement).style.strokeDasharray = `${len} ${HOLD_CIRCUMF}`;
  }

  private _setCursorVisible(visible: boolean): void {
    const el = document.getElementById("gesture-cursor");
    if (el) el.style.display = visible ? "block" : "none";
  }

  private _setNavHint(visible: boolean): void {
    const el = document.getElementById("gu-nav-hint");
    if (el) el.className = visible ? "visible" : "";
  }
}
