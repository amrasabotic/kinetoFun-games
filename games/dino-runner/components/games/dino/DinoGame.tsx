'use client';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import DinoCanvas, { type DinoCanvasRef } from './DinoCanvas';
import GameHUD from './GameHUD';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useGestures } from '@/hooks/useGestures';
import { createInitialState, startGame, updateGame } from '@/game/dino/engine';
import { getHighScore, saveHighScore } from '@/utils/dino/storage';
import {
  playJumpSound,
  playDuckSound,
  playGameOverSound,
  playMilestoneSound,
} from '@/utils/dino/sound';
import type { GamePhase, GameState, GestureState } from '@/game/dino/types';

export default function DinoGame() {
  // ── React-visible state (minimal — only drives UI re-renders) ────────────
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [displayScore, setDisplayScore] = useState(0);
  const [displayHighScore, setDisplayHighScore] = useState(0);

  // ── Stable refs (mutations don't trigger renders) ────────────────────────
  const gameStateRef = useRef<GameState>(createInitialState(0));
  const canvasRef = useRef<DinoCanvasRef>(null);
  const gestureRef = useRef<GestureState>('none');
  const prevGestureRef = useRef<GestureState>('none');
  const prevPhaseRef = useRef<GamePhase>('idle');
  const prevMilestoneRef = useRef(0);
  // Tracks the previous gesture specifically for UI edge detection (start/restart)
  const prevGestureForUIRef = useRef<GestureState>('none');

  // ── Gesture hook ─────────────────────────────────────────────────────────
  const { gestureState, rawGestureName, confidence, videoRef, isReady, error } =
    useGestures(true);

  // Keep gesture ref current every render so the loop reads the latest value
  gestureRef.current = gestureState;

  // ── Bootstrap high score ─────────────────────────────────────────────────
  useEffect(() => {
    const hs = getHighScore();
    setDisplayHighScore(hs);
    gameStateRef.current = createInitialState(hs);
    canvasRef.current?.draw(); // initial idle frame
  }, []);

  // Redraw when phase changes to idle/gameover (no loop running)
  useEffect(() => {
    if (phase !== 'running') canvasRef.current?.draw();
  }, [phase]);

  // ── Game actions ─────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    const hs = getHighScore();
    gameStateRef.current = startGame(hs);
    prevPhaseRef.current = 'running';
    prevGestureRef.current = 'none';
    prevMilestoneRef.current = 0;
    setDisplayScore(0);
    setPhase('running');
  }, []);

  const handleRestart = useCallback(() => {
    const hs = getHighScore();
    gameStateRef.current = startGame(hs);
    prevPhaseRef.current = 'running';
    prevGestureRef.current = 'none';
    prevMilestoneRef.current = 0;
    setDisplayScore(0);
    setDisplayHighScore(hs);
    setPhase('running');
  }, []);

  // ── Gesture-driven UI triggers (start / restart on open-palm rising edge) ─
  useEffect(() => {
    const prev = prevGestureForUIRef.current;
    prevGestureForUIRef.current = gestureState;

    // Only fire on the rising edge (gesture just became 'jump')
    if (gestureState !== 'jump' || prev === 'jump') return;

    if (phase === 'idle' && isReady) handleStart();
    else if (phase === 'gameover') handleRestart();
  }, [gestureState, phase, isReady, handleStart, handleRestart]);

  // ── Game loop (runs at ~60 fps while phase === 'running') ─────────────────
  const gameLoop = useCallback(() => {
    const state = gameStateRef.current;
    const gesture = gestureRef.current;
    const prev = prevGestureRef.current;

    // Sound on gesture transitions
    if (gesture !== prev) {
      if (gesture === 'jump' && state.player.onGround && state.phase === 'running') {
        playJumpSound();
      }
      if (gesture === 'duck' && prev !== 'duck' && state.phase === 'running') {
        playDuckSound();
      }
      prevGestureRef.current = gesture;
    }

    // Advance physics
    updateGame(state, gesture);

    // ── Game over transition ─────────────────────────────────────────────
    if (state.phase === 'gameover' && prevPhaseRef.current === 'running') {
      prevPhaseRef.current = 'gameover';
      const finalHigh = Math.floor(state.highScore);
      saveHighScore(finalHigh);
      setDisplayScore(Math.floor(state.score));
      setDisplayHighScore(finalHigh);
      playGameOverSound();
      setPhase('gameover'); // triggers React re-render → loop stops
    }

    // ── Milestone sound ──────────────────────────────────────────────────
    const milestone = Math.floor(state.score / 100);
    if (milestone > prevMilestoneRef.current) {
      prevMilestoneRef.current = milestone;
      playMilestoneSound();
    }

    // ── Score display (throttled to 1× / 6 frames) ───────────────────────
    if (state.frameCount % 6 === 0) {
      setDisplayScore(Math.floor(state.score));
    }

    // ── Render canvas ────────────────────────────────────────────────────
    canvasRef.current?.draw();
  }, []); // No deps — reads everything from refs

  useGameLoop(gameLoop, phase === 'running');

  return (
    <div className="relative w-full" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Game canvas */}
      <DinoCanvas ref={canvasRef} gameStateRef={gameStateRef} />

      {/* Overlays (start / gameover / gesture badge) */}
      <GameHUD
        phase={phase}
        score={displayScore}
        highScore={displayHighScore}
        gestureState={gestureState}
        rawGestureName={rawGestureName}
        confidence={confidence}
        isGestureReady={isReady}
        gestureError={error}
        onStart={handleStart}
        onRestart={handleRestart}
      />

      {/* Camera preview — top right, non-intrusive */}
      <div
        className="absolute top-2 right-2 overflow-hidden"
        style={{
          width: 128,
          height: 96,
          borderRadius: 10,
          border: '2px solid rgba(255,255,255,0.35)',
          opacity: 0.82,
          background: '#111',
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-white text-xs">📷</span>
          </div>
        )}
      </div>
    </div>
  );
}
