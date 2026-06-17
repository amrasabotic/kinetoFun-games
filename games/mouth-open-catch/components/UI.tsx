'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { GameMode } from './GameEngine';
import type { GameStats, Achievement, DailyChallenge } from './StorageManager';

// ─── Dwell Button ─────────────────────────────────────────────────────────────

interface DwellButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  dwellX?: number;   // cursor x 0–1
  dwellY?: number;   // cursor y 0–1
  className?: string;
  style?: React.CSSProperties;
  dwellDuration?: number;
  disabled?: boolean;
}

export function DwellButton({ children, onClick, dwellX, dwellY, className = '', style, dwellDuration = 1500, disabled }: DwellButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const dwellStart = useRef<number | null>(null);
  const fired = useRef(false);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (dwellX === undefined || dwellY === undefined || disabled) {
      setProgress(0);
      dwellStart.current = null;
      fired.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ex = dwellX * window.innerWidth;
    const ey = dwellY * window.innerHeight;
    const inside = Math.abs(ex - cx) < rect.width / 2 + 12 && Math.abs(ey - cy) < rect.height / 2 + 12;

    if (inside) {
      if (!dwellStart.current) { dwellStart.current = performance.now(); fired.current = false; }
      const p = Math.min(1, (performance.now() - dwellStart.current) / dwellDuration);
      setProgress(p);
      if (p >= 1 && !fired.current) {
        fired.current = true;
        onClick();
      }
      animRef.current = requestAnimationFrame(() => {});
    } else {
      dwellStart.current = null;
      fired.current = false;
      setProgress(0);
    }
  });

  const r = 22;
  const circ = 2 * Math.PI * r;

  return (
    <div ref={ref} className={`game-btn relative ${className}`} style={style} role="button" aria-disabled={disabled}>
      {children}
      {progress > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ borderRadius: 'inherit' }}>
          <rect x="2" y="2" width="calc(100% - 4)" height="calc(100% - 4)"
            rx="16" ry="16" fill="none"
            stroke="rgba(255,255,255,0.9)" strokeWidth="3"
            strokeDasharray={`${progress * 999} 999`} />
        </svg>
      )}
    </div>
  );
}

// ─── Dwell Cursor ─────────────────────────────────────────────────────────────

export function DwellCursor({ x, y, detected }: { x: number; y: number; detected: boolean }) {
  if (!detected) return null;
  return (
    <div className="pointer-events-none fixed z-50" style={{
      left: x * window.innerWidth - 16,
      top:  y * window.innerHeight - 16,
      width: 32, height: 32,
      transition: 'left 0.04s linear, top 0.04s linear',
      filter: 'drop-shadow(0 0 8px rgba(96,165,250,0.9))',
    }}>
      {/* Index finger cursor — tip at top-left so the point lands exactly on the target */}
      <div style={{
        fontSize: 28,
        lineHeight: 1,
        userSelect: 'none',
        transform: 'scaleX(-1)', // mirror so finger points toward content
      }}>
        ☝️
      </div>
    </div>
  );
}

// ─── Main Menu ────────────────────────────────────────────────────────────────

interface MainMenuProps {
  onPlay: (mode: GameMode) => void;
  onHowToPlay: () => void;
  onHighScores: () => void;
  onAchievements: () => void;
  onSettings: () => void;
  onCharacters: () => void;
  highScore: number;
  dwellX?: number;
  dwellY?: number;
  cameraReady: boolean;
}

export function MainMenu({ onPlay, onHowToPlay, onHighScores, onAchievements, onSettings, onCharacters, highScore, dwellX, dwellY, cameraReady }: MainMenuProps) {
  const btn = (label: string, color: string, action: () => void, icon: string) => (
    <DwellButton onClick={action} dwellX={dwellX} dwellY={dwellY}
      className="w-full text-2xl py-4 px-8 rounded-2xl text-white font-bold mb-3 fade-in"
      style={{ background: color, boxShadow: `0 4px 20px ${color}88`, fontFamily: 'Fredoka One, sans-serif' }}>
      <span className="mr-3 text-3xl">{icon}</span>{label}
    </DwellButton>
  );

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-20"
      style={{ background: 'linear-gradient(135deg, #0f0a1e 0%, #1a0a3e 50%, #0a1a2e 100%)' }}>
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              width: 2 + Math.random() * 4, height: 2 + Math.random() * 4,
              opacity: 0.2 + Math.random() * 0.6,
              animation: `pulse-glow ${1.5 + Math.random() * 2}s ease-in-out infinite`,
            }} />
        ))}
      </div>

      {/* Logo */}
      <div className="text-center mb-6 pop-in">
        <div className="text-7xl mb-2 animate-bounce">👄</div>
        <h1 style={{ fontFamily: 'Fredoka One, sans-serif', fontSize: '3.5rem', lineHeight: 1 }}
          className="text-white drop-shadow-lg">
          <span style={{ color: '#fbbf24' }}>Mouth</span>{' '}
          <span style={{ color: '#f472b6' }}>Open</span>{' '}
          <span style={{ color: '#34d399' }}>Catch</span>
        </h1>
        <p className="text-purple-300 text-lg mt-1 font-semibold">Open your mouth to catch food!</p>
        {highScore > 0 && (
          <div className="mt-2 text-yellow-400 font-bold text-xl">🏆 Best: {highScore.toLocaleString()}</div>
        )}
      </div>

      {/* Camera status */}
      <div className={`mb-4 px-4 py-2 rounded-full text-sm font-bold ${cameraReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
        {cameraReady ? '📷 Camera Ready — Face Control Active' : '⏳ Starting camera…'}
      </div>

      {/* Buttons */}
      <div className="w-full max-w-sm px-6">
        {btn('PLAY NOW', 'linear-gradient(135deg, #7c3aed, #4f46e5)', () => onPlay('CLASSIC'), '🎮')}

        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            ['COIN RUSH', 'linear-gradient(135deg, #f59e0b, #d97706)', 'COIN_RUSH', '🪙'],
            ['SURVIVAL', 'linear-gradient(135deg, #ef4444, #dc2626)', 'SURVIVAL', '💀'],
            ['HEALTHY', 'linear-gradient(135deg, #10b981, #059669)', 'HEALTHY_EATING', '🥗'],
            ["KIDS MODE", 'linear-gradient(135deg, #f472b6, #ec4899)', 'KIDS', '🌈'],
          ].map(([label, color, mode, icon]) => (
            <DwellButton key={mode as string} onClick={() => onPlay(mode as GameMode)}
              dwellX={dwellX} dwellY={dwellY}
              className="text-base py-3 px-4 rounded-xl text-white font-bold"
              style={{ background: color as string, fontFamily: 'Fredoka One, sans-serif' }}>
              <span className="mr-1 text-xl">{icon}</span>{label}
            </DwellButton>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {([
            ['Scores', onHighScores, '🏆'],
            ['Chars', onCharacters, '👾'],
            ['Achieve', onAchievements, '🎖️'],
            ['How To', onHowToPlay, '❓'],
            ['Settings', onSettings, '⚙️'],
          ] as [string, () => void, string][]).map(([label, action, icon]) => (
            <DwellButton key={label} onClick={action}
              dwellX={dwellX} dwellY={dwellY}
              className="text-sm py-2 px-2 rounded-xl text-white font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span className="mr-1">{icon}</span>{label}
            </DwellButton>
          ))}
        </div>
      </div>

      <p className="absolute bottom-4 text-purple-400/60 text-sm">
        Move your head to navigate · Dwell on button to select
      </p>
    </div>
  );
}

// ─── Calibration Screen ───────────────────────────────────────────────────────

interface CalibrationScreenProps {
  phase: 'closed' | 'open' | 'done' | 'waiting';
  progress: number;
  onSkip: () => void;
}

export function CalibrationScreen({ phase, progress, onSkip }: CalibrationScreenProps) {
  const instructions = {
    waiting: { icon: '👀', title: 'Look at the camera', sub: 'Detecting your face…', color: '#7c3aed' },
    closed:  { icon: '😐', title: 'Keep your mouth CLOSED', sub: 'Hold still for 2 seconds…', color: '#3b82f6' },
    open:    { icon: '😮', title: 'Open your mouth WIDE', sub: 'Hold it open for 2 seconds…', color: '#10b981' },
    done:    { icon: '✅', title: 'Calibration complete!', sub: 'Get ready to play!', color: '#fbbf24' },
  }[phase];

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-20"
      style={{ background: 'linear-gradient(135deg, #0f0a1e, #1a0a3e)' }}>
      <div className="text-center max-w-md px-8 pop-in">
        <h2 className="text-white text-4xl font-bold mb-2" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
          Face Calibration
        </h2>
        <p className="text-purple-300 mb-8">This helps the game understand your face!</p>

        <div className="text-9xl mb-6 animate-bounce">{instructions.icon}</div>

        <div className="text-white text-2xl font-bold mb-2" style={{ fontFamily: 'Fredoka One, sans-serif', color: instructions.color }}>
          {instructions.title}
        </div>
        <p className="text-purple-300 mb-8">{instructions.sub}</p>

        {phase !== 'done' && phase !== 'waiting' && (
          <div className="w-full bg-white/10 rounded-full h-5 mb-8 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-100"
              style={{ width: `${progress * 100}%`, background: instructions.color }} />
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mb-6">
          {(['waiting', 'closed', 'open', 'done'] as const).map((p, i) => (
            <div key={p} className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded-full transition-all ${
                p === phase ? 'scale-125' : ''
              }`} style={{
                background: p === phase ? instructions.color :
                  ['waiting', 'closed', 'open', 'done'].indexOf(p) < ['waiting', 'closed', 'open', 'done'].indexOf(phase)
                  ? '#10b981' : 'rgba(255,255,255,0.2)'
              }} />
              {i < 3 && <div className="w-6 h-0.5 bg-white/20" />}
            </div>
          ))}
        </div>

        <button onClick={onSkip}
          className="text-purple-400 hover:text-purple-300 text-sm underline cursor-pointer transition-colors">
          Skip calibration (use defaults)
        </button>
      </div>
    </div>
  );
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

interface HUDProps {
  score: number;
  lives: number;
  combo: number;
  activePowerUps: Array<{ type: string; label: string; icon: string; endTime: number }>;
  mouthOpenness: number;
  faceDetected: boolean;
  isStunned: boolean;
  bossWaveLabel: string;
  bossWaveTimer: number;
  gameMode: GameMode;
  dailyChallenge: DailyChallenge | null;
  isPaused: boolean;
  onPause: () => void;
}

export function HUD({ score, lives, combo, activePowerUps, mouthOpenness, faceDetected, isStunned, bossWaveLabel, bossWaveTimer, gameMode, dailyChallenge, isPaused, onPause }: HUDProps) {
  const modeColors: Record<GameMode, string> = {
    CLASSIC: '#7c3aed', SURVIVAL: '#ef4444', COIN_RUSH: '#f59e0b',
    HEALTHY_EATING: '#10b981', KIDS: '#f472b6',
  };
  const modeLabel: Record<GameMode, string> = {
    CLASSIC: 'Classic', SURVIVAL: 'Survival', COIN_RUSH: 'Coin Rush',
    HEALTHY_EATING: 'Healthy', KIDS: 'Kids',
  };

  return (
    <>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 flex items-start justify-between p-4 z-10 pointer-events-none">
        {/* Score & lives */}
        <div className="pointer-events-auto">
          <div className="px-5 py-2 rounded-2xl" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
            <div className="text-yellow-400 text-3xl font-bold" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
              {score.toLocaleString()}
            </div>
            <div className="text-sm text-purple-300 font-semibold">{modeLabel[gameMode]} Mode</div>
          </div>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-2xl transition-all duration-300" style={{ opacity: i < lives ? 1 : 0.2 }}>
                ❤️
              </span>
            ))}
          </div>
        </div>

        {/* Combo + pause */}
        <div className="flex flex-col items-end gap-2">
          <button onClick={onPause} className="pointer-events-auto px-4 py-2 rounded-xl text-white font-bold text-sm"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          {combo >= 2 && (
            <div className="px-4 py-2 rounded-2xl pop-in"
              style={{ background: `linear-gradient(135deg, #7c3aed, #f59e0b)`, boxShadow: '0 0 20px rgba(124,58,237,0.6)' }}>
              <div className="text-white text-2xl font-bold text-center" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
                🔥 x{combo}
              </div>
              <div className="text-yellow-200 text-xs text-center font-semibold">COMBO!</div>
            </div>
          )}
        </div>
      </div>

      {/* Power-ups strip */}
      {activePowerUps.length > 0 && (
        <div className="fixed top-28 left-4 flex flex-col gap-2 z-10 pointer-events-none">
          {activePowerUps.map(p => {
            const remaining = Math.max(0, (p.endTime - performance.now()) / 1000);
            return (
              <div key={p.type} className="px-3 py-1.5 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <span className="text-xl">{p.icon}</span>
                <div>
                  <div className="text-white text-xs font-bold">{p.label}</div>
                  <div className="w-20 bg-white/20 rounded h-1.5 mt-0.5">
                    <div className="h-full rounded bg-yellow-400 transition-all"
                      style={{ width: `${(remaining / 15) * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Face / mouth indicator */}
      <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2 z-10 pointer-events-none">
        <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/60 text-xs">Face</span>
          </div>
          <div className="w-16 bg-white/20 rounded h-2 mt-1">
            <div className="h-full rounded transition-all duration-75"
              style={{ width: `${mouthOpenness * 100}%`, background: mouthOpenness > 0.5 ? '#10b981' : '#f59e0b' }} />
          </div>
          <div className="text-white/40 text-xs mt-0.5 text-center">
            {mouthOpenness > 0.6 ? '😮 OPEN' : mouthOpenness > 0.3 ? '😐 HALF' : '😶 CLOSED'}
          </div>
        </div>
      </div>

      {/* Boss wave banner */}
      {bossWaveLabel && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="px-10 py-5 rounded-3xl text-center pop-in"
            style={{ background: 'linear-gradient(135deg, #1a0a3e, #0a1a2e)', border: '3px solid #fbbf24', boxShadow: '0 0 40px rgba(251,191,36,0.5)' }}>
            <div className="text-5xl mb-2">⚡</div>
            <div className="text-yellow-400 text-3xl font-bold" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
              {bossWaveLabel}
            </div>
            <div className="text-white/60 text-sm mt-1">{Math.ceil(bossWaveTimer)}s remaining</div>
          </div>
        </div>
      )}

      {/* Stun overlay */}
      {isStunned && (
        <div className="fixed inset-0 pointer-events-none z-10"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)' }}>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="text-6xl animate-spin">🌶️</div>
          </div>
        </div>
      )}

      {/* Face lost overlay */}
      {!faceDetected && (
        <div className="fixed inset-0 flex items-center justify-center z-30 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="text-center">
            <div className="text-6xl mb-4">📷</div>
            <div className="text-white text-3xl font-bold" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
              Face Lost!
            </div>
            <p className="text-purple-300 mt-2">Move back into frame to continue…</p>
          </div>
        </div>
      )}

      {/* Daily challenge */}
      {dailyChallenge && !dailyChallenge.completed && (
        <div className="fixed bottom-4 left-4 z-10 pointer-events-none">
          <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(124,58,237,0.4)' }}>
            <div className="text-purple-400 text-xs font-bold mb-1">📅 DAILY CHALLENGE</div>
            <div className="text-white text-sm font-semibold">{dailyChallenge.type}</div>
            <div className="w-32 bg-white/20 rounded h-1.5 mt-1">
              <div className="h-full rounded bg-purple-400 transition-all"
                style={{ width: `${(dailyChallenge.progress / dailyChallenge.goal) * 100}%` }} />
            </div>
            <div className="text-white/40 text-xs mt-0.5">{dailyChallenge.progress}/{dailyChallenge.goal}</div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Pause Screen ─────────────────────────────────────────────────────────────

interface PauseScreenProps {
  onResume: () => void;
  onQuit: () => void;
  score: number;
  dwellX?: number;
  dwellY?: number;
}

export function PauseScreen({ onResume, onQuit, score, dwellX, dwellY }: PauseScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-30"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="text-center px-10 py-10 rounded-3xl pop-in"
        style={{ background: 'linear-gradient(135deg, #1a0a3e, #0a1a2e)', border: '2px solid rgba(124,58,237,0.5)', minWidth: 320 }}>
        <div className="text-6xl mb-4">⏸</div>
        <h2 className="text-white text-4xl font-bold mb-2" style={{ fontFamily: 'Fredoka One, sans-serif' }}>Paused</h2>
        <div className="text-yellow-400 text-2xl font-bold mb-8">Score: {score.toLocaleString()}</div>
        <DwellButton onClick={onResume} dwellX={dwellX} dwellY={dwellY}
          className="w-full py-4 rounded-2xl mb-3 text-2xl"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', fontFamily: 'Fredoka One, sans-serif' }}>
          ▶ Resume
        </DwellButton>
        <DwellButton onClick={onQuit} dwellX={dwellX} dwellY={dwellY}
          className="w-full py-3 rounded-2xl text-xl"
          style={{ background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.5)', fontFamily: 'Fredoka One, sans-serif' }}>
          🏠 Quit to Menu
        </DwellButton>
      </div>
    </div>
  );
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────

interface GameOverProps {
  score: number;
  highScore: number;
  combo: number;
  caught: number;
  gameMode: GameMode;
  newAchievements: string[];
  onPlayAgain: () => void;
  onMenu: () => void;
  dwellX?: number;
  dwellY?: number;
}

export function GameOverScreen({ score, highScore, combo, caught, gameMode, newAchievements, onPlayAgain, onMenu, dwellX, dwellY }: GameOverProps) {
  const isNewBest = score >= highScore && score > 0;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-30"
      style={{ background: 'linear-gradient(135deg, rgba(15,10,30,0.95), rgba(26,10,62,0.95))', backdropFilter: 'blur(10px)' }}>
      <div className="text-center px-8 py-8 rounded-3xl pop-in w-full max-w-sm mx-4"
        style={{ background: 'linear-gradient(135deg, #1a0a3e, #0a1a2e)', border: `2px solid ${isNewBest ? '#fbbf24' : 'rgba(124,58,237,0.5)'}`, boxShadow: isNewBest ? '0 0 40px rgba(251,191,36,0.4)' : 'none' }}>
        <div className="text-6xl mb-2">{isNewBest ? '🏆' : '😮'}</div>
        <h2 className="text-white text-4xl font-bold mb-1" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
          Game Over!
        </h2>
        {isNewBest && <div className="text-yellow-400 font-bold text-lg mb-2 animate-bounce">✨ NEW HIGH SCORE! ✨</div>}

        <div className="grid grid-cols-2 gap-3 my-6">
          {[
            ['Score', score.toLocaleString(), '#fbbf24'],
            ['Best', highScore.toLocaleString(), '#a78bfa'],
            ['Best Combo', `x${combo}`, '#f472b6'],
            ['Caught', caught, '#34d399'],
          ].map(([label, val, color]) => (
            <div key={label as string} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="text-white/60 text-xs">{label}</div>
              <div className="font-bold text-xl" style={{ color: color as string, fontFamily: 'Fredoka One, sans-serif' }}>{val}</div>
            </div>
          ))}
        </div>

        {newAchievements.length > 0 && (
          <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <div className="text-yellow-400 text-sm font-bold mb-1">🎖️ Achievements Unlocked!</div>
            {newAchievements.map(a => (
              <div key={a} className="text-white text-sm">• {a}</div>
            ))}
          </div>
        )}

        <DwellButton onClick={onPlayAgain} dwellX={dwellX} dwellY={dwellY}
          className="w-full py-4 rounded-2xl mb-3 text-2xl"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', fontFamily: 'Fredoka One, sans-serif' }}>
          🎮 Play Again
        </DwellButton>
        <DwellButton onClick={onMenu} dwellX={dwellX} dwellY={dwellY}
          className="w-full py-3 rounded-2xl text-lg"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontFamily: 'Fredoka One, sans-serif' }}>
          🏠 Main Menu
        </DwellButton>
      </div>
    </div>
  );
}

// ─── How To Play ──────────────────────────────────────────────────────────────

export function HowToPlayScreen({ onBack, dwellX, dwellY }: { onBack: () => void; dwellX?: number; dwellY?: number }) {
  const steps = [
    { icon: '📷', title: 'Face Camera', desc: 'Sit in front of your webcam so Chompy can see your face.' },
    { icon: '↔️', title: 'Move Head', desc: 'Move your head left and right to control Chompy\'s position.' },
    { icon: '😮', title: 'Open Mouth', desc: 'Open your mouth wide to catch falling food and treasures!' },
    { icon: '💣', title: 'Avoid Hazards', desc: 'Bombs, poison mushrooms and rotten food will hurt you.' },
    { icon: '🔥', title: 'Build Combos', desc: 'Catch items in a row to build up combo multipliers for bigger scores.' },
    { icon: '⚡', title: 'Power-Ups', desc: 'Grab glowing power-ups for special abilities like Giant Mouth or Slow Motion.' },
  ];
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-20 overflow-y-auto py-8"
      style={{ background: 'linear-gradient(135deg, #0f0a1e, #1a0a3e)' }}>
      <div className="w-full max-w-lg px-6">
        <h2 className="text-white text-4xl font-bold text-center mb-6 pop-in" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
          How To Play
        </h2>
        <div className="grid grid-cols-1 gap-4 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl fade-in"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', animationDelay: `${i * 0.08}s` }}>
              <div className="text-4xl flex-shrink-0">{s.icon}</div>
              <div>
                <div className="text-white font-bold text-lg" style={{ fontFamily: 'Fredoka One, sans-serif' }}>{s.title}</div>
                <div className="text-purple-300 text-sm">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <DwellButton onClick={onBack} dwellX={dwellX} dwellY={dwellY}
          className="w-full py-4 rounded-2xl text-xl"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', fontFamily: 'Fredoka One, sans-serif' }}>
          ← Back
        </DwellButton>
      </div>
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

interface SettingsScreenProps {
  soundEnabled: boolean;
  musicEnabled: boolean;
  showCamera: boolean;
  highContrast: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onToggleCamera: () => void;
  onToggleContrast: () => void;
  onRecalibrate: () => void;
  onBack: () => void;
  dwellX?: number;
  dwellY?: number;
}

export function SettingsScreen({ soundEnabled, musicEnabled, showCamera, highContrast, onToggleSound, onToggleMusic, onToggleCamera, onToggleContrast, onRecalibrate, onBack, dwellX, dwellY }: SettingsScreenProps) {
  const Toggle = ({ label, icon, value, onToggle }: { label: string; icon: string; value: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between p-4 rounded-2xl mb-3"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-white font-semibold">{label}</span>
      </div>
      <DwellButton onClick={onToggle} dwellX={dwellX} dwellY={dwellY}
        className="px-5 py-2 rounded-full text-sm font-bold"
        style={{ background: value ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.1)' }}>
        {value ? '✓ ON' : 'OFF'}
      </DwellButton>
    </div>
  );
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-20"
      style={{ background: 'linear-gradient(135deg, #0f0a1e, #1a0a3e)' }}>
      <div className="w-full max-w-md px-6">
        <h2 className="text-white text-4xl font-bold text-center mb-8 pop-in" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
          ⚙️ Settings
        </h2>
        <Toggle label="Sound Effects" icon="🔊" value={soundEnabled} onToggle={onToggleSound} />
        <Toggle label="Background Music" icon="🎵" value={musicEnabled} onToggle={onToggleMusic} />
        <Toggle label="Show Camera Feed" icon="📷" value={showCamera} onToggle={onToggleCamera} />
        <Toggle label="High Contrast Mode" icon="🎨" value={highContrast} onToggle={onToggleContrast} />
        <DwellButton onClick={onRecalibrate} dwellX={dwellX} dwellY={dwellY}
          className="w-full py-4 rounded-2xl mb-3 text-xl"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontFamily: 'Fredoka One, sans-serif' }}>
          🎯 Recalibrate Face
        </DwellButton>
        <DwellButton onClick={onBack} dwellX={dwellX} dwellY={dwellY}
          className="w-full py-4 rounded-2xl text-xl"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontFamily: 'Fredoka One, sans-serif' }}>
          ← Back
        </DwellButton>
      </div>
    </div>
  );
}

// ─── High Scores ──────────────────────────────────────────────────────────────

interface HighScoresProps {
  stats: GameStats;
  onBack: () => void;
  dwellX?: number;
  dwellY?: number;
}

export function HighScoresScreen({ stats, onBack, dwellX, dwellY }: HighScoresProps) {
  const items = [
    ['🏆', 'High Score', stats.highScore.toLocaleString()],
    ['🔥', 'Best Combo', `x${stats.bestCombo}`],
    ['🎮', 'Games Played', stats.gamesPlayed],
    ['🎯', 'Total Caught', stats.totalCaught.toLocaleString()],
    ['🪙', 'Total Coins', stats.coins.toLocaleString()],
    ['💎', 'Total Diamonds', stats.diamonds],
    ['⏱️', 'Best Survival', `${stats.bestSurvivalTime.toFixed(0)}s`],
    ['🕹️', 'Time Played', `${Math.floor(stats.timePlayed / 60)}m`],
  ];
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-20"
      style={{ background: 'linear-gradient(135deg, #0f0a1e, #1a0a3e)' }}>
      <div className="w-full max-w-md px-6">
        <h2 className="text-white text-4xl font-bold text-center mb-6 pop-in" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
          🏆 High Scores
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {items.map(([icon, label, val]) => (
            <div key={label as string} className="p-4 rounded-2xl text-center fade-in"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-3xl mb-1">{icon}</div>
              <div className="text-white/60 text-xs">{label}</div>
              <div className="text-yellow-400 font-bold text-xl" style={{ fontFamily: 'Fredoka One, sans-serif' }}>{val}</div>
            </div>
          ))}
        </div>
        <DwellButton onClick={onBack} dwellX={dwellX} dwellY={dwellY}
          className="w-full py-4 rounded-2xl text-xl"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', fontFamily: 'Fredoka One, sans-serif' }}>
          ← Back
        </DwellButton>
      </div>
    </div>
  );
}

// ─── Achievements ─────────────────────────────────────────────────────────────

interface AchievementsProps {
  achievements: Achievement[];
  onBack: () => void;
  dwellX?: number;
  dwellY?: number;
}

export function AchievementsScreen({ achievements, onBack, dwellX, dwellY }: AchievementsProps) {
  const unlocked = achievements.filter(a => a.unlockedAt).length;
  return (
    <div className="fixed inset-0 flex flex-col items-center z-20 overflow-y-auto py-8"
      style={{ background: 'linear-gradient(135deg, #0f0a1e, #1a0a3e)' }}>
      <div className="w-full max-w-md px-6">
        <h2 className="text-white text-4xl font-bold text-center mb-2 pop-in" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
          🎖️ Achievements
        </h2>
        <p className="text-purple-300 text-center mb-6">{unlocked}/{achievements.length} Unlocked</p>
        <div className="space-y-3 mb-6">
          {achievements.map((a, i) => (
            <div key={a.id} className="flex items-center gap-4 p-4 rounded-2xl fade-in"
              style={{
                background: a.unlockedAt ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.2))' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${a.unlockedAt ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                opacity: a.unlockedAt ? 1 : 0.5,
                animationDelay: `${i * 0.04}s`,
              }}>
              <div className="text-4xl flex-shrink-0" style={{ filter: a.unlockedAt ? 'none' : 'grayscale(1)' }}>{a.icon}</div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm" style={{ fontFamily: 'Fredoka One, sans-serif' }}>{a.name}</div>
                <div className="text-purple-300 text-xs">{a.description}</div>
                {a.unlockedAt && <div className="text-yellow-400/60 text-xs mt-0.5">✓ {new Date(a.unlockedAt).toLocaleDateString()}</div>}
              </div>
              {!a.unlockedAt && <div className="text-white/20 text-2xl">🔒</div>}
            </div>
          ))}
        </div>
        <DwellButton onClick={onBack} dwellX={dwellX} dwellY={dwellY}
          className="w-full py-4 rounded-2xl text-xl"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', fontFamily: 'Fredoka One, sans-serif' }}>
          ← Back
        </DwellButton>
      </div>
    </div>
  );
}

// ─── Characters Screen ────────────────────────────────────────────────────────

export const ALL_CHARACTERS = [
  { id: 'chompy',    name: 'Chompy',          emoji: '👾', color: '#7c3aed', unlockDesc: 'Default character' },
  { id: 'shark',     name: 'Captain Shark',   emoji: '🦈', color: '#3b82f6', unlockDesc: 'Catch 100 items' },
  { id: 'dragon',    name: 'Baby Dragon',     emoji: '🐲', color: '#10b981', unlockDesc: 'Score 2000 points' },
  { id: 'alien',     name: 'Space Alien',     emoji: '👽', color: '#a78bfa', unlockDesc: 'Play 10 games' },
  { id: 'goblin',    name: 'Treasure Goblin', emoji: '👺', color: '#f59e0b', unlockDesc: 'Collect 10 diamonds' },
  { id: 'dino',      name: 'Cookie Dino',     emoji: '🦕', color: '#34d399', unlockDesc: 'Catch 1000 items' },
  { id: 'robot',     name: 'Robot Buddy',     emoji: '🤖', color: '#94a3b8', unlockDesc: 'Reach x10 combo' },
  { id: 'frog',      name: 'Frog King',       emoji: '🐸', color: '#84cc16', unlockDesc: 'Score 5000 points' },
];

interface CharactersProps {
  selected: string;
  unlocked: string[];
  onSelect: (id: string) => void;
  onBack: () => void;
  dwellX?: number;
  dwellY?: number;
}

export function CharactersScreen({ selected, unlocked, onSelect, onBack, dwellX, dwellY }: CharactersProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center z-20 overflow-y-auto py-8"
      style={{ background: 'linear-gradient(135deg, #0f0a1e, #1a0a3e)' }}>
      <div className="w-full max-w-md px-6">
        <h2 className="text-white text-4xl font-bold text-center mb-2 pop-in" style={{ fontFamily: 'Fredoka One, sans-serif' }}>
          👾 Characters
        </h2>
        <p className="text-purple-300 text-center mb-6">Choose your catcher!</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {ALL_CHARACTERS.map((c, i) => {
            const isUnlocked = unlocked.includes(c.id);
            const isSelected = selected === c.id;
            return (
              <DwellButton key={c.id} onClick={() => isUnlocked && onSelect(c.id)}
                dwellX={dwellX} dwellY={dwellY}
                className="flex-col py-4 rounded-2xl fade-in"
                style={{
                  background: isSelected ? `linear-gradient(135deg, ${c.color}33, ${c.color}22)` : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${isSelected ? c.color : 'rgba(255,255,255,0.1)'}`,
                  opacity: isUnlocked ? 1 : 0.5,
                  animationDelay: `${i * 0.05}s`,
                }}>
                <div className="text-5xl mb-2" style={{ filter: isUnlocked ? 'none' : 'grayscale(1)' }}>{c.emoji}</div>
                <div className="text-white font-bold text-sm" style={{ fontFamily: 'Fredoka One, sans-serif' }}>{c.name}</div>
                {isSelected && <div className="text-xs mt-1" style={{ color: c.color }}>✓ Selected</div>}
                {!isUnlocked && <div className="text-white/40 text-xs mt-1">🔒 {c.unlockDesc}</div>}
              </DwellButton>
            );
          })}
        </div>
        <DwellButton onClick={onBack} dwellX={dwellX} dwellY={dwellY}
          className="w-full py-4 rounded-2xl text-xl"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', fontFamily: 'Fredoka One, sans-serif' }}>
          ← Back
        </DwellButton>
      </div>
    </div>
  );
}

// ─── Achievement Toast ────────────────────────────────────────────────────────

export function AchievementToast({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [name, onDone]);
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pop-in">
      <div className="px-6 py-4 rounded-2xl text-center"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #fbbf24)', boxShadow: '0 8px 32px rgba(124,58,237,0.6)' }}>
        <div className="text-3xl mb-1">🎖️</div>
        <div className="text-white font-bold text-sm">Achievement Unlocked!</div>
        <div className="text-yellow-200 font-bold">{name}</div>
      </div>
    </div>
  );
}
