'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { playCorrect, playWrong, playStreak } from '@/lib/audio';

interface FeedbackOverlayProps {
  gesture: string;
  isWave: boolean;
}

export default function FeedbackOverlay({ gesture, isWave }: FeedbackOverlayProps) {
  const { questions, currentIndex, isCorrect, selectedOption, streak, multiplier, score, mode, nextQuestion } =
    useGameStore();
  const question = questions[currentIndex];
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  const soundPlayed = useRef(false);
  const advancedRef = useRef(false);

  useEffect(() => {
    if (soundPlayed.current) return;
    soundPlayed.current = true;

    if (isCorrect) {
      playCorrect();
      if (streak >= 3) setTimeout(() => playStreak(multiplier), 400);
      setParticles(
        Array.from({ length: 12 }, (_, i) => ({
          id: i,
          x: 30 + Math.random() * 40,
          y: 30 + Math.random() * 40,
          emoji: ['⭐', '🌟', '✨', '🎉', '🎊'][Math.floor(Math.random() * 5)],
        }))
      );
    } else {
      playWrong();
    }
  }, []);

  const advance = () => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    nextQuestion();
  };

  // Wave or thumbs up to go to next
  useEffect(() => {
    if (isWave || gesture === 'THUMBS_UP' || gesture === 'OPEN_PALM') {
      advance();
    }
  }, [gesture, isWave]);

  // Auto advance after 4 seconds (learning mode: 7s)
  useEffect(() => {
    const delay = mode === 'LEARNING' ? 7000 : 4000;
    const t = setTimeout(advance, delay);
    return () => clearTimeout(t);
  }, [mode]);

  if (!question) return null;

  const correct = question.options[question.correctIndex];
  const chosen = selectedOption !== null ? question.options[selectedOption] : null;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-40 text-white select-none"
      style={{
        background: isCorrect
          ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)'
          : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)',
      }}
    >
      {/* Confetti particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute text-4xl animate-float pointer-events-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${Math.random() * 0.5}s` }}
        >
          {p.emoji}
        </div>
      ))}

      {/* Main feedback */}
      <div className="text-center animate-pop z-10 max-w-3xl px-8">
        <div className="text-9xl mb-6">{isCorrect ? '✅' : '❌'}</div>

        <h2
          className="text-7xl font-black mb-4"
          style={{ color: isCorrect ? '#86efac' : '#fca5a5' }}
        >
          {isCorrect ? 'Correct!' : 'Not quite!'}
        </h2>

        {/* Streak / multiplier */}
        {isCorrect && streak >= 3 && (
          <div className="mb-4 animate-glow">
            <span className="text-3xl font-bold text-yellow-300">
              🔥 {streak} Streak! x{multiplier} Multiplier!
            </span>
          </div>
        )}

        {/* Show correct answer if wrong */}
        {!isCorrect && (
          <p className="text-3xl text-white/80 mb-4">
            The answer was: <span className="font-black text-green-300">{correct}</span>
          </p>
        )}

        {/* Score earned */}
        {isCorrect && (
          <div className="text-4xl font-bold text-yellow-300 mb-6">
            +{multiplier > 1 ? `${10} × ${multiplier}` : '10'} points
            {multiplier > 1 && ` = ${10 * multiplier}`}
          </div>
        )}

        {/* Explanation (always in learning mode, on correct otherwise) */}
        {(mode === 'LEARNING' || isCorrect) && (
          <div className="bg-black/30 rounded-3xl p-6 mt-4 text-2xl text-white/90 leading-relaxed max-w-2xl mx-auto">
            💡 {question.explanation}
          </div>
        )}

        <div className="mt-10 text-2xl text-white/60 animate-pulse">
          👋 Wave to continue...
        </div>
      </div>

      {/* Current score */}
      <div className="absolute top-8 right-8 bg-black/30 rounded-2xl px-6 py-3 text-center">
        <div className="text-4xl font-black text-yellow-300">{score}</div>
        <div className="text-sm text-white/60">Score</div>
      </div>
    </div>
  );
}
