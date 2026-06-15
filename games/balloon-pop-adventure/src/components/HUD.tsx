import React from 'react';
import type { PowerUpState, Scores, GameMode } from '../game/types';
import { PLAYER_COLORS, PLAYER_NAMES } from '../constants/gameConfig';
import { formatTime } from '../utils/mathUtils';

interface HUDProps {
  scores:          Scores;
  timeLeft:        number;
  mode:            GameMode;
  playerCount:     1 | 2;
  powerUps:        PowerUpState;
  comboMultiplier: number;
  onPause:         () => void;
}

export function HUD({ scores, timeLeft, mode, playerCount, powerUps, comboMultiplier, onPause }: HUDProps) {
  const isEndless = mode === 'endless';
  const lowTime   = !isEndless && timeLeft <= 10;

  return (
    <div style={{
      position:      'absolute',
      inset:         0,
      pointerEvents: 'none',
      zIndex:        5,
      padding:       'clamp(10px, 2vw, 24px)',
    }}>
      {/* ── Top row ──────────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        gap:            'clamp(8px, 1.5vw, 16px)',
      }}>
        {/* P1 score */}
        <ScoreBox playerId={1} score={scores.p1} show />

        {/* Center: timer + power-ups */}
        <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
          {!isEndless && (
            <div style={{
              fontSize:   'clamp(2rem, 5vw, 4rem)',
              fontWeight: '900',
              color:      lowTime ? '#FF4444' : '#FFFFFF',
              textShadow: lowTime ? '0 0 20px rgba(255,68,68,0.8)' : '0 2px 8px rgba(0,0,0,0.6)',
              lineHeight: 1,
              animation:  lowTime ? 'pulse 0.5s infinite' : 'none',
              transition: 'color 0.3s',
            }}>
              {formatTime(timeLeft)}
            </div>
          )}

          {/* Power-up badges */}
          <div style={{
            display:        'flex',
            justifyContent: 'center',
            gap:            'clamp(6px, 1vw, 12px)',
            marginTop:      '6px',
            flexWrap:       'wrap',
          }}>
            {powerUps.freezeActive && (
              <PowerBadge icon="❄️" label="FREEZE" color="#90D5FF" endTime={powerUps.freezeEndTime} totalMs={5000} />
            )}
            {powerUps.comboActive && (
              <PowerBadge icon="🌈" label={`×${comboMultiplier} COMBO`} color="#FFD700" endTime={powerUps.comboEndTime} totalMs={10000} />
            )}
          </div>
        </div>

        {/* P2 score */}
        <ScoreBox playerId={2} score={scores.p2} show={playerCount === 2} />
      </div>

      {/* ── Pause button ─────────────────────────────────────────── */}
      <div style={{
        position:      'absolute',
        bottom:        'clamp(10px, 2vw, 24px)',
        right:         'clamp(10px, 2vw, 24px)',
        pointerEvents: 'auto',
      }}>
        <button
          style={{
            padding:      'clamp(10px, 1.5vw, 16px) clamp(14px, 2vw, 22px)',
            fontSize:     'clamp(1.2rem, 2.5vw, 1.8rem)',
            background:   'rgba(255,255,255,0.15)',
            color:        '#FFFFFF',
            border:       '2px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            cursor:       'pointer',
            backdropFilter: 'blur(4px)',
          }}
          onClick={onPause}
          title="Pause (hover for 1.5s with hand)"
        >
          ⏸
        </button>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
      `}</style>
    </div>
  );
}

// ─── Score box ────────────────────────────────────────────────────────────

function ScoreBox({ playerId, score, show }: { playerId: 1 | 2; score: number; show: boolean }) {
  if (!show) return <div style={{ minWidth: 'clamp(80px, 12vw, 130px)' }} />;
  const color = PLAYER_COLORS[playerId];
  return (
    <div style={{
      background:   'rgba(0,0,0,0.5)',
      borderRadius: '14px',
      border:       `2px solid ${color}40`,
      padding:      'clamp(8px, 1.5vw, 14px) clamp(12px, 2.5vw, 24px)',
      textAlign:    'center',
      minWidth:     'clamp(80px, 12vw, 130px)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        fontSize:     'clamp(0.7rem, 1.5vw, 0.9rem)',
        color,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        marginBottom: '4px',
      }}>
        {PLAYER_NAMES[playerId]}
      </div>
      <div style={{
        fontSize:   'clamp(1.8rem, 4vw, 3.5rem)',
        fontWeight: '900',
        color:      '#FFFFFF',
        lineHeight: 1,
        textShadow: `0 0 20px ${color}80`,
      }}>
        {score}
      </div>
    </div>
  );
}

// ─── Power-up badge with live countdown bar ───────────────────────────────

function PowerBadge({ icon, label, color, endTime, totalMs }: {
  icon: string; label: string; color: string; endTime: number; totalMs: number;
}) {
  const [remaining, setRemaining] = React.useState(1);

  React.useEffect(() => {
    let raf: number;
    function tick() {
      const left = Math.max(0, endTime - performance.now());
      setRemaining(left / totalMs);
      if (left > 0) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endTime, totalMs]);

  return (
    <div style={{
      position:    'relative',
      background:  'rgba(0,0,0,0.55)',
      borderRadius: '10px',
      border:      `2px solid ${color}55`,
      padding:     'clamp(4px, 0.8vw, 8px) clamp(8px, 1.5vw, 14px)',
      overflow:    'hidden',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        position:   'absolute',
        bottom: 0, left: 0,
        height:     '3px',
        width:      `${remaining * 100}%`,
        background: color,
        transition: 'width 0.1s linear',
      }} />
      <span style={{ fontSize: 'clamp(0.8rem, 1.8vw, 1rem)' }}>{icon}</span>{' '}
      <span style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)', color: '#FFFFFF', letterSpacing: '1px' }}>
        {label}
      </span>
    </div>
  );
}
