import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MinigameComponentProps } from './types';
import { DIFFICULTY_SETTINGS } from '../../constants/gameConfig';
import { audioManager } from '../../utils/audio';

type PancakePhase = 'cooking' | 'ready' | 'flipping' | 'landing' | 'done-perfect' | 'done-good' | 'done-miss';

interface PancakeState {
  phase: PancakePhase;
  cookProgress: number;  // 0-1
  flipAngle: number;     // deg for 3D rotation
  index: number;
  totalFlips: number;
}

const TOTAL_PANCAKES = 4;
const COOK_SPEED = 0.008;          // per frame at normal difficulty
const PERFECT_WINDOW = [0.75, 0.9]; // cook progress range for perfect flip
const GOOD_WINDOW = [0.6, 0.95];

export const PancakeFlip: React.FC<MinigameComponentProps> = ({
  difficulty, paused, onScore, onCombo,
}) => {
  const [pancake, setPancake] = useState<PancakeState>({
    phase: 'cooking', cookProgress: 0, flipAngle: 0, index: 0, totalFlips: 0,
  });
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [combo, setComboState] = useState(1);

  const pancakeRef = useRef(pancake);
  pancakeRef.current = pancake;
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const comboRef = useRef(1);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDownRef = useRef({ x: 0, y: 0, t: 0 });

  const cfg = DIFFICULTY_SETTINGS[difficulty];
  const cookSpeed = COOK_SPEED * cfg.speedMultiplier;

  // Cooking loop
  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last; last = now;
      if (!pausedRef.current) {
        setPancake(prev => {
          if (prev.phase !== 'cooking' && prev.phase !== 'ready') return prev;
          const newProg = Math.min(1, prev.cookProgress + cookSpeed * dt);
          const phase = newProg >= PERFECT_WINDOW[0] ? 'ready' : 'cooking';
          return { ...prev, cookProgress: newProg, phase };
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cookSpeed]);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 1200);
  };

  const doFlip = useCallback(() => {
    const p = pancakeRef.current;
    if (p.phase !== 'cooking' && p.phase !== 'ready') return;

    const prog = p.cookProgress;
    let result: 'perfect' | 'good' | 'miss';
    let pts = 0;

    if (prog >= PERFECT_WINDOW[0] && prog <= PERFECT_WINDOW[1]) {
      result = 'perfect'; pts = 50;
      showFeedback('🌟 PERFECT!');
      audioManager.perfectFlip();
      comboRef.current = Math.min(comboRef.current + 1, 5);
    } else if (prog >= GOOD_WINDOW[0] && prog <= GOOD_WINDOW[1]) {
      result = 'good'; pts = 30;
      showFeedback('👍 Good!');
      audioManager.flip();
      comboRef.current = Math.max(1, comboRef.current);
    } else {
      result = 'miss'; pts = 0;
      showFeedback('💨 Miss!');
      audioManager.miss();
      comboRef.current = 1;
    }

    const multiplied = pts * comboRef.current;
    if (pts > 0) onScore(multiplied);
    setComboState(comboRef.current);
    onCombo(comboRef.current);

    const newIndex = p.index + 1;
    const isLast = newIndex >= TOTAL_PANCAKES;

    // Flip animation
    setPancake(prev => ({ ...prev, phase: 'flipping', flipAngle: 0 }));

    let angle = 0;
    const flipLoop = () => {
      angle += 12;
      setPancake(prev => ({ ...prev, flipAngle: angle }));
      if (angle < 360) {
        requestAnimationFrame(flipLoop);
      } else {
        if (isLast) {
          setPancake(prev => ({
            ...prev,
            phase: result === 'perfect' ? 'done-perfect' : result === 'good' ? 'done-good' : 'done-miss',
            flipAngle: 0, index: newIndex,
          }));
        } else {
          // Next pancake
          setTimeout(() => {
            setPancake({ phase: 'cooking', cookProgress: 0, flipAngle: 0, index: newIndex, totalFlips: newIndex });
            comboRef.current = result === 'miss' ? 1 : comboRef.current;
          }, 400);
        }
      }
    };
    requestAnimationFrame(flipLoop);
  }, [onScore, onCombo]);

  // Mouse/touch swipe up detection
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const { y, x } = getPos(e, el);
      lastDownRef.current = { x, y, t: performance.now() };
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      const { y, x } = getPos(e, el);
      const { y: dy, x: dx, t } = lastDownRef.current;
      const dt = performance.now() - t;
      const diffY = dy - y; // positive = upward swipe
      const diffX = Math.abs(x - dx);
      if (dt < 400 && diffY > 40 && diffY > diffX * 1.2) {
        doFlip();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); doFlip(); }
    };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchend', onUp, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchend', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [doFlip]);

  const cookColor = () => {
    const p = pancake.cookProgress;
    if (p < 0.3) return '#FFE0A0';
    if (p < 0.6) return '#FFC050';
    if (p < 0.75) return '#E8A030';
    if (p < 0.9) return '#D4862A';
    return '#8B4513'; // burnt
  };

  const isReady = pancake.phase === 'ready';
  const isFlipping = pancake.phase === 'flipping';

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(160deg, #FFF8E0 0%, #FFE8C0 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Nunito, sans-serif', userSelect: 'none',
        gap: 'clamp(12px,2vw,24px)', position: 'relative', overflow: 'hidden',
        cursor: 'pointer', touchAction: 'none',
      }}
    >
      {/* Pancake counter */}
      <div style={{ display: 'flex', gap: 10, zIndex: 2 }}>
        {Array.from({ length: TOTAL_PANCAKES }, (_, i) => (
          <div key={i} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: i < pancake.index ? '#FFD700' : i === pancake.index ? '#FF6B35' : '#DDD',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', transition: 'all 0.3s ease',
            boxShadow: i === pancake.index ? '0 4px 12px rgba(255,107,53,0.5)' : 'none',
          }}>
            {i < pancake.index ? '✓' : i === pancake.index ? '🍳' : ''}
          </div>
        ))}
      </div>

      {/* Stove + pan */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
        {/* Pan */}
        <div style={{
          position: 'relative',
          width: 'clamp(200px,36vw,280px)',
          height: 'clamp(80px,14vw,110px)',
          marginBottom: 8,
        }}>
          {/* Handle */}
          <div style={{
            position: 'absolute', right: '-28%', top: '30%',
            width: '30%', height: '28%',
            background: '#333', borderRadius: 6,
            boxShadow: '2px 2px 6px rgba(0,0,0,0.3)',
          }} />
          {/* Pan body */}
          <div style={{
            position: 'absolute', left: 0, right: '3%', top: '20%', bottom: 0,
            background: '#666', borderRadius: '8px 8px 40% 40%',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
            border: '3px solid #444',
            overflow: 'hidden',
          }}>
            {/* Pancake */}
            {(pancake.phase === 'cooking' || pancake.phase === 'ready') && !isFlipping && (
              <div style={{
                position: 'absolute', left: '15%', right: '15%', top: '10%', bottom: '10%',
                background: cookColor(),
                borderRadius: '50%',
                transition: 'background 0.3s ease',
                boxShadow: isReady ? `0 0 20px ${cookColor()}80` : '0 2px 8px rgba(0,0,0,0.2)',
                border: isReady ? '3px solid #FFD700' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(1.2rem,3vw,2rem)',
              }}>
                {isReady && '✨'}
              </div>
            )}
            {/* Sizzle effect */}
            {pancake.phase === 'cooking' && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(255,200,100,0.2) 100%)',
                animation: 'sizzle 0.5s ease-in-out infinite',
              }} />
            )}
          </div>
        </div>

        {/* Flipping pancake */}
        {isFlipping && (
          <div style={{
            position: 'absolute', top: '-60px', left: '50%',
            transform: `translateX(-50%) rotateX(${pancake.flipAngle}deg)`,
            fontSize: 'clamp(3rem,7vw,5rem)',
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
            transition: 'none',
          }}>
            🥞
          </div>
        )}

        {/* Stove surface */}
        <div style={{
          width: 'clamp(240px,44vw,340px)', height: 20,
          background: '#555', borderRadius: '4px 4px 0 0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }} />
        <div style={{
          width: 'clamp(280px,50vw,380px)', height: 12,
          background: '#444', borderRadius: 4,
        }} />
      </div>

      {/* Cook progress indicator */}
      {(pancake.phase === 'cooking' || pancake.phase === 'ready') && (
        <div style={{ width: 'clamp(180px,38vw,300px)', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#AA7744', textAlign: 'center' }}>🔥 wait...</div>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#AA7744', flex: 1, textAlign: 'center' }}>{Math.round(pancake.cookProgress * 100)}%</span>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FFD700', textAlign: 'center' }}>⭐ FLIP</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FF4444', textAlign: 'center' }}>🔥 burnt!</div>
          </div>
          <div style={{
            height: 22, background: 'rgba(0,0,0,0.1)', borderRadius: 11,
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              height: '100%',
              width: `${pancake.cookProgress * 100}%`,
              background: pancake.cookProgress < PERFECT_WINDOW[0]
                ? 'linear-gradient(90deg, #FFE0A0, #FFC050)'
                : 'linear-gradient(90deg, #FFD700, #FF9500)',
              borderRadius: 11,
              transition: 'width 0.1s linear, background 0.3s ease',
              boxShadow: isReady ? '0 0 16px rgba(255,215,0,0.8)' : undefined,
            }} />
            {/* Perfect zone marker */}
            <div style={{
              position: 'absolute', top: 0,
              left: `${PERFECT_WINDOW[0] * 100}%`,
              width: `${(PERFECT_WINDOW[1] - PERFECT_WINDOW[0]) * 100}%`,
              height: '100%',
              background: 'rgba(255,215,0,0.35)',
              border: '2px solid rgba(255,215,0,0.8)',
              borderRadius: 2,
              pointerEvents: 'none',
            }} />
          </div>
        </div>
      )}

      {/* Flip prompt — always visible during cooking/ready */}
      {(pancake.phase === 'cooking' || pancake.phase === 'ready') && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 2,
        }}>
          <div style={{
            fontSize: 'clamp(1.6rem,4vw,2.4rem)',
            fontWeight: 900,
            color: isReady ? '#FF6B35' : '#CCA888',
            textAlign: 'center',
            animation: isReady
              ? 'flipPrompt 0.5s ease-in-out infinite alternate'
              : 'flipPrompt 1.2s ease-in-out infinite alternate',
            transition: 'color 0.4s ease',
          }}>
            ⬆️ {isReady ? 'NOW! Flip it!' : 'Swipe up to flip...'}
          </div>
          <div style={{
            fontSize: '0.9rem', fontWeight: 700,
            color: isReady ? '#FF9500' : '#AA7744',
          }}>
            {isReady ? '🌟 Golden! Flip NOW for bonus points!' : '⏳ Wait for it to turn golden...'}
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedbackMsg && (
        <div style={{
          position: 'absolute', top: '20%', left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 900,
          color: feedbackMsg.includes('PERFECT') ? '#FFD700'
            : feedbackMsg.includes('Good') ? '#7BC67E' : '#FF4444',
          textShadow: '0 4px 16px rgba(0,0,0,0.4)',
          animation: 'scorePop 0.4s cubic-bezier(.36,.07,.19,.97) both',
          zIndex: 10, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {feedbackMsg}
        </div>
      )}

      {/* Done state */}
      {(pancake.phase === 'done-perfect' || pancake.phase === 'done-good' || pancake.phase === 'done-miss') && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 5,
          background: 'rgba(255,250,240,0.7)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{ textAlign: 'center', animation: 'popIn 0.5s ease both' }}>
            <div style={{ fontSize: 'clamp(4rem,10vw,7rem)' }}>
              {pancake.phase === 'done-perfect' ? '🥞✨' : pancake.phase === 'done-good' ? '🥞👍' : '🥞😅'}
            </div>
            <div style={{
              fontSize: 'clamp(1.4rem,3.5vw,2.2rem)', fontWeight: 900,
              color: pancake.phase === 'done-perfect' ? '#FFD700' : '#FF6B35',
            }}>
              {pancake.phase === 'done-perfect' ? 'Pancake Master!' : pancake.phase === 'done-good' ? 'Nicely Done!' : 'Better Luck Next Time!'}
            </div>
          </div>
        </div>
      )}

      {/* Combo badge */}
      {combo > 1 && (
        <div style={{
          position: 'absolute', top: '14%', right: '5%',
          background: 'linear-gradient(135deg, #FF6B35, #FFD700)',
          color: '#fff', borderRadius: 16, padding: '8px 18px',
          fontWeight: 900, fontSize: 'clamp(1rem,2.5vw,1.5rem)',
          boxShadow: '0 6px 20px rgba(255,107,53,0.4)',
          animation: 'comboPulse 0.3s ease',
          zIndex: 2,
        }}>
          🔥 ×{combo} COMBO
        </div>
      )}

      <p style={{
        position: 'absolute', bottom: '5%',
        color: '#CCA888', fontSize: '0.85rem', fontWeight: 700,
        textAlign: 'center', zIndex: 2,
      }}>
        ⬆️ Swipe up &nbsp;|&nbsp; 🔑 Space / ↑ Arrow key
      </p>
    </div>
  );
};

function getPos(e: MouseEvent | TouchEvent, el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  if ('touches' in e) {
    const t = e.touches[0] ?? e.changedTouches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
}
