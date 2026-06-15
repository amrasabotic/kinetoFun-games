import { useRef, useState, useEffect, useCallback } from 'react';
import type {
  Balloon,
  Effect,
  GameConfig,
  GamePhase,
  HandCursor,
  PowerUpState,
  Scores,
  EffectType,
} from '../game/types';
import { createBalloon } from '../game/balloonFactory';
import { createEffect, updateEffect } from '../game/effectsFactory';
import { getDifficultyParams } from '../game/difficulty';
import { renderFrame, drawScorePopup } from '../game/canvasRenderer';
import {
  POINTS,
  FREEZE_DURATION,
  FREEZE_SPEED_MULTIPLIER,
  COMBO_DURATION,
  COMBO_MULTIPLIER,
  POP_DURATION,
  SHAKE_DURATION,
  SHAKE_INTENSITY,
  PLAYER_COLORS,
} from '../constants/gameConfig';
import { distance, uid } from '../utils/mathUtils';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ScorePopup {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
}

interface EngineState {
  balloons: Balloon[];
  effects: Effect[];
  scorePopups: ScorePopup[];
  powerUps: PowerUpState;
  scores: Scores;
  timeLeft: number;
  gamePhase: GamePhase;
  lastSpawnTime: number;
  gameStartTime: number;
  elapsedPauseTime: number;
  pauseStartTime: number | null;
  screenShake: { x: number; y: number; endTime: number };
  comboMultiplier: number;
  winner: 'p1' | 'p2' | 'tie' | null;
}

interface UseGameEngineReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  scores: Scores;
  timeLeft: number;
  gamePhase: GamePhase;
  powerUps: PowerUpState;
  comboMultiplier: number;
  winner: 'p1' | 'p2' | 'tie' | null;
  startGame: (config: GameConfig) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  returnToMenu: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useGameEngine(
  cursorsRef: React.RefObject<HandCursor[]>,
  playSound: (name: string) => void,
): UseGameEngineReturn {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const stateRef   = useRef<EngineState>(makeInitialState());
  const rafRef     = useRef<number>(0);
  const configRef  = useRef<GameConfig | null>(null);

  // Reactive state for UI components (updated sparingly to avoid perf impact)
  const [uiScores,     setUiScores]     = useState<Scores>({ p1: 0, p2: 0 });
  const [uiTimeLeft,   setUiTimeLeft]   = useState(60);
  const [uiPhase,      setUiPhase]      = useState<GamePhase>('menu');
  const [uiPowerUps,   setUiPowerUps]   = useState<PowerUpState>(makePowerUpState());
  const [uiCombo,      setUiCombo]      = useState(1);
  const [uiWinner,     setUiWinner]     = useState<'p1' | 'p2' | 'tie' | null>(null);

  // Track previously emitted UI values to avoid unnecessary setState calls
  const lastUiRef = useRef({ timeLeft: -1, p1: -1, p2: -1 });

  // ── Collision ──────────────────────────────────────────────────────────

  function checkCollisions(now: number) {
    const s = stateRef.current;
    const cursors = cursorsRef.current ?? [];

    for (const balloon of s.balloons) {
      if (balloon.popped) continue;

      for (const cursor of cursors) {
        if (!cursor.active) continue;

        const dist = distance(cursor.x, cursor.y, balloon.x, balloon.y);
        if (dist > balloon.hitboxRadius) continue;

        // --- POP! ---
        popBalloon(balloon, cursor.playerId, now);
        break; // one cursor pops per balloon per frame
      }
    }
  }

  function popBalloon(balloon: Balloon, playerId: 1 | 2, now: number) {
    const s = stateRef.current;
    balloon.popped = true;
    balloon.popTime = now;
    balloon.poppedByPlayer = playerId;

    // Point calculation
    const basePoints = POINTS[balloon.type] ?? 0;
    const multiplier = s.powerUps.comboActive ? s.comboMultiplier : 1;
    const points = basePoints > 0 ? Math.round(basePoints * multiplier) : basePoints;

    const pKey = playerId === 1 ? 'p1' : 'p2';

    if (balloon.type !== 'freeze' && balloon.type !== 'rainbow') {
      s.scores[pKey] = Math.max(0, s.scores[pKey] + points);
    }

    // Score popup
    if (points !== 0) {
      const color = points > 0
        ? (balloon.type === 'golden' ? '#FFD700' : PLAYER_COLORS[playerId])
        : '#FF4444';
      s.scorePopups.push({
        id: uid(),
        x: balloon.x,
        y: balloon.y - balloon.radius,
        text: points > 0 ? `+${points}` : `${points}`,
        color,
        createdAt: now,
      });
    }

    // Visual effect
    const effectType: EffectType =
      balloon.type === 'golden'  ? 'goldPop'     :
      balloon.type === 'bomb'    ? 'explosion'   :
      balloon.type === 'freeze'  ? 'iceShatter'  :
      balloon.type === 'rainbow' ? 'rainbowBurst': 'pop';

    s.effects.push(createEffect(effectType, balloon.x, balloon.y, balloon.color, balloon.radius, now));

    // Power-up side effects
    if (balloon.type === 'freeze') {
      s.powerUps.freezeActive = true;
      s.powerUps.freezeEndTime = now + FREEZE_DURATION;
      playSound('freeze');
    } else if (balloon.type === 'rainbow') {
      s.powerUps.comboActive  = true;
      s.powerUps.comboEndTime = now + COMBO_DURATION;
      s.comboMultiplier       = COMBO_MULTIPLIER;
      playSound('rainbow');
    } else if (balloon.type === 'bomb') {
      s.screenShake.x       = 0;
      s.screenShake.y       = 0;
      s.screenShake.endTime = now + SHAKE_DURATION;
      playSound('bomb');
    } else if (balloon.type === 'golden') {
      playSound('goldPop');
    } else {
      playSound('pop');
    }
  }

  // ── Spawn ──────────────────────────────────────────────────────────────

  function spawnBalloons(now: number, canvas: HTMLCanvasElement) {
    const s = stateRef.current;
    const elapsed = (now - s.gameStartTime - s.elapsedPauseTime) / 1000;
    const params  = getDifficultyParams(elapsed, canvas.height);

    const speedMult = s.powerUps.freezeActive ? FREEZE_SPEED_MULTIPLIER : 1;

    if (now - s.lastSpawnTime >= params.spawnRate) {
      const balloon = createBalloon(canvas.width, canvas.height, params, now);
      balloon.baseSpeed *= speedMult; // apply freeze if active at spawn time
      s.balloons.push(balloon);
      s.lastSpawnTime = now;
    }

    // Also update existing balloon speeds when freeze toggles
    for (const b of s.balloons) {
      if (!b.popped) {
        const elapsed2 = (now - s.gameStartTime - s.elapsedPauseTime) / 1000;
        const p2 = getDifficultyParams(elapsed2, canvas.height);
        const targetSpeed = p2.speed * (s.powerUps.freezeActive ? FREEZE_SPEED_MULTIPLIER : 1);
        // Smooth speed transition
        b.baseSpeed += (targetSpeed - b.baseSpeed) * 0.05;
      }
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────

  function updateBalloons(dt: number, now: number, canvas: HTMLCanvasElement) {
    const s = stateRef.current;
    const dtSec = dt / 1000;

    s.balloons = s.balloons.filter(b => {
      if (b.popped) {
        // Keep until pop animation finishes
        return b.popTime !== null && now - b.popTime < POP_DURATION + 50;
      }
      // Remove if floated off-screen top
      return b.y + b.radius > -20;
    });

    for (const b of s.balloons) {
      if (b.popped) continue;
      // cos is the velocity for a sinusoidal position — gives clean ±wobbleAmount sway
      b.x += Math.cos(b.wobblePhase) * b.wobbleSpeed * b.wobbleAmount * dtSec;
      b.wobblePhase += b.wobbleSpeed * dtSec;
      b.y -= b.baseSpeed * dtSec;

      // Clamp x within canvas
      b.x = Math.max(b.radius, Math.min(canvas.width - b.radius, b.x));
    }
  }

  function updateEffects(dt: number) {
    const s = stateRef.current;
    for (const e of s.effects) updateEffect(e, dt);
    s.effects = s.effects.filter(e => !e.done);

    // Prune old score popups
    const now = performance.now();
    s.scorePopups = s.scorePopups.filter(p => now - p.createdAt < 900);
  }

  function updatePowerUps(now: number) {
    const s = stateRef.current;

    if (s.powerUps.freezeActive && now >= s.powerUps.freezeEndTime) {
      s.powerUps.freezeActive = false;
      flushUiPowerUps();
    }
    if (s.powerUps.comboActive && now >= s.powerUps.comboEndTime) {
      s.powerUps.comboActive  = false;
      s.comboMultiplier       = 1;
      setUiCombo(1);
      flushUiPowerUps();
    }
  }

  function updateScreenShake(now: number) {
    const s = stateRef.current;
    if (now < s.screenShake.endTime) {
      const progress = 1 - (s.screenShake.endTime - now) / SHAKE_DURATION;
      const intensity = SHAKE_INTENSITY * (1 - progress);
      s.screenShake.x = (Math.random() - 0.5) * intensity * 2;
      s.screenShake.y = (Math.random() - 0.5) * intensity * 2;
    } else {
      s.screenShake.x = 0;
      s.screenShake.y = 0;
    }
  }

  function updateTimer(now: number) {
    const s = stateRef.current;
    if (!configRef.current?.duration) return; // endless has no timer

    const gameElapsed = (now - s.gameStartTime - s.elapsedPauseTime) / 1000;
    const remaining   = Math.max(0, configRef.current.duration - gameElapsed);
    s.timeLeft = remaining;

    // Low-frequency UI update for timer (every 100ms is enough)
    const roundedSec = Math.ceil(remaining);
    if (roundedSec !== lastUiRef.current.timeLeft) {
      lastUiRef.current.timeLeft = roundedSec;
      setUiTimeLeft(remaining);
    }

    if (remaining <= 0) {
      triggerGameEnd();
    }
  }

  function triggerGameEnd() {
    const s = stateRef.current;
    if (s.gamePhase === 'end') return;

    s.gamePhase = 'end';
    setUiPhase('end');

    // Determine winner (party mode)
    if ((configRef.current?.playerCount ?? 1) > 1) {
      if (s.scores.p1 > s.scores.p2) {
        s.winner = 'p1';
      } else if (s.scores.p2 > s.scores.p1) {
        s.winner = 'p2';
      } else {
        s.winner = 'tie';
      }
    } else {
      s.winner = 'p1'; // single player always "wins"
    }
    setUiWinner(s.winner);
    playSound('victory');
  }

  // ── Flush UI state ─────────────────────────────────────────────────────

  function flushUiScores() {
    const { p1, p2 } = stateRef.current.scores;
    if (p1 !== lastUiRef.current.p1 || p2 !== lastUiRef.current.p2) {
      lastUiRef.current.p1 = p1;
      lastUiRef.current.p2 = p2;
      setUiScores({ p1, p2 });
    }
  }

  function flushUiPowerUps() {
    setUiPowerUps({ ...stateRef.current.powerUps });
  }

  // ── Game loop ──────────────────────────────────────────────────────────

  const lastFrameRef = useRef<number>(0);

  const loop = useCallback((now: number) => {
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext('2d');
    if (!canvas || !ctx) { rafRef.current = requestAnimationFrame(loop); return; }

    const dt = Math.min(now - lastFrameRef.current, 50); // cap at 50ms to avoid spiral
    lastFrameRef.current = now;

    const s = stateRef.current;

    if (s.gamePhase === 'playing') {
      spawnBalloons(now, canvas);
      updateBalloons(dt, now, canvas);
      updateEffects(dt);
      updatePowerUps(now);
      updateScreenShake(now);
      checkCollisions(now);
      updateTimer(now);
      flushUiScores();
    } else if (s.gamePhase === 'paused') {
      // Still render, but no updates
    }

    // Always render (so menu animations etc. still look alive)
    const shakeOffset = { x: s.screenShake.x, y: s.screenShake.y };

    renderFrame(ctx, s.balloons, s.effects, s.powerUps, shakeOffset, s.comboMultiplier, now);

    // Score popups rendered on top
    for (const popup of s.scorePopups) {
      drawScorePopup(ctx, popup.text, popup.x, popup.y, popup.color, now - popup.createdAt);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  // ── Public API ─────────────────────────────────────────────────────────

  const startGame = useCallback((config: GameConfig) => {
    configRef.current = config;

    const now = performance.now();
    const s = stateRef.current;

    s.balloons          = [];
    s.effects           = [];
    s.scorePopups       = [];
    s.powerUps          = makePowerUpState();
    s.scores            = { p1: 0, p2: 0 };
    s.timeLeft          = config.duration ?? 0;
    s.gamePhase         = 'playing';
    s.lastSpawnTime     = now - 500; // spawn first balloon almost immediately
    s.gameStartTime     = now;
    s.elapsedPauseTime  = 0;
    s.pauseStartTime    = null;
    s.screenShake       = { x: 0, y: 0, endTime: 0 };
    s.comboMultiplier   = 1;
    s.winner            = null;

    setUiScores({ p1: 0, p2: 0 });
    setUiTimeLeft(config.duration ?? 0);
    setUiPhase('playing');
    setUiPowerUps(makePowerUpState());
    setUiCombo(1);
    setUiWinner(null);
    lastUiRef.current = { timeLeft: config.duration ?? 0, p1: 0, p2: 0 };
  }, []);

  const pauseGame = useCallback(() => {
    const s = stateRef.current;
    if (s.gamePhase !== 'playing') return;
    s.gamePhase      = 'paused';
    s.pauseStartTime = performance.now();
    setUiPhase('paused');
  }, []);

  const resumeGame = useCallback(() => {
    const s = stateRef.current;
    if (s.gamePhase !== 'paused') return;
    if (s.pauseStartTime !== null) {
      s.elapsedPauseTime += performance.now() - s.pauseStartTime;
      s.pauseStartTime    = null;
    }
    s.gamePhase = 'playing';
    setUiPhase('playing');
  }, []);

  const endGame = useCallback(() => {
    triggerGameEnd();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const returnToMenu = useCallback(() => {
    const s = stateRef.current;
    s.balloons    = [];
    s.effects     = [];
    s.scorePopups = [];
    s.gamePhase   = 'menu';
    configRef.current = null;
    setUiPhase('menu');
  }, []);

  return {
    canvasRef,
    scores:          uiScores,
    timeLeft:        uiTimeLeft,
    gamePhase:       uiPhase,
    powerUps:        uiPowerUps,
    comboMultiplier: uiCombo,
    winner:          uiWinner,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    returnToMenu,
  };
}

// ─── Initial state helpers ────────────────────────────────────────────────

function makeInitialState(): EngineState {
  return {
    balloons:         [],
    effects:          [],
    scorePopups:      [],
    powerUps:         makePowerUpState(),
    scores:           { p1: 0, p2: 0 },
    timeLeft:         60,
    gamePhase:        'menu',
    lastSpawnTime:    0,
    gameStartTime:    0,
    elapsedPauseTime: 0,
    pauseStartTime:   null,
    screenShake:      { x: 0, y: 0, endTime: 0 },
    comboMultiplier:  1,
    winner:           null,
  };
}

function makePowerUpState(): PowerUpState {
  return {
    freezeActive:  false,
    freezeEndTime: 0,
    comboActive:   false,
    comboEndTime:  0,
  };
}
