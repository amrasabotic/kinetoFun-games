'use client';
import { useEffect, useRef, useCallback } from 'react';
import { GameContext, useGameReducer } from '@/hooks/useGameState';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { handTracker } from '@/mediapipe/HandTracker';
import { tick } from './GameLoop';
import type { GameState, HandData, MinigameId } from '@/types';
import type { Dispatch } from 'react';
import type { GameAction } from '@/types';

export function GameRoot() {
  const [state, dispatch] = useGameReducer();
  const { sequence: dailySeq } = useDailyChallenge();

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      <GameCanvas state={state} dispatch={dispatch} dailySeq={dailySeq} />
    </GameContext.Provider>
  );
}

/* ── Canvas component ──────────────────────────────────────── */
interface CanvasProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  dailySeq: MinigameId[];
}

function GameCanvas({ state, dispatch, dailySeq }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const dailySeqRef = useRef(dailySeq);
  const rafRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const handsRef = useRef<HandData[]>([]);
  const mountedRef = useRef(true);

  /* Keep refs in sync without re-subscribing RAF */
  stateRef.current = state;
  dailySeqRef.current = dailySeq;

  /* RAF loop */
  const loop = useCallback((now: number) => {
    if (!mountedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }

    const ctx = canvas.getContext('2d');
    if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

    const dt = Math.min((now - (lastTRef.current || now)) / 1000, 0.05);
    lastTRef.current = now;

    const W = canvas.width;
    const H = canvas.height;

    tick(ctx, W, H, dt, stateRef.current, handsRef.current, dispatch, dailySeqRef.current);

    rafRef.current = requestAnimationFrame(loop);
  }, [dispatch]);

  /* Canvas resize */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const obs = new ResizeObserver(resize);
    obs.observe(document.documentElement);
    window.addEventListener('resize', resize);
    return () => { obs.disconnect(); window.removeEventListener('resize', resize); };
  }, []);

  /* HandTracker init */
  useEffect(() => {
    let started = false;

    const unsub = handTracker.onUpdate((newHands) => {
      handsRef.current = [...newHands];
    });

    handTracker.start().then((ok) => {
      if (!mountedRef.current) return;
      started = true;
      if (ok) dispatch({ type: 'MP_READY' });
      else {
        /* Camera/MediaPipe not available — still allow play (will show placeholder) */
        dispatch({ type: 'MP_READY' });
      }
    });

    return () => {
      unsub();
      if (started) handTracker.stop();
    };
  }, [dispatch]);

  /* RAF start */
  useEffect(() => {
    mountedRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [loop]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#1a1208',
        touchAction: 'none',
        userSelect: 'none',
      }}
    />
  );
}
