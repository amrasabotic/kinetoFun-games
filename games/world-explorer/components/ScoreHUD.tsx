'use client';

import { useGameStore } from '@/store/gameStore';

export default function ScoreHUD() {
  const { score, streak, multiplier, currentIndex, questions, mode } = useGameStore();

  if (!questions.length) return null;

  return (
    <div className="fixed top-4 left-4 flex items-center gap-4 z-30">
      {/* Score */}
      <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
        <div className="text-2xl font-black text-yellow-300">{score}</div>
        <div className="text-xs text-white/50">Score</div>
      </div>

      {/* Streak */}
      {streak >= 2 && (
        <div className="bg-orange-500/80 backdrop-blur-sm rounded-2xl px-5 py-3 border border-orange-300/40 animate-glow">
          <div className="text-2xl font-black text-white">🔥 {streak}</div>
          <div className="text-xs text-orange-200">x{multiplier} Streak</div>
        </div>
      )}

      {/* Progress */}
      <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
        <div className="text-2xl font-black text-white">
          {currentIndex + 1}<span className="text-white/40">/{questions.length}</span>
        </div>
        <div className="text-xs text-white/50">Questions</div>
      </div>

      {/* Mode badge */}
      <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10">
        <div className="text-sm font-bold text-white/70">
          {mode === 'CLASSIC' && '🌍 Classic'}
          {mode === 'TIME_CHALLENGE' && '⏱️ Time'}
          {mode === 'LEARNING' && '📚 Learn'}
        </div>
      </div>
    </div>
  );
}
