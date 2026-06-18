'use client';
import React from 'react';
import type { GamePhase, GestureState } from '@/game/dino/types';

interface Props {
  phase: GamePhase;
  score: number;
  highScore: number;
  gestureState: GestureState;
  rawGestureName: string;
  confidence: number;
  isGestureReady: boolean;
  gestureError: string | null;
  onStart: () => void;
  onRestart: () => void;
}

export default function GameHUD({
  phase,
  score,
  highScore,
  gestureState,
  rawGestureName,
  confidence,
  isGestureReady,
  gestureError,
  onStart,
  onRestart,
}: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* ── Gesture indicator (in-game only) ── */}
      {phase === 'running' && (
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <GestureChip state={gestureState} />
        </div>
      )}

      {/* ── Camera loading indicator ── */}
      {!isGestureReady && phase === 'running' && !gestureError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <p className="text-xs text-gray-400 animate-pulse">Loading camera…</p>
        </div>
      )}

      {/* ── Start screen ── */}
      {phase === 'idle' && (
        <StartScreen
          isReady={isGestureReady}
          error={gestureError}
          onStart={onStart}
        />
      )}

      {/* ── Game over screen ── */}
      {phase === 'gameover' && (
        <GameOverScreen
          score={score}
          highScore={highScore}
          onRestart={onRestart}
        />
      )}
    </div>
  );
}

// ─── Gesture chip ─────────────────────────────────────────────────────────────

const CHIP_LABEL: Record<GestureState, string> = {
  jump: '✋ JUMP',
  duck: '✊ DUCK',
  none: '— —',
};
const CHIP_COLOR: Record<GestureState, string> = {
  jump: 'bg-green-500/80 text-white',
  duck: 'bg-yellow-500/80 text-black',
  none: 'bg-white/10 text-gray-400',
};

function GestureChip({ state }: { state: GestureState }) {
  return (
    <span
      className={`text-xs font-bold px-2 py-1 rounded-full transition-all duration-100 ${CHIP_COLOR[state]}`}
    >
      {CHIP_LABEL[state]}
    </span>
  );
}

// ─── Start screen ─────────────────────────────────────────────────────────────

function StartScreen({
  isReady,
  error,
  onStart,
}: {
  isReady: boolean;
  error: string | null;
  onStart: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 pointer-events-auto">
      {/* Title */}
      <h1
        className="font-black tracking-widest text-gray-800 mb-1"
        style={{ fontSize: 'clamp(1.6rem, 5vw, 3rem)', fontFamily: '"Courier New", monospace' }}
      >
        DINO RUNNER
      </h1>
      <p className="text-xs text-gray-500 mb-6 tracking-widest">GESTURE EDITION</p>

      {/* Gesture guide */}
      <div className="flex gap-6 mb-8">
        <GestureCard emoji="✋" label="Open Palm" action="JUMP" color="bg-green-100 border-green-300" />
        <GestureCard emoji="✊" label="Closed Fist" action="DUCK" color="bg-yellow-100 border-yellow-300" />
      </div>

      {/* Start trigger */}
      {error ? (
        <p className="text-sm text-red-500 max-w-xs text-center">{error}</p>
      ) : isReady ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-bold tracking-widest text-gray-700 animate-pulse" style={{ fontFamily: '"Courier New", monospace' }}>
            ✋ OPEN PALM TO START
          </p>
          <button
            disabled
            style={{ pointerEvents: 'none', fontFamily: '"Courier New", monospace' }}
            className="px-8 py-3 bg-gray-300 text-gray-500 font-bold tracking-widest text-sm rounded-none border-2 border-gray-300 cursor-default"
          >
            START
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-400 animate-pulse" style={{ fontFamily: '"Courier New", monospace' }}>
          Initializing camera…
        </p>
      )}
    </div>
  );
}

function GestureCard({
  emoji,
  label,
  action,
  color,
}: {
  emoji: string;
  label: string;
  action: string;
  color: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 px-4 py-3 border rounded-lg ${color}`}>
      <span className="text-3xl">{emoji}</span>
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-xs font-black text-gray-800 tracking-widest">{action}</span>
    </div>
  );
}

// ─── Game over screen ─────────────────────────────────────────────────────────

function GameOverScreen({
  score,
  highScore,
  onRestart,
}: {
  score: number;
  highScore: number;
  onRestart: () => void;
}) {
  const isNewBest = score > 0 && score >= highScore;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 pointer-events-auto">
      <p
        className="font-black tracking-widest text-gray-800 mb-4"
        style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontFamily: '"Courier New", monospace' }}
      >
        GAME OVER
      </p>

      <div className="flex gap-8 mb-6" style={{ fontFamily: '"Courier New", monospace' }}>
        <ScoreBadge label="SCORE" value={score} />
        <ScoreBadge label={isNewBest ? '🏆 BEST' : 'BEST'} value={highScore} highlight={isNewBest} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-bold tracking-widest text-gray-700 animate-pulse" style={{ fontFamily: '"Courier New", monospace' }}>
          ✋ OPEN PALM TO RESTART
        </p>
        <button
          disabled
          style={{ pointerEvents: 'none', fontFamily: '"Courier New", monospace' }}
          className="px-8 py-3 bg-gray-300 text-gray-500 font-bold tracking-widest text-sm rounded-none border-2 border-gray-300 cursor-default"
        >
          RESTART
        </button>
      </div>
    </div>
  );
}

function ScoreBadge({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-gray-500 tracking-widest mb-1">{label}</span>
      <span
        className={`text-2xl font-black tracking-wider ${highlight ? 'text-yellow-600' : 'text-gray-800'}`}
        style={{ fontFamily: '"Courier New", monospace' }}
      >
        {String(value).padStart(5, '0')}
      </span>
    </div>
  );
}
