'use client';

import { useEffect, useRef } from 'react';

interface GestureCursorProps {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  gesture: string;
  pinchStrength: number;
  dwellProgress: number; // 0-1
  visible: boolean;
}

export default function GestureCursor({
  x,
  y,
  gesture,
  pinchStrength,
  dwellProgress,
  visible,
}: GestureCursorProps) {
  const posRef = useRef({ x, y });
  const smoothRef = useRef({ x, y });
  const rafRef = useRef<number>(0);
  const elRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    posRef.current = { x, y };
  }, [x, y]);

  useEffect(() => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const animate = () => {
      smoothRef.current.x = lerp(smoothRef.current.x, posRef.current.x, 0.2);
      smoothRef.current.y = lerp(smoothRef.current.y, posRef.current.y, 0.2);

      if (elRef.current) {
        elRef.current.style.left = `${smoothRef.current.x * 100}%`;
        elRef.current.style.top = `${smoothRef.current.y * 100}%`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (!ringRef.current) return;
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - dwellProgress);
    ringRef.current.style.strokeDasharray = `${circumference}`;
    ringRef.current.style.strokeDashoffset = `${offset}`;
  }, [dwellProgress]);

  if (!visible) return null;

  const isPinching = pinchStrength > 0.7;
  const isPointing = gesture === 'POINTING';
  const isDwelling = dwellProgress > 0;

  return (
    <div
      ref={elRef}
      className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      {/* Dwell ring */}
      {isDwelling && (
        <svg className="absolute -top-8 -left-8 w-16 h-16" viewBox="0 0 60 60">
          <circle
            cx="30"
            cy="30"
            r="22"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="4"
          />
          <circle
            ref={ringRef}
            cx="30"
            cy="30"
            r="22"
            fill="none"
            stroke="#facc15"
            strokeWidth="4"
            strokeLinecap="round"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: 'stroke-dashoffset 0.05s linear',
            }}
          />
        </svg>
      )}

      {/* Cursor dot */}
      <div
        className="relative flex items-center justify-center transition-all duration-75"
        style={{
          width: isPinching ? 20 : 32,
          height: isPinching ? 20 : 32,
        }}
      >
        <div
          className="rounded-full border-2 transition-all duration-75"
          style={{
            width: isPinching ? 14 : 28,
            height: isPinching ? 14 : 28,
            background: isPinching
              ? 'rgba(250, 204, 21, 0.9)'
              : isPointing
              ? 'rgba(99, 202, 255, 0.7)'
              : 'rgba(255, 255, 255, 0.6)',
            borderColor: isPinching ? '#facc15' : 'rgba(255,255,255,0.8)',
            boxShadow: isPinching
              ? '0 0 20px rgba(250,204,21,0.8)'
              : '0 0 12px rgba(255,255,255,0.4)',
          }}
        />
      </div>

      {/* Gesture label */}
      {gesture !== 'NONE' && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-white/70 whitespace-nowrap">
          {gesture === 'POINTING' && '☝️'}
          {gesture === 'PINCH' && '🤏'}
          {gesture === 'OPEN_PALM' && '✋'}
          {gesture === 'THUMBS_UP' && '👍'}
          {gesture === 'PEACE' && '✌️'}
          {gesture === 'THREE_FINGERS' && '🤟'}
        </div>
      )}
    </div>
  );
}
