'use client';

import { useRef, useEffect, useState } from 'react';
import { useGameStore, GameMode } from '@/store/gameStore';
import { DwellTracker } from '@/lib/gestures';
import { playSelect } from '@/lib/audio';

const MODES = [
  {
    id: 'CLASSIC' as GameMode,
    emoji: '🌍',
    title: 'Classic Explorer',
    desc: 'Answer questions about the world',
    color: 'from-blue-600 to-blue-800',
    border: 'border-blue-400',
  },
  {
    id: 'TIME_CHALLENGE' as GameMode,
    emoji: '⏱️',
    title: 'Time Challenge',
    desc: '60 seconds — answer fast for bonus!',
    color: 'from-orange-600 to-red-800',
    border: 'border-orange-400',
  },
  {
    id: 'LEARNING' as GameMode,
    emoji: '📚',
    title: 'Learning Mode',
    desc: 'No timer · Read explanations',
    color: 'from-green-600 to-emerald-800',
    border: 'border-green-400',
  },
];

interface ModeSelectProps {
  cursorX: number;
  cursorY: number;
  gesture: string;
}

export default function ModeSelect({ cursorX, cursorY, gesture }: ModeSelectProps) {
  const { startMode } = useGameStore();
  const dwellRef = useRef(new DwellTracker(1400));
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dwellTarget, setDwellTarget] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const selectedRef = useRef(false);

  useEffect(() => {
    if (selectedRef.current) return;

    const screenX = cursorX * window.innerWidth;
    const screenY = cursorY * window.innerHeight;

    let hoveredId: string | null = null;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) {
        hoveredId = MODES[i].id;
      }
    });

    const { completed, progress, targetId } = dwellRef.current.update(hoveredId);
    setDwellTarget(targetId);
    setDwellProgress(progress);

    if (completed && targetId && !selectedRef.current) {
      selectedRef.current = true;
      playSelect();
      startMode(targetId as GameMode);
    }
  }, [cursorX, cursorY, gesture, startMode]);

  // Pinch to select
  useEffect(() => {
    if (gesture === 'PINCH' && dwellTarget && !selectedRef.current) {
      selectedRef.current = true;
      playSelect();
      startMode(dwellTarget as GameMode);
    }
  }, [gesture, dwellTarget, startMode]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white px-8 select-none">
      <h2 className="text-5xl font-black mb-4 animate-fade-in">Choose Your Mode</h2>
      <p className="text-xl text-white/60 mb-12">☝️ Point at a mode to select</p>

      <div className="flex gap-8 flex-wrap justify-center">
        {MODES.map((mode, i) => {
          const isHovered = dwellTarget === mode.id;
          const progress = isHovered ? dwellProgress : 0;
          return (
            <div
              key={mode.id}
              ref={(el) => { cardRefs.current[i] = el; }}
              className={`relative w-72 p-8 rounded-3xl bg-gradient-to-br ${mode.color} border-2 transition-all duration-150 cursor-none
                ${isHovered ? `${mode.border} scale-105 shadow-2xl` : 'border-white/20'}`}
            >
              {/* Dwell progress arc */}
              {isHovered && progress > 0 && (
                <svg className="absolute top-3 right-3 w-10 h-10" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                  <circle
                    cx="20" cy="20" r="16"
                    fill="none" stroke="#facc15" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress)}`}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                </svg>
              )}
              <div className="text-6xl mb-4">{mode.emoji}</div>
              <h3 className="text-3xl font-bold mb-2">{mode.title}</h3>
              <p className="text-white/70 text-lg">{mode.desc}</p>
              {isHovered && (
                <div className="mt-4 text-yellow-300 font-bold text-lg animate-pulse">
                  Hold to select... {Math.round(progress * 100)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-12 text-white/40 text-lg">Or 🤏 Pinch when hovering</p>
    </div>
  );
}
