'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useHandTracking }    from './useHandTracking';
import { useGameLoop }        from './useGameLoop';
import { PhysicsWorld }       from './physicsEngine';
import { createGestureState, processLandmarks } from './gestureController';
import { renderFrame, calcStars }               from './canvasRenderer';
import { LEVELS, TOTAL_LEVELS }                 from './levels';
import styles from './styles.module.css';

// ─── Canvas dimensions ───────────────────────────────────────────────────────
const W = 800;
const H = 560;

// ─── Thumbs-up config ────────────────────────────────────────────────────────
const THUMBSUP_HOLD_FRAMES = 18;
const THUMBSUP_COOLDOWN    = 50;

// ─── localStorage persistence ────────────────────────────────────────────────
const SAVE_KEY = 'happyglass_progress';

function loadProgress() {
  if (typeof window === 'undefined') return { highestUnlocked: 1, stars: {} };
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      highestUnlocked: d.highestUnlocked ?? 1,
      stars:           d.stars           ?? {},
    };
  } catch {
    return { highestUnlocked: 1, stars: {} };
  }
}

function saveProgress(highestUnlocked, stars) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ highestUnlocked, stars })); }
  catch { /* quota errors — silently ignore */ }
}

// ─── Level-select grid constants (must match canvasRenderer) ─────────────────
const CARD_W  = 140;
const CARD_H  = 96;
const CARD_GAP = 8;
const COLS    = 5;
const ROWS    = 4;
const GRID_X  = Math.round((W - COLS * CARD_W - (COLS - 1) * CARD_GAP) / 2); // 34
const GRID_Y  = 70;

// ─── Stroke point simplification ─────────────────────────────────────────────
function simplifyPoints(points, minDist = 8) {
  if (points.length < 2) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const last = out[out.length - 1];
    const dx = points[i].x - last.x;
    const dy = points[i].y - last.y;
    if (Math.sqrt(dx * dx + dy * dy) >= minDist) out.push(points[i]);
  }
  return out;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HappyGlassGame() {
  const canvasRef       = useRef(null);
  const videoRef        = useRef(null);
  const physicsRef      = useRef(null);
  const physicsReadyRef = useRef(false);
  const gsRef           = useRef(makeIdleState());
  const gestureRef      = useRef(createGestureState());
  const prevGestureRef  = useRef('none');
  const progressRef     = useRef(loadProgress());

  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const landmarksRef = useHandTracking(videoRef, trackingEnabled);

  // ── State factories ───────────────────────────────────────────────────────

  function makeIdleState() {
    return {
      phase:            'idle',
      level:            1,
      strokes:          [],
      currentStroke:    null,
      particles:        [],
      glass:            null,
      emitterX:         W / 2,
      totalSpawned:     0,
      inGlassCount:     0,
      frameCount:       0,
      settleTimer:      0,
      resolveTimer:     0,
      starsEarned:      0,
      levelConfig:      LEVELS[0],
      thumbsUpHeld:     0,
      thumbsUpCooldown: 0,
      // level-select fields (unused in idle but avoids undefined refs)
      hoveredCard:      0,
      highestUnlocked:  1,
      levelStars:       {},
    };
  }

  function makeLevelSelectState() {
    const prog = progressRef.current;
    return {
      phase:            'levelSelect',
      level:            0,
      strokes:          [],
      currentStroke:    null,
      particles:        [],
      glass:            null,
      emitterX:         W / 2,
      totalSpawned:     0,
      inGlassCount:     0,
      frameCount:       0,
      settleTimer:      0,
      resolveTimer:     0,
      starsEarned:      0,
      levelConfig:      null,
      thumbsUpHeld:     0,
      thumbsUpCooldown: THUMBSUP_COOLDOWN,
      hoveredCard:      0,
      highestUnlocked:  prog.highestUnlocked,
      levelStars:       { ...prog.stars },
    };
  }

  // ── initBuild: enter BUILD phase for a given level index (0-based) ────────
  const initBuild = useCallback((lvlIndex) => {
    if (!physicsReadyRef.current) return;
    const cfg     = LEVELS[lvlIndex];
    const physics = physicsRef.current;

    physics.initLevel(W, H);

    const gx = Math.round(cfg.glass.xFrac * W);
    const gy = H - 50;
    physics.setGlass(gx, gy, cfg.glass.width, cfg.glass.height);

    // Place obstacles defined in the level config
    if (cfg.obstacles?.length) {
      physics.addObstacles(cfg.obstacles, W, H);
    }

    gsRef.current = {
      phase:            'build',
      level:            cfg.id,
      strokes:          [],
      currentStroke:    null,
      particles:        [],
      glass:            physics.glass,
      emitterX:         Math.round(cfg.emitterXFrac * W),
      totalSpawned:     0,
      inGlassCount:     0,
      frameCount:       0,
      settleTimer:      0,
      resolveTimer:     0,
      starsEarned:      0,
      levelConfig:      cfg,
      thumbsUpHeld:     0,
      thumbsUpCooldown: THUMBSUP_COOLDOWN,
      hoveredCard:      0,
      highestUnlocked:  progressRef.current.highestUnlocked,
      levelStars:       { ...progressRef.current.stars },
    };

    prevGestureRef.current = 'none';
  }, []);

  // ── startRun: BUILD → RUN — spawn ALL water particles ONCE ───────────────
  const startRun = useCallback((gs) => {
    const physics = physicsRef.current;
    const cfg     = gs.levelConfig;
    const count   = cfg.waterCount;

    // Compact 3-column grid starting above the emitter;
    // particles arrive sequentially as they fall into frame.
    const cols = 3;
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x   = gs.emitterX + (col - 1) * 11 + (Math.random() - 0.5) * 4;
      const y   = 55 - row * 9;
      const p   = physics.spawnParticle(x, y);
      if (p) spawned++;
    }

    gs.totalSpawned     = spawned;
    gs.phase            = 'run';
    gs.frameCount       = 0;
    gs.settleTimer      = 0;
    gs.particles        = physics.particles;
    gs.thumbsUpCooldown = THUMBSUP_COOLDOWN;
  }, []);

  // ── Physics init (once on mount) ──────────────────────────────────────────
  useEffect(() => {
    const physics = new PhysicsWorld();
    physicsRef.current = physics;

    physics.load().then(() => {
      physicsReadyRef.current = true;
      progressRef.current = loadProgress(); // re-read after hydration
      setTrackingEnabled(true);
    }).catch(err => {
      console.error('[HappyGlass] matter-js load failed', err);
    });

    return () => {
      physics.destroy();
      physicsReadyRef.current = false;
    };
  }, []);

  // ── Game loop ─────────────────────────────────────────────────────────────
  useGameLoop(() => {
    if (!physicsReadyRef.current) return;

    const gs      = gsRef.current;
    const physics = physicsRef.current;

    // ── Gesture ──────────────────────────────────────────────────────────
    const gesture = processLandmarks(landmarksRef.current, gestureRef.current, W, H);
    gestureRef.current = gesture;

    // ── Thumbs-up debounce ────────────────────────────────────────────────
    if (gs.thumbsUpCooldown > 0) gs.thumbsUpCooldown--;
    const isThumbsUp = gesture.gesture === 'thumbsup';
    if (isThumbsUp && gs.thumbsUpCooldown === 0) {
      gs.thumbsUpHeld++;
    } else if (!isThumbsUp) {
      gs.thumbsUpHeld = 0;
    }
    const thumbsUpFired = gs.thumbsUpHeld === THUMBSUP_HOLD_FRAMES;

    // ══ IDLE ════════════════════════════════════════════════════════════════
    if (gs.phase === 'idle') {
      if (thumbsUpFired) {
        gsRef.current = makeLevelSelectState();
      }
      renderFrame(canvasRef.current, gs, gesture);
      return;
    }

    // ══ LEVEL SELECT ════════════════════════════════════════════════════════
    if (gs.phase === 'levelSelect') {
      // Track which card the cursor hovers over
      const cx = gesture.smoothX;
      const cy = gesture.smoothY;
      let hovered = 0;
      outer: for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cardX = GRID_X + col * (CARD_W + CARD_GAP);
          const cardY = GRID_Y + row * (CARD_H + CARD_GAP);
          if (cx >= cardX && cx <= cardX + CARD_W && cy >= cardY && cy <= cardY + CARD_H) {
            hovered = row * COLS + col + 1; // 1-based level id
            break outer;
          }
        }
      }
      gs.hoveredCard = hovered;

      if (thumbsUpFired && hovered > 0 && hovered <= gs.highestUnlocked) {
        initBuild(hovered - 1);
      }

      renderFrame(canvasRef.current, gs, gesture);
      return;
    }

    // ══ BUILD ════════════════════════════════════════════════════════════════
    if (gs.phase === 'build') {
      const isPinch  = gesture.gesture === 'pinch';
      const wasPinch = prevGestureRef.current === 'pinch';

      if (isPinch && !wasPinch) {
        gs.currentStroke = [{ x: gesture.smoothX, y: gesture.smoothY }];
      } else if (isPinch && gs.currentStroke) {
        const last = gs.currentStroke[gs.currentStroke.length - 1];
        const dx   = gesture.smoothX - last.x;
        const dy   = gesture.smoothY - last.y;
        if (Math.sqrt(dx * dx + dy * dy) >= 8) {
          gs.currentStroke.push({ x: gesture.smoothX, y: gesture.smoothY });
          if (gs.currentStroke.length > 60) gs.currentStroke = gs.currentStroke.slice(-60);
        }
      } else if (!isPinch && wasPinch && gs.currentStroke) {
        const simplified = simplifyPoints(gs.currentStroke, 8);
        if (simplified.length >= 2) {
          const bodies = physics.addStroke(simplified);
          gs.strokes.push({ points: simplified, bodies });
        }
        gs.currentStroke = null;
      }

      prevGestureRef.current = gesture.gesture;

      if (thumbsUpFired) startRun(gs);

      renderFrame(canvasRef.current, gs, gesture);
      return;
    }

    // ══ RUN ══════════════════════════════════════════════════════════════════
    if (gs.phase === 'run') {
      physics.step();
      physics.pruneOffscreen();
      gs.particles    = physics.particles;
      gs.inGlassCount = physics.countInGlass();
      gs.frameCount++;

      if (gs.frameCount > 90) {
        const allSlow = physics.particles.every(p => p.speed < 1.2);
        if (allSlow) { gs.settleTimer++; } else { gs.settleTimer = 0; }

        const forceResolve = gs.frameCount > 600;
        if (gs.settleTimer > 45 || forceResolve) {
          const fillRate    = gs.totalSpawned > 0 ? gs.inGlassCount / gs.totalSpawned : 0;
          const success     = fillRate >= (gs.levelConfig?.targetFill ?? 0.55);
          const starsEarned = success ? calcStars(gs.strokes.length, gs.levelConfig) : 0;
          gsRef.current = { ...gs, phase: 'resolve', resolveTimer: 0, starsEarned };
          renderFrame(canvasRef.current, gsRef.current, gesture);
          return;
        }
      }

      renderFrame(canvasRef.current, gs, gesture);
      return;
    }

    // ══ RESOLVE ══════════════════════════════════════════════════════════════
    if (gs.phase === 'resolve') {
      physics.step();
      physics.pruneOffscreen();
      gs.particles    = physics.particles;
      gs.inGlassCount = physics.countInGlass();
      gs.resolveTimer++;

      if (gs.resolveTimer === 1) {
        // Save progress on the very first resolve frame
        const fillRate = gs.totalSpawned > 0 ? gs.inGlassCount / gs.totalSpawned : 0;
        const success  = fillRate >= (gs.levelConfig?.targetFill ?? 0.55);
        if (success) {
          const prog = progressRef.current;
          const lvl  = gs.level;
          prog.stars[lvl] = Math.max(prog.stars[lvl] || 0, gs.starsEarned);
          if (lvl < TOTAL_LEVELS) {
            prog.highestUnlocked = Math.max(prog.highestUnlocked, lvl + 1);
          }
          saveProgress(prog.highestUnlocked, prog.stars);
          progressRef.current = { ...prog };
        }
      }

      if (gs.resolveTimer > 120) {
        const fillRate = gs.totalSpawned > 0 ? gs.inGlassCount / gs.totalSpawned : 0;
        const success  = fillRate >= (gs.levelConfig?.targetFill ?? 0.55);

        if (success) {
          // Back to level select (progress already saved above)
          gsRef.current = makeLevelSelectState();
        } else {
          initBuild(gs.level - 1); // retry same level
        }
      }

      renderFrame(canvasRef.current, gs, gesture);
      return;
    }

    // ══ COMPLETE ═════════════════════════════════════════════════════════════
    // Shown after finishing level 20. Thumbs-up returns to level select.
    if (gs.phase === 'complete') {
      if (thumbsUpFired) {
        gsRef.current = makeLevelSelectState();
      }
      renderFrame(canvasRef.current, gs, gesture);
      return;
    }
  }, true);

  return (
    <div className={styles.wrapper}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className={styles.canvas}
      />
      <video
        ref={videoRef}
        className={styles.webcamPreview}
        playsInline
        muted
      />
    </div>
  );
}
