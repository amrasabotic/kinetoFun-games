'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

interface MainMenuProps {
  gestureHint: string;
  onWaveDetected: () => void;
}

const GLOBE_EMOJIS = ['🌍', '🌎', '🌏'];

export default function MainMenu({ gestureHint, onWaveDetected }: MainMenuProps) {
  const { highScores, showModeSelect } = useGameStore();
  const [globeIdx, setGlobeIdx] = useState(0);
  const [wavePrompt, setWavePrompt] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setGlobeIdx((i) => (i + 1) % 3), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setWavePrompt(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white select-none">
      {/* Title */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="text-9xl mb-6 animate-float">{GLOBE_EMOJIS[globeIdx]}</div>
        <h1 className="text-7xl font-black tracking-tight mb-3 bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
          World Explorer
        </h1>
        <p className="text-2xl text-blue-200 font-semibold">
          Travel the world · Learn as you go
        </p>
      </div>

      {/* Wave to start */}
      {wavePrompt && (
        <div className="animate-pop flex flex-col items-center gap-6 mb-12">
          <div className="text-8xl animate-bounce-gentle">👋</div>
          <div className="text-center">
            <p className="text-4xl font-bold text-yellow-300 mb-2">Wave to Start!</p>
            <p className="text-xl text-white/70">Show your hand to the camera and wave</p>
          </div>
        </div>
      )}

      {/* High scores */}
      <div className="flex gap-8 mb-10">
        {Object.entries(highScores).map(([mode, score]) => (
          <div
            key={mode}
            className="text-center bg-white/10 rounded-2xl px-6 py-3 border border-white/20"
          >
            <div className="text-3xl font-black text-yellow-300">{score}</div>
            <div className="text-sm text-white/60">
              {mode === 'CLASSIC' ? '🌍 Classic' : mode === 'TIME_CHALLENGE' ? '⏱️ Time' : '📚 Learn'}
            </div>
          </div>
        ))}
      </div>

      {/* Gesture indicator */}
      <div className="text-center text-white/50 text-lg">
        {gestureHint ? (
          <span className="text-yellow-300 font-semibold animate-pulse">{gestureHint}</span>
        ) : (
          '🎥 Camera ready — show your hand!'
        )}
      </div>
    </div>
  );
}
