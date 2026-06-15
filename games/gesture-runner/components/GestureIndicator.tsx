'use client';

interface GestureIndicatorProps {
  jump: boolean;
  slide: boolean;
  leanLeft: boolean;
  leanRight: boolean;
  className?: string;
}

function GestureIcon({
  label,
  icon,
  active,
  color,
}: {
  label: string;
  icon: string;
  active: boolean;
  color: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 transition-all duration-100"
      style={{
        opacity: active ? 1 : 0.35,
        transform: active ? 'scale(1.15)' : 'scale(1)',
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2"
        style={{
          borderColor: active ? color : 'rgba(255,255,255,0.15)',
          backgroundColor: active ? `${color}22` : 'rgba(0,0,0,0.4)',
          boxShadow: active ? `0 0 12px ${color}80` : 'none',
        }}
      >
        {icon}
      </div>
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function GestureIndicator({ jump, slide, leanLeft, leanRight, className = '' }: GestureIndicatorProps) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <GestureIcon label="Left" icon="←" active={leanLeft} color="#4dc8ff" />
      <GestureIcon label="Jump" icon="↑" active={jump} color="#00ff88" />
      <GestureIcon label="Slide" icon="↓" active={slide} color="#ffe04d" />
      <GestureIcon label="Right" icon="→" active={leanRight} color="#4dc8ff" />
    </div>
  );
}
