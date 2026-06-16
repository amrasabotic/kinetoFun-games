'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { playArrival } from '@/lib/audio';

interface DestinationCardProps {
  gesture: string;
  isWave: boolean;
}

export default function DestinationCard({ gesture, isWave }: DestinationCardProps) {
  const { questions, currentIndex, mode } = useGameStore();
  const question = questions[currentIndex];
  const [ready, setReady] = useState(false);
  const [advanceTriggered, setAdvanceTriggered] = useState(false);

  useEffect(() => {
    playArrival();
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  const advance = () => {
    if (advanceTriggered) return;
    setAdvanceTriggered(true);
    useGameStore.setState({ screen: 'QUESTION' });
  };

  // Auto advance after 3 seconds
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(advance, 3000);
    return () => clearTimeout(t);
  }, [ready]);

  // Wave or thumbs up to advance early
  useEffect(() => {
    if (ready && (isWave || gesture === 'THUMBS_UP' || gesture === 'OPEN_PALM')) {
      advance();
    }
  }, [gesture, isWave, ready]);

  if (!question) return null;

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-white select-none relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${question.bgFrom} 0%, ${question.bgTo} 100%)`,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at center, ${question.bgTo} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 text-center animate-pop">
        <p className="text-2xl font-semibold text-white/70 mb-4 tracking-widest uppercase">
          ✈️ Now Arriving In
        </p>

        <div className="text-[10rem] leading-none mb-6 animate-bounce-gentle drop-shadow-2xl">
          {question.flag}
        </div>

        <h2 className="text-8xl font-black mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          {question.destination}
        </h2>

        {question.emoji && (
          <div className="text-6xl mb-6">{question.emoji}</div>
        )}

        <p className="text-2xl text-white/70 italic mb-8">
          {question.category === 'CAPITAL' && '🏛️ Capital Challenge'}
          {question.category === 'LANDMARK' && '🗺️ Landmark Discovery'}
          {question.category === 'ANIMAL' && '🐾 Wildlife Encounter'}
          {question.category === 'FOOD' && '🍽️ Culinary Quest'}
          {question.category === 'FLAG' && '🚩 Flag Knowledge'}
        </p>

        {ready && (
          <div className="animate-fade-in">
            <p className="text-3xl font-bold text-yellow-300 animate-pulse">
              👋 Wave or ✋ Open palm to continue...
            </p>
            <div className="mt-4 text-lg text-white/50">
              (Auto-continues in a moment)
            </div>
          </div>
        )}
      </div>

      {/* Category badge */}
      <div className="absolute top-8 right-8 bg-black/30 rounded-2xl px-6 py-3 text-xl font-bold">
        Question {currentIndex + 1} / {questions.length}
      </div>
    </div>
  );
}
