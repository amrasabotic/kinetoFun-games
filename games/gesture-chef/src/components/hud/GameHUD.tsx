import React from 'react';
import { ProgressBar } from '../ui/ProgressBar';

interface GameHUDProps {
  score: number;
  combo: number;
  timeLeft: number;
  totalTime: number;
  minigameName: string;
  minigameEmoji: string;
  minigameIndex: number;
  totalMinigames: number;
  recipeName: string;
  onPause?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score, combo, timeLeft, totalTime,
  minigameName, minigameEmoji, minigameIndex, totalMinigames, recipeName, onPause,
}) => {
  const timeRatio = totalTime > 0 ? timeLeft / totalTime : 0;
  const timerColor = timeRatio > 0.5 ? '#7BC67E' : timeRatio > 0.25 ? '#FFD700' : '#FF4444';
  const isLowTime = timeRatio < 0.25;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
      padding: 'clamp(8px,1.5vw,16px) clamp(12px,2vw,24px)',
      display: 'flex', flexDirection: 'column', gap: 8,
      background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)',
      pointerEvents: 'none',
      fontFamily: 'Nunito, sans-serif',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Recipe + task indicator */}
        <div style={{
          background: 'rgba(0,0,0,0.5)', borderRadius: 12,
          padding: '6px 14px', color: '#fff', fontSize: '0.85rem', fontWeight: 700,
          backdropFilter: 'blur(8px)',
        }}>
          {recipeName} · Task {minigameIndex + 1}/{totalMinigames}
        </div>

        {/* Task name */}
        <div style={{
          background: 'rgba(255,107,53,0.9)', borderRadius: 12,
          padding: '6px 14px', color: '#fff', fontSize: '0.9rem', fontWeight: 800,
          backdropFilter: 'blur(8px)',
        }}>
          {minigameEmoji} {minigameName}
        </div>

        <div style={{ flex: 1 }} />

        {/* Score */}
        <div style={{
          background: 'rgba(0,0,0,0.55)', borderRadius: 14,
          padding: '6px 18px', textAlign: 'center',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            Score
          </div>
          <div style={{ color: '#FFD700', fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 900, lineHeight: 1 }}>
            {score.toLocaleString()}
          </div>
        </div>

        {/* Combo */}
        {combo > 1 && (
          <div style={{
            background: 'linear-gradient(135deg, #FF6B35, #FFD700)',
            borderRadius: 14, padding: '6px 14px',
            animation: 'comboPulse 0.3s ease',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Combo
            </div>
            <div style={{ color: '#fff', fontSize: 'clamp(1.1rem,2vw,1.6rem)', fontWeight: 900, lineHeight: 1 }}>
              ×{combo}
            </div>
          </div>
        )}

        {/* Pause button */}
        {onPause && (
          <button
            onClick={onPause}
            style={{
              background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
              borderRadius: 12, width: 40, height: 40, fontSize: '1.1rem',
              cursor: 'pointer', pointerEvents: 'all', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ⏸
          </button>
        )}
      </div>

      {/* Timer bar */}
      <div style={{
        animation: isLowTime ? 'timerPulse 0.5s ease-in-out infinite' : 'none',
      }}>
        <ProgressBar
          value={timeRatio}
          color={timerColor}
          bgColor="rgba(0,0,0,0.35)"
          height={10}
          glowing={isLowTime}
        />
      </div>

      {/* Low time warning */}
      {timeLeft <= 10 && timeLeft > 0 && (
        <div style={{
          textAlign: 'center', color: '#FF4444', fontWeight: 900,
          fontSize: 'clamp(1rem,2.5vw,1.5rem)',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          animation: 'timerPulse 0.5s ease-in-out infinite',
        }}>
          ⏱️ {Math.ceil(timeLeft)}s
        </div>
      )}
    </div>
  );
};
