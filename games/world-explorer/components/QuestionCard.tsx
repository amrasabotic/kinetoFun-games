'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { DwellTracker } from '@/lib/gestures';
import { playHover, playSelect } from '@/lib/audio';

interface QuestionCardProps {
  cursorX: number;
  cursorY: number;
  gesture: string;
}

const OPTION_COLORS = [
  { bg: 'from-purple-700 to-purple-900', border: 'border-purple-400', hover: 'border-purple-300 scale-105 shadow-purple-500/40' },
  { bg: 'from-blue-700 to-blue-900', border: 'border-blue-400', hover: 'border-blue-300 scale-105 shadow-blue-500/40' },
  { bg: 'from-teal-700 to-teal-900', border: 'border-teal-400', hover: 'border-teal-300 scale-105 shadow-teal-500/40' },
  { bg: 'from-indigo-700 to-indigo-900', border: 'border-indigo-400', hover: 'border-indigo-300 scale-105 shadow-indigo-500/40' },
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuestionCard({ cursorX, cursorY, gesture }: QuestionCardProps) {
  const { questions, currentIndex, selectOption, mode, timeLeft, maxTime } = useGameStore();
  const question = questions[currentIndex];
  const dwellRef = useRef(new DwellTracker(1400));
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dwellTarget, setDwellTarget] = useState<number | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [prevHover, setPrevHover] = useState<number | null>(null);
  const selectedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    selectedRef.current = false;
    dwellRef.current.reset();
    setDwellTarget(null);
    setDwellProgress(0);
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, [currentIndex]);

  useEffect(() => {
    if (selectedRef.current) return;
    const screenX = cursorX * window.innerWidth;
    const screenY = cursorY * window.innerHeight;

    let hoveredIdx: string | null = null;
    optionRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) {
        hoveredIdx = String(i);
      }
    });

    const { completed, progress, targetId } = dwellRef.current.update(hoveredIdx);
    const numTarget = targetId !== null ? parseInt(targetId) : null;

    if (numTarget !== prevHover) {
      if (numTarget !== null) playHover();
      setPrevHover(numTarget);
    }

    setDwellTarget(numTarget);
    setDwellProgress(progress);

    if (completed && targetId !== null && !selectedRef.current) {
      selectedRef.current = true;
      playSelect();
      selectOption(parseInt(targetId));
    }
  }, [cursorX, cursorY, selectOption, prevHover]);

  // Pinch to instantly select hovered option
  useEffect(() => {
    if (gesture === 'PINCH' && dwellTarget !== null && !selectedRef.current) {
      selectedRef.current = true;
      playSelect();
      selectOption(dwellTarget);
    }
  }, [gesture, dwellTarget, selectOption]);

  if (!question) return null;

  const timerPct = timeLeft / maxTime;

  return (
    <div className="min-h-screen flex flex-col text-white select-none px-8 py-6"
      style={{ background: `linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)` }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{question.flag}</span>
          <span className="text-2xl font-bold text-white/80">{question.destination}</span>
        </div>
        {mode === 'TIME_CHALLENGE' && (
          <div className="flex items-center gap-3">
            <div className="text-2xl font-mono font-bold text-yellow-300">
              {(timeLeft / 1000).toFixed(1)}s
            </div>
            <div className="w-40 h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{
                  width: `${timerPct * 100}%`,
                  background: timerPct > 0.5 ? '#4ade80' : timerPct > 0.25 ? '#facc15' : '#ef4444',
                }}
              />
            </div>
          </div>
        )}
        <div className="text-lg text-white/50">
          {question.category === 'CAPITAL' && '🏛️ Capital'}
          {question.category === 'LANDMARK' && '🗺️ Landmark'}
          {question.category === 'ANIMAL' && '🐾 Animal'}
          {question.category === 'FOOD' && '🍽️ Food'}
          {question.category === 'FLAG' && '🚩 Flag'}
        </div>
      </div>

      {/* Question */}
      <div className={`text-center mb-10 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <h2 className="text-5xl font-black leading-tight max-w-4xl mx-auto drop-shadow-lg">
          {question.question}
        </h2>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
        {question.options.map((option, i) => {
          const color = OPTION_COLORS[i];
          const isHovered = dwellTarget === i;
          const progress = isHovered ? dwellProgress : 0;

          return (
            <div
              key={i}
              ref={(el) => { optionRefs.current[i] = el; }}
              className={`relative rounded-3xl bg-gradient-to-br ${color.bg} border-2 p-6 transition-all duration-150 shadow-xl cursor-none
                ${isHovered ? `${color.hover} shadow-2xl` : color.border}`}
            >
              {/* Dwell arc */}
              {isHovered && progress > 0 && (
                <svg className="absolute top-3 right-3 w-12 h-12" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <circle
                    cx="24" cy="24" r="18"
                    fill="none" stroke="#facc15" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 18}`}
                    strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress)}`}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                </svg>
              )}

              <div className="flex items-center gap-5">
                <span
                  className="text-4xl font-black rounded-2xl w-14 h-14 flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                >
                  {OPTION_LABELS[i]}
                </span>
                <span className="text-3xl font-bold leading-tight">{option}</span>
              </div>

              {isHovered && (
                <div className="absolute bottom-3 left-6 text-yellow-300 text-sm font-bold animate-pulse">
                  ☝️ Hold... {Math.round(progress * 100)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <div className="text-center mt-8 text-white/40 text-xl">
        ☝️ Point and hold to answer · 🤏 Pinch to select instantly
      </div>
    </div>
  );
}
