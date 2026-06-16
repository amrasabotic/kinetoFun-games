'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { playStreak } from '@/lib/audio';

interface ResultsScreenProps {
  gesture: string;
  isWave: boolean;
}

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'S', emoji: '🏆', label: 'World Champion!', color: '#facc15' },
  { min: 70, grade: 'A', emoji: '🌟', label: 'Expert Explorer!', color: '#86efac' },
  { min: 50, grade: 'B', emoji: '🗺️', label: 'Seasoned Traveler!', color: '#60a5fa' },
  { min: 30, grade: 'C', emoji: '✈️', label: 'Adventurer!', color: '#a78bfa' },
  { min: 0, grade: 'D', emoji: '🌱', label: 'Budding Explorer!', color: '#fb923c' },
];

export default function ResultsScreen({ gesture, isWave }: ResultsScreenProps) {
  const { score, totalAnswered, totalCorrect, highScores, mode, resetGame } = useGameStore();
  const [showDetails, setShowDetails] = useState(false);
  const soundPlayed = useRef(false);

  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const gradeInfo =
    GRADE_THRESHOLDS.find((g) => accuracy >= g.min) ?? GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];

  const currentHigh = mode ? highScores[mode] ?? 0 : 0;
  const isNewHigh = score >= currentHigh;

  useEffect(() => {
    if (soundPlayed.current) return;
    soundPlayed.current = true;
    setTimeout(() => playStreak(4), 300);
    setTimeout(() => setShowDetails(true), 800);
  }, []);

  useEffect(() => {
    if (isWave || gesture === 'THUMBS_UP') {
      resetGame();
    }
  }, [gesture, isWave, resetGame]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white select-none px-8"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
    >
      {/* Grade */}
      <div className="text-center animate-pop mb-8">
        <div className="text-9xl mb-4 animate-float">{gradeInfo.emoji}</div>
        <h1 className="text-8xl font-black mb-2" style={{ color: gradeInfo.color }}>
          {gradeInfo.label}
        </h1>
        {isNewHigh && (
          <div className="text-4xl font-bold text-yellow-300 animate-glow mt-2">
            🎉 New High Score!
          </div>
        )}
      </div>

      {/* Stats */}
      {showDetails && (
        <div className="animate-slide-up grid grid-cols-3 gap-6 mb-10">
          <div className="text-center bg-white/10 rounded-3xl p-8 border border-white/20">
            <div className="text-6xl font-black text-yellow-300">{score}</div>
            <div className="text-xl text-white/60 mt-2">Total Score</div>
          </div>
          <div className="text-center bg-white/10 rounded-3xl p-8 border border-white/20">
            <div className="text-6xl font-black text-green-300">{totalCorrect}/{totalAnswered}</div>
            <div className="text-xl text-white/60 mt-2">Correct</div>
          </div>
          <div className="text-center bg-white/10 rounded-3xl p-8 border border-white/20">
            <div className="text-6xl font-black" style={{ color: gradeInfo.color }}>
              {accuracy}%
            </div>
            <div className="text-xl text-white/60 mt-2">Accuracy</div>
          </div>
        </div>
      )}

      {/* High scores */}
      {showDetails && (
        <div className="animate-fade-in flex gap-6 mb-10">
          {Object.entries(highScores).map(([m, s]) => (
            <div key={m} className="text-center bg-white/5 rounded-2xl px-6 py-3 border border-white/10">
              <div className="text-3xl font-bold text-yellow-300">{s}</div>
              <div className="text-sm text-white/50">
                {m === 'CLASSIC' ? '🌍 Classic' : m === 'TIME_CHALLENGE' ? '⏱️ Time' : '📚 Learn'} Best
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-3xl font-bold text-white/60 animate-pulse">
        👋 Wave to play again!
      </div>
    </div>
  );
}
