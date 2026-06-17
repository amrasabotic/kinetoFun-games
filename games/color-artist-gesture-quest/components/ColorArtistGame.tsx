// ============================================================
// MAIN ORCHESTRATOR — ColorArtistGame
// Sole owner of global state. Connects all 4 layers.
// Uses refs for per-frame data to avoid React re-render storms.
//
// Data flow:
//   CameraFeed → GestureEngine → GameEngine → CanvasRenderer
// ============================================================

"use client";

import React, {
  useState, useRef, useCallback, useEffect, useReducer,
} from "react";
import { CameraFeed } from "./CameraFeed";
import { CanvasRenderer, RendererHandle } from "./CanvasRenderer";
import { GameEngine, WORLDS } from "../lib/game/gameEngine";
import { ProgressManager } from "../lib/storage/progress";
import type {
  GestureState, Stroke, Point, BrushType, GamePhase,
  ScoreBreakdown, World, Level, UnlockReward,
} from "../types";

// ── Constants ─────────────────────────────────────────────

const CANVAS_W = 960;
const CANVAS_H = 640;

const BRUSH_SIZES: Record<string, number> = {
  XS: 4, S: 8, M: 14, L: 22, XL: 34,
};

function makeStrokeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Managers (singleton per mount) ────────────────────────

const progressMgr = new ProgressManager();
const gameEngine  = new GameEngine(progressMgr);

// ── Reducer for stable UI state ────────────────────────────

type UIState = {
  phase: GamePhase;
  currentWorld: number;
  currentLevel: number;
  xp: number;
  totalStars: number;
  score: ScoreBreakdown | null;
  strokes: Stroke[];
  currentColor: string;
  currentBrush: BrushType;
  currentSize: number;
  timeRemaining: number;
  showColorWheel: boolean;
  colorWheelX: number;
  colorWheelY: number;
  lastGesture: GestureState["gesture"];
  completeData: { stars: number; xpGained: number; unlocks: UnlockReward[] } | null;
};

type UIAction =
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "SET_WORLD"; world: number }
  | { type: "SET_LEVEL"; level: number }
  | { type: "ADD_STROKE"; stroke: Stroke }
  | { type: "UNDO" }
  | { type: "CLEAR_STROKES" }
  | { type: "SET_COLOR"; color: string }
  | { type: "SET_BRUSH"; brush: BrushType }
  | { type: "SET_SIZE"; size: number }
  | { type: "TICK"; remaining: number }
  | { type: "SHOW_WHEEL"; x: number; y: number }
  | { type: "HIDE_WHEEL" }
  | { type: "SET_GESTURE"; gesture: GestureState["gesture"] }
  | { type: "LEVEL_COMPLETE"; data: UIState["completeData"] }
  | { type: "UPDATE_PROGRESS"; xp: number; stars: number };

function initState(): UIState {
  const p = progressMgr.load();
  return {
    phase: "menu",
    currentWorld: 0,
    currentLevel: 0,
    xp: p.xp,
    totalStars: p.totalStars,
    score: null,
    strokes: [],
    currentColor: "#FF6B6B",
    currentBrush: "basic",
    currentSize: BRUSH_SIZES.M,
    timeRemaining: 60,
    showColorWheel: false,
    colorWheelX: 0.5,
    colorWheelY: 0.5,
    lastGesture: "OPEN_PALM",
    completeData: null,
  };
}

function reducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_PHASE":   return { ...state, phase: action.phase };
    case "SET_WORLD":   return { ...state, currentWorld: action.world };
    case "SET_LEVEL":   return { ...state, currentLevel: action.level };
    case "ADD_STROKE":  return { ...state, strokes: [...state.strokes, action.stroke] };
    case "UNDO":        return { ...state, strokes: state.strokes.slice(0, -1) };
    case "CLEAR_STROKES": return { ...state, strokes: [] };
    case "SET_COLOR":   return { ...state, currentColor: action.color };
    case "SET_BRUSH":   return { ...state, currentBrush: action.brush };
    case "SET_SIZE":    return { ...state, currentSize: action.size };
    case "TICK":        return { ...state, timeRemaining: action.remaining };
    case "SHOW_WHEEL":  return { ...state, showColorWheel: true, colorWheelX: action.x, colorWheelY: action.y };
    case "HIDE_WHEEL":  return { ...state, showColorWheel: false };
    case "SET_GESTURE": return { ...state, lastGesture: action.gesture };
    case "LEVEL_COMPLETE": return { ...state, phase: "levelComplete", completeData: action.data };
    case "UPDATE_PROGRESS": return { ...state, xp: action.xp, stars: action.stars };
    default: return state;
  }
}

// ── Main component ────────────────────────────────────────

export function ColorArtistGame() {
  const [ui, dispatch] = useReducer(reducer, undefined, initState);
  const rendererRef = useRef<RendererHandle>(null);

  // Per-frame refs — never trigger re-renders
  const gestureRef    = useRef<GestureState>({ gesture: "OPEN_PALM", confidence: 0, isStable: false, cursorX: 0.5, cursorY: 0.5 });
  const isDrawingRef  = useRef(false);
  const currentPtsRef = useRef<Point[]>([]);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevGesture   = useRef<GestureState["gesture"]>("OPEN_PALM");
  const sizeStepRef   = useRef(2); // for PEACE cycling
  const drawHoldTimeRef = useRef<number | null>(null);
  const hoveredButtonRef = useRef<HTMLButtonElement | null>(null);

  // ── Gesture handler (per-frame, ~30fps) ─────────────────

  const handleGestureState = useCallback((state: GestureState) => {
    gestureRef.current = state;
    const g = state.gesture;
    const phase = ui.phase;

    // Gesture click detection (on any screen, not just playing)
    if (g === "DRAW") {
      if (!drawHoldTimeRef.current) drawHoldTimeRef.current = performance.now();
      const held = performance.now() - drawHoldTimeRef.current;
      if (held >= 600 && hoveredButtonRef.current) {
        hoveredButtonRef.current.click();
        drawHoldTimeRef.current = null;
      }
    } else {
      drawHoldTimeRef.current = null;
    }

    // Update button hover state
    if (phase !== "playing" && phase !== "paused") {
      const cx = state.cursorX * window.innerWidth;
      const cy = state.cursorY * window.innerHeight;
      if (hoveredButtonRef.current) hoveredButtonRef.current.classList.remove("gesture-hover");
      hoveredButtonRef.current = null;
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        const r = btn.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
          btn.classList.add("gesture-hover");
          hoveredButtonRef.current = btn;
          break;
        }
      }
    }

    if (phase !== "playing") return;

    if (g !== prevGesture.current) {
      dispatch({ type: "SET_GESTURE", gesture: g });
      onGestureChange(g, prevGesture.current, state);
      prevGesture.current = g;
    }

    // Active drawing
    if (g === "DRAW") {
      const pt: Point = {
        x: state.cursorX * CANVAS_W,
        y: state.cursorY * CANVAS_H,
        timestamp: performance.now(),
      };
      if (!isDrawingRef.current) {
        isDrawingRef.current = true;
        currentPtsRef.current = [pt];
      } else {
        currentPtsRef.current.push(pt);
      }
    } else if (isDrawingRef.current) {
      // Finalize stroke
      commitStroke();
    }
  }, [ui.phase, ui.currentColor, ui.currentBrush, ui.currentSize]);

  function onGestureChange(
    next: GestureState["gesture"],
    prev: GestureState["gesture"],
    state: GestureState
  ) {
    if (next === "FIST") {
      // Pause / unpause
      dispatch({ type: "SET_PHASE", phase: ui.phase === "paused" ? "playing" : "paused" });
    }

    if (next === "PINCH") {
      dispatch({ type: "SHOW_WHEEL", x: state.cursorX, y: state.cursorY });
    }

    if (prev === "PINCH" && next !== "PINCH") {
      // Commit color from wheel position
      const color = colorFromWheel(
        state.cursorX * CANVAS_W,
        state.cursorY * CANVAS_H,
        ui.colorWheelX * CANVAS_W,
        ui.colorWheelY * CANVAS_H,
        110
      );
      if (color) dispatch({ type: "SET_COLOR", color });
      dispatch({ type: "HIDE_WHEEL" });
    }

    if (next === "PEACE") {
      // Cycle brush size
      const sizes = Object.values(BRUSH_SIZES);
      const idx   = sizes.indexOf(ui.currentSize);
      const next  = sizes[(idx + 1) % sizes.length];
      dispatch({ type: "SET_SIZE", size: next });
    }
  }

  function commitStroke() {
    const pts = currentPtsRef.current;
    if (pts.length < 2) {
      isDrawingRef.current = false;
      currentPtsRef.current = [];
      return;
    }
    const stroke: Stroke = {
      id: makeStrokeId(),
      points: [...pts],
      color: ui.currentColor,
      size: ui.currentSize,
      brushType: ui.currentBrush,
      opacity: 1,
      timestamp: Date.now(),
    };
    dispatch({ type: "ADD_STROKE", stroke });
    isDrawingRef.current = false;
    currentPtsRef.current = [];
  }

  // ── Color from wheel helper ──────────────────────────────

  function colorFromWheel(px: number, py: number, cx: number, cy: number, r: number): string | null {
    const dx = px - cx, dy = py - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > r) return null;
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const hue = ((angle / (Math.PI * 2)) * 360 + 360) % 360;
    const sat = Math.round((dist / r) * 100);
    return `hsl(${Math.round(hue)},${sat}%,50%)`;
  }

  // ── Timer ────────────────────────────────────────────────

  useEffect(() => {
    if (ui.phase !== "playing") {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      dispatch((prev: any) => {
        const next = prev.timeRemaining - 1;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          finishLevel();
          return prev;
        }
        return { ...prev, timeRemaining: next };
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ui.phase]);

  // ── Level management ─────────────────────────────────────

  function startLevel(worldId: number, levelId: number) {
    const level = WORLDS[worldId].levels[levelId];
    gameEngine.startLevel(worldId, levelId);
    rendererRef.current?.clearCanvas();
    dispatch({ type: "CLEAR_STROKES" });
    dispatch({ type: "SET_WORLD", world: worldId });
    dispatch({ type: "SET_LEVEL", level: levelId });
    dispatch({ type: "TICK", remaining: level.timeLimit });
    dispatch({ type: "SET_PHASE", phase: "playing" });
  }

  function finishLevel() {
    if (timerRef.current) clearInterval(timerRef.current);
    const score = gameEngine.calculateScore(ui.strokes, ui.timeRemaining, WORLDS[ui.currentWorld].levels[ui.currentLevel].timeLimit);
    const result = gameEngine.completeLevel(score);
    dispatch({ type: "LEVEL_COMPLETE", data: result });
    dispatch({ type: "UPDATE_PROGRESS", xp: gameEngine.xp, stars: gameEngine.stars });
  }

  // ── Sync gesture engine with stroke updates ──────────────

  useEffect(() => {
    gameEngine.updateStrokes(ui.strokes, currentPtsRef.current);
  }, [ui.strokes]);

  // ── Inject gesture-hover styles ──────────────────────────

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      button.gesture-hover {
        border-color: #6C63FF !important;
        background: #1a1a40 !important;
        box-shadow: 0 0 12px rgba(108,99,255,0.5);
        transform: scale(1.05);
        transition: all 0.15s;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // ── Render helpers ───────────────────────────────────────

  const level   = WORLDS[ui.currentWorld]?.levels[ui.currentLevel];
  const world   = WORLDS[ui.currentWorld];
  const minutes = Math.floor(ui.timeRemaining / 60);
  const seconds = String(ui.timeRemaining % 60).padStart(2, "0");

  const availableColors  = gameEngine.getAvailableColors();
  const availableBrushes = gameEngine.getAvailableBrushes();

  // ── JSX ──────────────────────────────────────────────────

  return (
    <div style={styles.root}>
      {/* Hidden video processed by CameraFeed */}
      <CameraFeed onGestureState={handleGestureState} />

      {/* ── MENU ── */}
      {ui.phase === "menu" && (
        <div style={styles.overlay}>
          <div style={styles.menuCard}>
            <h1 style={styles.title}>🎨 Color Artist</h1>
            <p style={styles.subtitle}>Gesture Quest</p>
            <p style={{ color: "#aaa", fontSize: 14, marginBottom: 24 }}>
              Control with your hand — no mouse or keyboard
            </p>
            <button style={styles.btnPrimary} onClick={() => dispatch({ type: "SET_PHASE", phase: "worldSelect" })}>
              ✋ Start Playing
            </button>
            <div style={{ marginTop: 12, color: "#888", fontSize: 13 }}>
              XP: {ui.xp} &nbsp;⭐ {ui.totalStars} stars
            </div>
          </div>
        </div>
      )}

      {/* ── WORLD SELECT ── */}
      {ui.phase === "worldSelect" && (
        <div style={styles.overlay}>
          <div style={{ ...styles.menuCard, maxWidth: 700, width: "90%" }}>
            <h2 style={{ color: "#fff", marginBottom: 24 }}>Choose a World</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {WORLDS.map((w) => {
                const locked = !gameEngine.isWorldUnlocked(w.id);
                return (
                  <button
                    key={w.id}
                    style={{
                      ...styles.worldCard,
                      borderColor: w.color,
                      opacity: locked ? 0.45 : 1,
                      cursor: locked ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (locked) return;
                      dispatch({ type: "SET_WORLD", world: w.id });
                      dispatch({ type: "SET_PHASE", phase: "levelSelect" });
                    }}
                  >
                    <span style={{ fontSize: 36 }}>{w.emoji}</span>
                    <div style={{ color: w.color, fontWeight: 700, marginTop: 6 }}>{w.name}</div>
                    <div style={{ color: "#aaa", fontSize: 12 }}>{w.description}</div>
                    {locked && (
                      <div style={{ color: "#f90", fontSize: 11, marginTop: 4 }}>
                        🔒 Requires {w.xpRequired} XP
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button style={{ ...styles.btnSecondary, marginTop: 20 }} onClick={() => dispatch({ type: "SET_PHASE", phase: "menu" })}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* ── LEVEL SELECT ── */}
      {ui.phase === "levelSelect" && (
        <div style={styles.overlay}>
          <div style={{ ...styles.menuCard, maxWidth: 600, width: "90%" }}>
            <h2 style={{ color: world?.color }}>{world?.emoji} {world?.name}</h2>
            <p style={{ color: "#aaa", marginBottom: 20 }}>{world?.description}</p>
            {WORLDS[ui.currentWorld].levels.map((lv) => {
              const lStars = gameEngine.getLevelStars(ui.currentWorld, lv.id);
              return (
                <button key={lv.id} style={styles.levelCard} onClick={() => startLevel(ui.currentWorld, lv.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#fff", fontWeight: 600 }}>{lv.id + 1}. {lv.name}</span>
                    <span>{[0,1,2].map(i => <span key={i}>{i < lStars ? "⭐" : "☆"}</span>)}</span>
                  </div>
                  <div style={{ color: "#999", fontSize: 12, marginTop: 4 }}>{lv.description}</div>
                  <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>⏱ {lv.timeLimit}s</div>
                </button>
              );
            })}
            <button style={{ ...styles.btnSecondary, marginTop: 16 }} onClick={() => dispatch({ type: "SET_PHASE", phase: "worldSelect" })}>
              ← Worlds
            </button>
          </div>
        </div>
      )}

      {/* ── GAME CANVAS ── */}
      {(ui.phase === "playing" || ui.phase === "paused") && (
        <div style={styles.gameArea}>
          {/* HUD */}
          <div style={styles.hud}>
            <span style={{ color: world?.color }}>{world?.emoji} {world?.name}</span>
            <span style={{ color: "#fff" }}>{level?.name}</span>
            <span style={{ color: ui.timeRemaining < 10 ? "#f55" : "#fff" }}>
              ⏱ {minutes}:{seconds}
            </span>
            <span>⭐ {ui.totalStars}</span>
            <span style={{ color: "#aaa" }}>XP {ui.xp}</span>
          </div>

          {/* Canvas stack */}
          <div style={styles.canvasWrap}>
            <CanvasRenderer
              ref={rendererRef}
              strokes={ui.strokes}
              currentStroke={currentPtsRef.current}
              gesture={gestureRef.current}
              currentColor={ui.currentColor}
              currentSize={ui.currentSize}
              currentBrush={ui.currentBrush}
              guideShapes={level?.target.guideShapes}
              showColorWheel={ui.showColorWheel}
              colorWheelX={ui.colorWheelX}
              colorWheelY={ui.colorWheelY}
              width={CANVAS_W}
              height={CANVAS_H}
            />
          </div>

          {/* Gesture / brush sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.gestureBox}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>GESTURE</div>
              <div style={{ fontSize: 22 }}>{gestureEmoji(ui.lastGesture)}</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{ui.lastGesture}</div>
            </div>

            <div style={styles.colorSwatch} title="Current color">
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: ui.currentColor, border: "2px solid #fff" }} />
              <div style={{ fontSize: 10, color: "#aaa" }}>PINCH → wheel</div>
            </div>

            <div style={styles.brushBox}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>BRUSH</div>
              {availableBrushes.map((b) => (
                <button
                  key={b}
                  style={{ ...styles.brushBtn, borderColor: ui.currentBrush === b ? "#fff" : "#444" }}
                  onClick={() => dispatch({ type: "SET_BRUSH", brush: b })}
                >
                  {brushEmoji(b)} {b}
                </button>
              ))}
            </div>

            <div style={styles.brushBox}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>SIZE ✌️</div>
              {Object.entries(BRUSH_SIZES).map(([label, sz]) => (
                <button
                  key={label}
                  style={{ ...styles.brushBtn, borderColor: ui.currentSize === sz ? "#fff" : "#444" }}
                  onClick={() => dispatch({ type: "SET_SIZE", size: sz })}
                >
                  {label}
                </button>
              ))}
            </div>

            <button style={styles.btnSmall} onClick={() => dispatch({ type: "UNDO" })}>↩ Undo</button>
            <button style={styles.btnSmall} onClick={() => rendererRef.current?.clearCanvas() || dispatch({ type: "CLEAR_STROKES" })}>🗑 Clear</button>
            <button style={styles.btnSmall} onClick={() => finishLevel()}>✅ Done</button>
          </div>

          {/* Hint */}
          {level?.hint && (
            <div style={styles.hint}>💡 {level.hint}</div>
          )}

          {/* Pause overlay */}
          {ui.phase === "paused" && (
            <div style={styles.pauseOverlay}>
              <div style={styles.menuCard}>
                <h2 style={{ color: "#fff" }}>✊ Paused</h2>
                <p style={{ color: "#aaa" }}>Open your palm or close fist to resume</p>
                <button style={styles.btnPrimary} onClick={() => dispatch({ type: "SET_PHASE", phase: "playing" })}>
                  ▶ Resume
                </button>
                <button style={{ ...styles.btnSecondary, marginTop: 10 }} onClick={() => dispatch({ type: "SET_PHASE", phase: "levelSelect" })}>
                  ← Levels
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LEVEL COMPLETE ── */}
      {ui.phase === "levelComplete" && ui.completeData && (
        <div style={styles.overlay}>
          <div style={{ ...styles.menuCard, maxWidth: 480 }}>
            <h2 style={{ color: "#FFD700", fontSize: 28 }}>
              {["😐","🌟","⭐⭐","🏆"][Math.min(3, ui.completeData.stars)]} Level Complete!
            </h2>
            <div style={{ fontSize: 42, margin: "12px 0" }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ filter: i < ui.completeData!.stars ? "none" : "grayscale(1)" }}>⭐</span>
              ))}
            </div>
            <p style={{ color: "#aaa", fontSize: 14 }}>+{ui.completeData.xpGained} XP</p>
            {ui.completeData.unlocks.map((u, i) => (
              <div key={i} style={{ background: "#2a2a3a", borderRadius: 8, padding: "8px 14px", marginTop: 8, color: "#FFD700" }}>
                🎁 {u.description}
              </div>
            ))}
            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <button style={styles.btnPrimary} onClick={() => startLevel(ui.currentWorld, ui.currentLevel)}>
                🔄 Retry
              </button>
              {ui.currentLevel < WORLDS[ui.currentWorld].levels.length - 1 && (
                <button style={styles.btnPrimary} onClick={() => startLevel(ui.currentWorld, ui.currentLevel + 1)}>
                  Next →
                </button>
              )}
              <button style={styles.btnSecondary} onClick={() => dispatch({ type: "SET_PHASE", phase: "levelSelect" })}>
                Levels
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────

function gestureEmoji(g: GestureState["gesture"]): string {
  switch (g) {
    case "OPEN_PALM": return "✋";
    case "DRAW":      return "👆";
    case "FIST":      return "✊";
    case "PINCH":     return "🤏";
    case "PEACE":     return "✌️";
    default:          return "🤚";
  }
}

function brushEmoji(b: BrushType): string {
  switch (b) {
    case "basic":    return "🖊";
    case "smooth":   return "🖌";
    case "gradient": return "🌈";
    case "neon":     return "⚡";
    case "particle": return "✨";
    default:         return "🖊";
  }
}

// ── Styles ───────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: "100vw", height: "100vh", background: "#0e0e1a",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden",
  },
  overlay: {
    position: "absolute", inset: 0, background: "rgba(10,10,20,0.92)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
  },
  menuCard: {
    background: "#16162a", borderRadius: 20, padding: "40px 48px",
    textAlign: "center", border: "1px solid #2a2a4a", maxWidth: 420, width: "90%",
  },
  title: { color: "#fff", fontSize: 42, fontWeight: 800, margin: 0 },
  subtitle: { color: "#6C63FF", fontSize: 20, fontWeight: 600, margin: "4px 0 16px" },
  btnPrimary: {
    background: "linear-gradient(135deg,#6C63FF,#9B59B6)", color: "#fff",
    border: "none", borderRadius: 12, padding: "14px 28px",
    fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%",
  },
  btnSecondary: {
    background: "#2a2a3a", color: "#ccc", border: "1px solid #3a3a5a",
    borderRadius: 10, padding: "10px 20px", fontSize: 14, cursor: "pointer",
  },
  btnSmall: {
    background: "#1e1e2e", color: "#ccc", border: "1px solid #3a3a5a",
    borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer",
    marginTop: 6, width: "100%",
  },
  worldCard: {
    background: "#1a1a2e", border: "2px solid transparent", borderRadius: 16,
    padding: "20px 16px", cursor: "pointer", textAlign: "center",
    transition: "transform 0.1s", color: "#fff",
  },
  levelCard: {
    background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12,
    padding: "14px 18px", cursor: "pointer", textAlign: "left", marginBottom: 8,
    width: "100%",
  },
  gameArea: {
    position: "relative", width: "100vw", height: "100vh",
    display: "flex", flexDirection: "column",
  },
  hud: {
    display: "flex", gap: 24, padding: "10px 20px",
    background: "rgba(0,0,0,0.6)", alignItems: "center", fontSize: 14,
    borderBottom: "1px solid #2a2a4a", zIndex: 5, flexShrink: 0,
  },
  canvasWrap: {
    flex: 1, position: "relative", overflow: "hidden",
    background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)",
  },
  sidebar: {
    position: "absolute", right: 0, top: 44, bottom: 0,
    width: 130, background: "rgba(10,10,20,0.85)",
    borderLeft: "1px solid #2a2a4a", padding: "12px 10px",
    display: "flex", flexDirection: "column", gap: 8,
    overflowY: "auto", zIndex: 5,
  },
  gestureBox: {
    background: "#1a1a2e", borderRadius: 10, padding: "8px", textAlign: "center",
  },
  colorSwatch: {
    background: "#1a1a2e", borderRadius: 10, padding: "8px",
    textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  },
  brushBox: {
    background: "#1a1a2e", borderRadius: 10, padding: "8px",
  },
  brushBtn: {
    background: "#0e0e1a", color: "#ccc", border: "1px solid",
    borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer",
    display: "block", width: "100%", marginBottom: 4, textAlign: "left",
  },
  hint: {
    position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.7)", color: "#ccc", fontSize: 12,
    borderRadius: 8, padding: "6px 14px", zIndex: 5,
    maxWidth: 400, textAlign: "center",
  },
  gestureHoverButton: {
    borderColor: "#6C63FF",
    background: "#1a1a40",
    boxShadow: "0 0 12px rgba(108,99,255,0.5)",
    transform: "scale(1.05)",
  },
  pauseOverlay: {
    position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20,
  },
};
