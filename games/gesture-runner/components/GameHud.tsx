'use client';

import type { GameState } from '../types/game';

interface GameHudProps {
  score: number;
  coins: number;
  distance: number;
  speed: number;
  activePowerUps: GameState['activePowerUps'];
  gestureActive: {
    jump: boolean;
    slide: boolean;
    leanLeft: boolean;
    leanRight: boolean;
  };
}

interface PowerUpBarProps {
  label: string;
  timeLeft: number;
  maxTime: number;
  color: string;
  icon: string;
}

function PowerUpBar({ label, timeLeft, maxTime, color, icon }: PowerUpBarProps) {
  if (timeLeft <= 0) return null;
  const pct = (timeLeft / maxTime) * 100;
  return (
    <div className="flex items-center gap-2 bg-black/60 rounded-lg px-3 py-2 min-w-[140px]">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <div className="flex justify-between text-xs text-gray-300 mb-1">
          <span className="font-bold" style={{ color }}>{label}</span>
          <span>{timeLeft.toFixed(1)}s</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

function GestIcon({ active, label, symbol, color }: { active: boolean; label: string; symbol: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 transition-all duration-75"
      style={{ opacity: active ? 1 : 0.3 }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold border"
        style={{
          borderColor: active ? color : 'rgba(255,255,255,0.1)',
          backgroundColor: active ? `${color}25` : 'rgba(0,0,0,0.3)',
          color: active ? color : 'rgba(255,255,255,0.3)',
          boxShadow: active ? `0 0 8px ${color}60` : 'none',
        }}
      >
        {symbol}
      </div>
      <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export function GameHud({
  score,
  coins,
  distance,
  speed,
  activePowerUps,
  gestureActive,
}: GameHudProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Top center: Score */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center pt-4">
        <div
          className="text-5xl font-bold text-white"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)', fontVariantNumeric: 'tabular-nums' }}
        >
          {score.toLocaleString()}
        </div>
        <div className="text-lg text-gray-400 font-mono">{distance}m</div>
      </div>

      {/* Top left: Coins */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 rounded-xl px-4 py-2">
        <span className="text-2xl">$</span>
        <span className="text-2xl font-bold text-[#ffe04d]">{coins}</span>
      </div>

      {/* Top left: Speed (below coins) */}
      <div className="absolute top-16 left-4 flex items-center gap-2 bg-black/50 rounded-lg px-3 py-1.5">
        <span className="text-gray-400 text-sm">SPD</span>
        <span className="text-[#4dc8ff] font-bold text-sm">{Math.round(speed)}</span>
      </div>

      {/* Top right: Active power-ups */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <PowerUpBar
          label="MAGNET"
          timeLeft={activePowerUps.magnet}
          maxTime={10}
          color="#ff4444"
          icon="M"
        />
        {activePowerUps.shield && (
          <div className="flex items-center gap-2 bg-black/60 rounded-lg px-3 py-2">
            <span className="text-lg">S</span>
            <span className="text-[#00ccff] font-bold text-sm">SHIELD</span>
          </div>
        )}
        <PowerUpBar
          label="SPEED"
          timeLeft={activePowerUps.speed}
          maxTime={5}
          color="#00ff88"
          icon="V"
        />
        <PowerUpBar
          label="2x COINS"
          timeLeft={activePowerUps.doubleCoins}
          maxTime={15}
          color="#ffe04d"
          icon="X"
        />
      </div>

      {/* Bottom center: Gesture indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <GestIcon active={gestureActive.leanLeft} label="Left" symbol="←" color="#4dc8ff" />
        <GestIcon active={gestureActive.jump} label="Jump" symbol="↑" color="#00ff88" />
        <GestIcon active={gestureActive.slide} label="Slide" symbol="↓" color="#ffe04d" />
        <GestIcon active={gestureActive.leanRight} label="Right" symbol="→" color="#4dc8ff" />
      </div>
    </div>
  );
}
