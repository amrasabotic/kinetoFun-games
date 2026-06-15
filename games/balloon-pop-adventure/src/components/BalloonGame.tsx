import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { GameConfig, GameMode, Settings } from '../game/types';
import { useGameEngine } from '../hooks/useGameEngine';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useAudio } from '../hooks/useAudio';
import { drawCursor } from '../game/canvasRenderer';
import { getHighScores, saveHighScore, getSettings, saveSettings } from '../utils/storage';
import { Menu } from './Menu';
import { ModeSelect } from './ModeSelect';
import { Countdown } from './Countdown';
import { HUD } from './HUD';
import { PauseScreen } from './PauseScreen';
import { EndScreen } from './EndScreen';
import { SettingsPanel } from './SettingsPanel';
import { HowToPlay } from './HowToPlay';

// ─── Dwell-click configuration ────────────────────────────────────────────

/** ms the cursor must stay within DWELL_MOVE_PX to fire a click */
const DWELL_MS       = 1400;
/** px of allowed movement before dwell resets */
const DWELL_MOVE_PX  = 50;

interface DwellEntry {
  anchorX: number;
  anchorY: number;
  startTime: number;
  fired: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

export function BalloonGame() {
  // ── Settings & scores ─────────────────────────────────────────────────
  const [settings,   setSettings]  = useState<Settings>(() => getSettings());
  const [highScores, setHighScores] = useState(() => getHighScores());

  // ── Navigation state ──────────────────────────────────────────────────
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [showCountdown,  setShowCountdown]  = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showHowToPlay,  setShowHowToPlay]  = useState(false);
  const [isNewRecord,    setIsNewRecord]    = useState(false);

  // ── Current game config ───────────────────────────────────────────────
  const [currentConfig, setCurrentConfig] = useState<GameConfig | null>(null);
  const pendingConfig = useRef<GameConfig | null>(null);

  // ── Responsive canvas dimensions ──────────────────────────────────────
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    function onResize() { setDims({ w: window.innerWidth, h: window.innerHeight }); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Camera video element ───────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Audio ─────────────────────────────────────────────────────────────
  const { play: playSound, destroy: destroyAudio } = useAudio(settings);
  useEffect(() => () => destroyAudio(), [destroyAudio]);

  // ── MediaPipe hand tracking ───────────────────────────────────────────
  const activePlayerCount: 1 | 2 = currentConfig?.playerCount ?? 1;
  const cursorsRef = useMediaPipe(videoRef, {
    canvasWidth:  dims.w,
    canvasHeight: dims.h,
    playerCount:  activePlayerCount,
    enabled:      true,
  });

  // ── Game engine ────────────────────────────────────────────────────────
  const {
    canvasRef,
    scores,
    timeLeft,
    gamePhase,
    powerUps,
    comboMultiplier,
    winner,
    startGame,
    pauseGame,
    resumeGame,
    returnToMenu,
  } = useGameEngine(cursorsRef, playSound);

  // ── Resize game canvas to fill the window ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = dims.w;
    canvas.height = dims.h;
  }, [dims, canvasRef]);

  // ── Save high score on game end ────────────────────────────────────────
  useEffect(() => {
    if (gamePhase !== 'end' || !currentConfig) return;
    const top = currentConfig.playerCount === 2
      ? Math.max(scores.p1, scores.p2)
      : scores.p1;
    const isNew = saveHighScore(currentConfig.mode, top);
    setIsNewRecord(isNew);
    if (isNew) setHighScores(getHighScores());
  }, [gamePhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation handlers ────────────────────────────────────────────────

  const handleModeSelect = useCallback((mode: GameMode) => {
    const pc: 1 | 2 = mode === 'party' ? 2 : 1;
    const duration   = mode === 'classic' ? 60 : mode === 'party' ? 90 : null;
    const cfg: GameConfig = { mode, playerCount: pc, duration };
    setCurrentConfig(cfg);
    pendingConfig.current = cfg;
    setShowModeSelect(false);
    returnToMenu();
    setShowCountdown(true);
  }, [returnToMenu]);

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    if (pendingConfig.current) startGame(pendingConfig.current);
  }, [startGame]);

  const handlePlayAgain = useCallback(() => {
    if (!currentConfig) return;
    pendingConfig.current = currentConfig;
    returnToMenu();
    setShowCountdown(true);
    setIsNewRecord(false);
  }, [currentConfig, returnToMenu]);

  const handleQuitToMenu = useCallback(() => {
    returnToMenu();
    setCurrentConfig(null);
    setShowModeSelect(false);
    setShowCountdown(false);
    setIsNewRecord(false);
    setHighScores(getHighScores());
  }, [returnToMenu]);

  const handleSaveSettings = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
    setShowSettings(false);
  }, []);

  const currentHighScore = currentConfig
    ? (highScores[currentConfig.mode]?.score ?? null)
    : null;

  // ── Cursor overlay canvas + dwell-click system ────────────────────────
  // This canvas sits on top of ALL UI layers with pointer-events: none,
  // so it shows cursors without blocking React button interactions.
  // When a cursor dwells still for DWELL_MS, we fire a synthetic click on
  // whatever DOM element is at that position.

  const overlayRef = useRef<HTMLCanvasElement>(null);
  const dwellMap   = useRef<Map<number, DwellEntry>>(new Map());

  useEffect(() => {
    let raf: number;

    function tick(now: number) {
      const overlay = overlayRef.current;
      if (!overlay) { raf = requestAnimationFrame(tick); return; }

      // Keep canvas sized to window (cheap no-op when already matching)
      if (overlay.width !== window.innerWidth || overlay.height !== window.innerHeight) {
        overlay.width  = window.innerWidth;
        overlay.height = window.innerHeight;
      }

      const ctx = overlay.getContext('2d');
      if (!ctx) { raf = requestAnimationFrame(tick); return; }

      ctx.clearRect(0, 0, overlay.width, overlay.height);

      const cursors = cursorsRef.current ?? [];

      for (const cursor of cursors) {
        if (!cursor.active) {
          dwellMap.current.delete(cursor.playerId);
          continue;
        }

        // Update dwell state for this cursor
        let d = dwellMap.current.get(cursor.playerId);
        if (!d) {
          d = { anchorX: cursor.x, anchorY: cursor.y, startTime: now, fired: false };
          dwellMap.current.set(cursor.playerId, d);
        } else {
          const moved = Math.hypot(cursor.x - d.anchorX, cursor.y - d.anchorY) > DWELL_MOVE_PX;
          if (moved) {
            d.anchorX   = cursor.x;
            d.anchorY   = cursor.y;
            d.startTime = now;
            d.fired     = false;
          } else if (!d.fired) {
            const elapsed = now - d.startTime;
            if (elapsed >= DWELL_MS) {
              d.fired = true;
              fireSyntheticClick(cursor.x, cursor.y, overlay);
            }
          }
        }

        const dwellProgress = d.fired
          ? 0
          : Math.min(1, (now - d.startTime) / DWELL_MS);

        drawCursor(ctx, cursor, now, dwellProgress);
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      width:      '100vw',
      height:     '100vh',
      overflow:   'hidden',
      position:   'relative',
      background: '#0a0a1a',
      fontFamily: "'Arial', 'Helvetica', sans-serif",
    }}>
      {/* Hidden camera feed — MediaPipe reads from this */}
      <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />

      {/* Game canvas — balloons, effects, background */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* ── UI overlays ─────────────────────────────────────────────── */}

      {gamePhase === 'menu' && !showCountdown && !showModeSelect && !showSettings && !showHowToPlay && (
        <Menu
          highScores={highScores}
          settings={settings}
          onPlay={() => setShowModeSelect(true)}
          onSettings={() => setShowSettings(true)}
          onHowToPlay={() => setShowHowToPlay(true)}
        />
      )}

      {showModeSelect && !showSettings && !showHowToPlay && (
        <ModeSelect
          onSelect={handleModeSelect}
          onBack={() => setShowModeSelect(false)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showHowToPlay && (
        <HowToPlay onClose={() => setShowHowToPlay(false)} />
      )}

      {showCountdown && (
        <Countdown
          onComplete={handleCountdownComplete}
          onBeat={() => playSound('countdown')}
        />
      )}

      {gamePhase === 'playing' && currentConfig && (
        <HUD
          scores={scores}
          timeLeft={timeLeft}
          mode={currentConfig.mode}
          playerCount={currentConfig.playerCount}
          powerUps={powerUps}
          comboMultiplier={comboMultiplier}
          onPause={pauseGame}
        />
      )}

      {gamePhase === 'paused' && (
        <PauseScreen
          onResume={resumeGame}
          onQuit={handleQuitToMenu}
        />
      )}

      {gamePhase === 'end' && currentConfig && (
        <EndScreen
          scores={scores}
          mode={currentConfig.mode}
          playerCount={currentConfig.playerCount}
          winner={winner}
          isNewRecord={isNewRecord}
          highScore={currentHighScore}
          onPlayAgain={handlePlayAgain}
          onMenu={handleQuitToMenu}
        />
      )}

      {/* Cursor overlay — always on top, never blocks mouse/touch events */}
      <canvas
        ref={overlayRef}
        style={{
          position:      'absolute',
          inset:         0,
          width:         '100%',
          height:        '100%',
          pointerEvents: 'none',
          zIndex:        999,
        }}
      />
    </div>
  );
}

// ─── Synthetic click helper ────────────────────────────────────────────────

function fireSyntheticClick(x: number, y: number, overlayCanvas: HTMLCanvasElement): void {
  // Find the topmost element at these coordinates, ignoring the overlay canvas itself
  // (temporarily hide it so elementFromPoint sees the elements beneath it)
  overlayCanvas.style.display = 'none';
  const el = document.elementFromPoint(x, y);
  overlayCanvas.style.display = '';

  if (!el || el === overlayCanvas) return;

  // Only fire on interactive elements or their children
  const target = el.closest('button, a, [role="button"], [data-gesture-target]') ?? el;

  target.dispatchEvent(
    new MouseEvent('click', {
      bubbles:    true,
      cancelable: true,
      view:       window,
      clientX:    x,
      clientY:    y,
    }),
  );
}
