import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MinigameType, Difficulty, MinigameResult } from '../../types';
import { MINIGAME_INFO, MINIGAME_BASE_DURATIONS, MINIGAME_MAX_SCORES, DIFFICULTY_SETTINGS } from '../../constants/gameConfig';
import { GameHUD } from '../hud/GameHUD';
import { audioManager } from '../../utils/audio';

interface Props {
  minigameType: MinigameType;
  minigameIndex: number;
  totalMinigames: number;
  recipeName: string;
  difficulty: Difficulty;
  cameraEnabled: boolean;
  onComplete: (result: MinigameResult) => void;
}

type Phase = 'intro' | 'countdown' | 'playing' | 'finishing';

export const MinigameWrapper: React.FC<Props> = ({
  minigameType, minigameIndex, totalMinigames, recipeName, difficulty, cameraEnabled, onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [paused, setPaused] = useState(false);

  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const pausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const info = MINIGAME_INFO[minigameType];
  const diffCfg = DIFFICULTY_SETTINGS[difficulty];
  const baseDuration = MINIGAME_BASE_DURATIONS[minigameType];
  const totalTime = Math.round(baseDuration * diffCfg.timeMultiplier);

  const handleStartCountdown = useCallback(() => {
    setPhase('countdown');
  }, []);

  useEffect(() => {
    if (phase !== 'countdown') return;
    audioManager.tick();
    if (countdown <= 0) {
      setPhase('playing');
      setTimeLeft(totalTime);
      return;
    }
    const t = setTimeout(() => {
      setCountdown(c => c - 1);
    }, 900);
    return () => clearTimeout(t);
  }, [phase, countdown, totalTime]);

  // Game timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft(prev => {
        const next = prev - 0.1;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          setPhase('finishing');
          return 0;
        }
        if (Math.ceil(next) !== Math.ceil(prev) && next <= 5) audioManager.tick();
        return next;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Finishing → call onComplete
  useEffect(() => {
    if (phase !== 'finishing') return;
    audioManager.complete();
    const finalScore = Math.round(scoreRef.current * diffCfg.scoreMultiplier);
    const max = MINIGAME_MAX_SCORES[minigameType];
    const ratio = max > 0 ? finalScore / max : 0;
    const stars = ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : ratio >= 0.3 ? 1 : 0;
    const t = setTimeout(() => {
      onComplete({ type: minigameType, score: finalScore, stars, maxScore: max });
    }, 1200);
    return () => clearTimeout(t);
  }, [phase, minigameType, diffCfg.scoreMultiplier, onComplete]);

  const handleScore = useCallback((pts: number) => {
    scoreRef.current += pts;
    setScore(scoreRef.current);
  }, []);

  const handleCombo = useCallback((c: number) => {
    comboRef.current = c;
    setCombo(c);
  }, []);

  const handleTimeUp = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('finishing');
  }, []);

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(p => !p);
  };

  // Dynamically import the correct minigame component
  const MinigameComponent = MINIGAME_COMPONENTS[minigameType];

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Actual minigame */}
      {phase === 'playing' || phase === 'finishing' ? (
        <MinigameComponent
          difficulty={difficulty}
          paused={paused}
          cameraEnabled={cameraEnabled}
          onScore={handleScore}
          onCombo={handleCombo}
          onTimeUp={handleTimeUp}
        />
      ) : null}

      {/* HUD */}
      {(phase === 'playing' || phase === 'finishing') && (
        <GameHUD
          score={score}
          combo={combo}
          timeLeft={timeLeft}
          totalTime={totalTime}
          minigameName={info.name}
          minigameEmoji={info.emoji}
          minigameIndex={minigameIndex}
          totalMinigames={totalMinigames}
          recipeName={recipeName}
          onPause={togglePause}
        />
      )}

      {/* Intro overlay */}
      {phase === 'intro' && (
        <div style={OVERLAY_STYLE}>
          <div style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 32, padding: 'clamp(28px,5vw,52px)',
            textAlign: 'center', maxWidth: 520,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            animation: 'popIn 0.5s cubic-bezier(.36,.07,.19,.97) both',
            fontFamily: 'Nunito, sans-serif',
          }}>
            <div style={{ fontSize: 'clamp(4rem,10vw,7rem)', marginBottom: 8 }}>{info.emoji}</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, color: '#FF6B35' }}>
              {info.name}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 'clamp(0.95rem,2vw,1.2rem)', color: '#555', fontWeight: 600 }}>
              {info.description}
            </p>
            <div style={{
              background: '#FFF5E0', borderRadius: 16, padding: '12px 20px',
              color: '#AA7744', fontSize: 'clamp(0.85rem,1.8vw,1.05rem)', fontWeight: 700,
            }}>
              💡 {info.instructions}
            </div>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ color: '#BBB', fontWeight: 700, fontSize: '0.9rem' }}>
                Task {minigameIndex + 1} of {totalMinigames}
              </div>
              <button
                onClick={handleStartCountdown}
                style={{
                  background: 'linear-gradient(135deg, #FF6B35, #FF8C42)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 20,
                  padding: '14px 40px',
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 6px 0 #C94A1A, 0 8px 20px rgba(255,107,53,0.4)',
                  animation: 'popIn 0.6s 0.3s cubic-bezier(.36,.07,.19,.97) both',
                  letterSpacing: '0.3px',
                }}
                autoFocus
              >
                🍳 Let&apos;s Cook!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {phase === 'countdown' && (
        <div style={OVERLAY_STYLE}>
          <div style={{
            fontSize: 'clamp(8rem,20vw,14rem)',
            fontWeight: 900,
            color: '#fff',
            textShadow: '0 8px 32px rgba(0,0,0,0.4)',
            fontFamily: 'Nunito, sans-serif',
            animation: 'countdownPop 0.8s cubic-bezier(.36,.07,.19,.97)',
            lineHeight: 1,
          }}>
            {countdown > 0 ? countdown : '🍳'}
          </div>
        </div>
      )}

      {/* Finishing overlay */}
      {phase === 'finishing' && (
        <div style={OVERLAY_STYLE}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 28, padding: '36px 52px',
            textAlign: 'center', fontFamily: 'Nunito, sans-serif',
            animation: 'popIn 0.5s cubic-bezier(.36,.07,.19,.97) both',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: 8 }}>⏰</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FF6B35' }}>Time's Up!</div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFD700', marginTop: 8 }}>
              {Math.round(scoreRef.current * diffCfg.scoreMultiplier).toLocaleString()} pts
            </div>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {paused && (
        <div style={OVERLAY_STYLE} onClick={togglePause}>
          <div style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 28, padding: '40px 60px', textAlign: 'center',
            fontFamily: 'Nunito, sans-serif',
            animation: 'popIn 0.3s ease both',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: 12 }}>⏸️</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FF6B35', marginBottom: 8 }}>Paused</div>
            <div style={{ color: '#999', fontWeight: 700 }}>Tap anywhere to resume</div>
          </div>
        </div>
      )}
    </div>
  );
};

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(4px)',
};

// Lazy-loaded minigame map — avoids circular imports
import { VegetableChop } from './VegetableChop';
import { StirTheSoup } from './StirTheSoup';
import { PancakeFlip } from './PancakeFlip';
import { CakeDecoration } from './CakeDecoration';
import type { MinigameComponentProps } from './types';

const MINIGAME_COMPONENTS: Record<MinigameType, React.FC<MinigameComponentProps>> = {
  'vegetable-chop': VegetableChop,
  'stir-soup': StirTheSoup,
  'pancake-flip': PancakeFlip,
  'cake-decorate': CakeDecoration,
};
