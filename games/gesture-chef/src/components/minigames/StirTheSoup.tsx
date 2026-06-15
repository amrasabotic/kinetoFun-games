import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { MinigameComponentProps } from './types';
// DIFFICULTY_SETTINGS available for future speed scaling via MediaPipe provider
import { distance, angleDelta } from '../../utils/mathUtils';
import { audioManager } from '../../utils/audio';

interface Bubble { id: number; x: number; y: number; size: number; speed: number; }

export const StirTheSoup: React.FC<MinigameComponentProps> = ({
  difficulty, paused, onScore, onCombo,
}) => {
  const [stirProgress, setStirProgress] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [stirring, setStirring] = useState(false);
  const [phase, setPhase] = useState<'add-ingredients' | 'stir' | 'done'>('add-ingredients');
  const [addedItems, setAddedItems] = useState<number[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const potRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const comboRef = useRef(1);
  const isDownRef = useRef(false);
  const lastAngleRef = useRef(0);
  const totalRotRef = useRef(0);
  const nextBubbleId = useRef(0);
  const stirSoundTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  void difficulty;

  // Add-ingredient phase auto-advance
  useEffect(() => {
    if (phase !== 'add-ingredients') return;
    const items = [0, 1, 2, 3];
    let i = 0;
    const t = setInterval(() => {
      if (i >= items.length) { clearInterval(t); setTimeout(() => setPhase('stir'), 600); return; }
      setAddedItems(prev => [...prev, items[i]]);
      audioManager.bubble();
      i++;
    }, 700);
    return () => clearInterval(t);
  }, [phase]);

  // Bubble spawning
  useEffect(() => {
    if (phase !== 'stir') return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
      const rate = 0.3 + progressRef.current * 0.7;
      if (Math.random() < rate) {
        setBubbles(prev => [
          ...prev.filter(b => b.y > -30).slice(-12),
          {
            id: nextBubbleId.current++,
            x: 40 + Math.random() * 60,
            y: 100 + Math.random() * 20,
            size: 8 + Math.random() * 14,
            speed: 0.4 + Math.random() * 0.6,
          },
        ]);
        if (Math.random() < 0.3) audioManager.bubble();
      }
    }, 180);
    return () => clearInterval(t);
  }, [phase]);

  // Animate bubbles upward
  useEffect(() => {
    const t = setInterval(() => {
      setBubbles(prev => prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -20));
    }, 50);
    return () => clearInterval(t);
  }, []);

  // Mouse circular motion detection
  const getPotCenter = useCallback(() => {
    const pot = potRef.current;
    if (!pot) return { cx: 0, cy: 0 };
    const rect = pot.getBoundingClientRect();
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  }, []);

  useEffect(() => {
    if (phase !== 'stir') return;
    const el = containerRef.current;
    if (!el) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      if (pausedRef.current) return;
      isDownRef.current = true;
      const { cx, cy } = getPotCenter();
      const { x, y } = getClientPos(e);
      lastAngleRef.current = Math.atan2(y - cy, x - cx);
      totalRotRef.current = 0;
    };

    const onUp = () => {
      isDownRef.current = false;
      setStirring(false);
      if (stirSoundTimer.current) { clearInterval(stirSoundTimer.current); stirSoundTimer.current = null; }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDownRef.current || pausedRef.current) return;
      const { cx, cy } = getPotCenter();
      const { x, y } = getClientPos(e);
      const dist = distance(x, y, cx, cy);
      if (dist < 30) return; // too close to center, ignore
      const ang = Math.atan2(y - cy, x - cx);
      const delta = angleDelta(lastAngleRef.current, ang);
      lastAngleRef.current = ang;
      totalRotRef.current += Math.abs(delta);

      if (Math.abs(delta) > 0.02) {
        setStirring(true);
        const increment = Math.abs(delta) / (Math.PI * 2) * 0.12;
        progressRef.current = Math.min(1, progressRef.current + increment);
        setStirProgress(progressRef.current);

        if (progressRef.current >= 1 && phase === 'stir') {
          setPhase('done');
          onScore(150);
          audioManager.complete();
        }
        if (!stirSoundTimer.current) {
          stirSoundTimer.current = setInterval(() => audioManager.stir(), 200);
        }
      }
    };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchend', onUp);
    el.addEventListener('touchmove', onMove, { passive: true });

    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchend', onUp);
      el.removeEventListener('touchmove', onMove);
      if (stirSoundTimer.current) clearInterval(stirSoundTimer.current);
    };
  }, [phase, getPotCenter, onScore]);

  // Bonus score for perfect stirring speed
  useEffect(() => {
    if (phase !== 'stir') return;
    const pts = 5;
    const t = setInterval(() => {
      if (!pausedRef.current && stirring && progressRef.current < 1) {
        onScore(pts);
        comboRef.current = Math.min(comboRef.current + 1, 4);
        onCombo(comboRef.current);
      }
    }, 400);
    return () => clearInterval(t);
  }, [phase, stirring, onScore, onCombo]);

  const soupColor = `hsl(${20 + stirProgress * 20}, 80%, ${45 + stirProgress * 10}%)`;

  const INGREDIENTS = ['🥕', '🥦', '🧅', '🍄'];

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(160deg, #FFF8E0 0%, #FFE8C0 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(12px,2vw,24px)',
        fontFamily: 'Nunito, sans-serif',
        userSelect: 'none', cursor: phase === 'stir' ? 'crosshair' : 'default',
        overflow: 'hidden', position: 'relative',
        touchAction: 'none',
      }}
    >
      {/* Steam particles */}
      {phase === 'stir' && (
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              position: 'absolute',
              left: `${(i - 1.5) * 30}px`,
              width: 16, height: 50,
              background: 'rgba(255,255,255,0.5)',
              borderRadius: 10,
              animation: `steamRise ${1.5 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
              filter: 'blur(4px)',
            }} />
          ))}
        </div>
      )}

      {/* Phase label */}
      <div style={{
        fontSize: 'clamp(1.2rem,2.8vw,1.8rem)', fontWeight: 900,
        color: '#AA7744', textAlign: 'center', zIndex: 2,
      }}>
        {phase === 'add-ingredients' && '🍽️ Adding ingredients...'}
        {phase === 'stir' && (
          <span>
            {stirring ? '🌀 Keep stirring!' : '↩️ Hold & drag in circles around the pot!'}
          </span>
        )}
        {phase === 'done' && '✅ Perfect soup!'}
      </div>

      {/* The pot */}
      <div ref={potRef} style={{
        position: 'relative',
        width: 'clamp(200px,35vw,300px)',
        height: 'clamp(160px,28vw,240px)',
        zIndex: 2,
      }}>
        {/* Pot body */}
        <div style={{
          position: 'absolute', bottom: 0, left: '10%',
          width: '80%', height: '85%',
          background: '#444', borderRadius: '8px 8px 40% 40%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          border: '4px solid #333',
        }}>
          {/* Soup */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${40 + stirProgress * 45}%`,
            background: soupColor,
            transition: 'height 0.5s ease, background 0.3s ease',
            borderRadius: '0 0 36% 36%',
          }}>
            {/* Bubbles */}
            {bubbles.map(b => (
              <div key={b.id} style={{
                position: 'absolute',
                left: `${b.x}%`,
                bottom: `${b.y}%`,
                width: b.size, height: b.size,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.6)',
                pointerEvents: 'none',
              }} />
            ))}
          </div>

          {/* Floating ingredient emojis in soup */}
          {addedItems.map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${15 + i * 18}%`, bottom: '25%',
              fontSize: 'clamp(1rem,2.5vw,1.6rem)',
              animation: 'ingredientFloat 2s ease-in-out infinite',
              animationDelay: `${i * 0.5}s`,
              zIndex: 3,
            }}>
              {INGREDIENTS[i]}
            </div>
          ))}
        </div>

        {/* Handles */}
        {[-1, 1].map(side => (
          <div key={side} style={{
            position: 'absolute',
            top: '30%',
            left: side === -1 ? '-12%' : 'auto',
            right: side === 1 ? '-12%' : 'auto',
            width: '15%', height: '30%',
            background: '#333', borderRadius: 6,
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          }} />
        ))}

        {/* Stir indicator ring */}
        {phase === 'stir' && (
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: '50%',
            border: `3px dashed rgba(255,107,53,0.6)`,
            animation: 'rotateSlow 1.5s linear infinite',
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 'clamp(1.4rem,3vw,2rem)',
              opacity: stirring ? 0 : 0.75,
              transition: 'opacity 0.5s ease',
              pointerEvents: 'none',
            }}>
              🔄
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {phase === 'stir' && (
        <div style={{ width: 'clamp(180px,40vw,320px)', zIndex: 2 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: 6, fontWeight: 800, fontSize: '0.9rem', color: '#AA7744',
          }}>
            <span>Stirring Progress</span>
            <span>{Math.round(stirProgress * 100)}%</span>
          </div>
          <div style={{
            height: 22, background: 'rgba(0,0,0,0.12)',
            borderRadius: 11, overflow: 'hidden',
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              width: `${stirProgress * 100}%`, height: '100%',
              background: 'linear-gradient(90deg, #FF9F1C, #FF6B35)',
              borderRadius: 11,
              transition: 'width 0.2s ease',
              boxShadow: stirring ? '0 0 14px rgba(255,107,53,0.7)' : undefined,
            }} />
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{
          fontSize: 'clamp(3rem,8vw,5rem)',
          animation: 'popIn 0.6s cubic-bezier(.36,.07,.19,.97) both',
        }}>
          🍲✨
        </div>
      )}

      {phase === 'stir' && !stirring && (
        <p style={{
          position: 'absolute', bottom: '5%',
          color: '#CCA888', fontSize: '0.9rem', fontWeight: 700,
          textAlign: 'center', zIndex: 2, margin: 0,
        }}>
          🖱️ Click &amp; hold, then move in a circle &nbsp;·&nbsp; 📱 Touch &amp; drag
        </p>
      )}
    </div>
  );
};

function getClientPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e) {
    const t = e.touches[0] ?? e.changedTouches[0];
    return { x: t.clientX, y: t.clientY };
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
}
