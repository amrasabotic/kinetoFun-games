import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { MinigameComponentProps } from './types';
import { audioManager } from '../../utils/audio';
import { inputManager } from '../../input/InputManager';
import { mouseInputProvider } from '../../input/MouseInputProvider';

interface Bubble { id: number; x: number; y: number; size: number; speed: number; }

export const StirTheSoup: React.FC<MinigameComponentProps> = ({
  difficulty, paused, cameraEnabled, onScore, onCombo,
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
  const stirSoundTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  void difficulty;

  // Add-ingredient phase — auto-advance
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
    const nextBubbleId = { current: 0 };
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

  // Pot centre relative to the container (used for circular tracking)
  const getPotCenter = useCallback(() => {
    const pot = potRef.current;
    const container = containerRef.current;
    if (!pot || !container) return { cx: 0, cy: 0 };
    const potRect = pot.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      cx: potRect.left + potRect.width / 2 - containerRect.left,
      cy: potRect.top + potRect.height / 2 - containerRect.top,
    };
  }, []);

  // ─── Attach input provider + subscribe to STIR gesture ─────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!cameraEnabled) {
      mouseInputProvider.attach(container);
    }
    return () => {
      if (!cameraEnabled) {
        mouseInputProvider.detach();
      }
    };
  }, [cameraEnabled]);

  useEffect(() => {
    if (phase !== 'stir') return;

    // Tell InputManager where the pot is so MouseInputProvider can compute
    // angular deltas relative to it when it detects circular motion.
    const { cx, cy } = getPotCenter();
    inputManager.enableCircularTracking(cx, cy);

    // STIR gesture — emitted by MouseInputProvider on circular motion around cx/cy.
    // CameraInputProvider will emit the same event when implemented.
    const unsubStir = inputManager.on('stir', ({ deltaAngle }) => {
      if (pausedRef.current || progressRef.current >= 1) return;
      setStirring(true);
      const increment = Math.abs(deltaAngle) / (Math.PI * 2) * 0.12;
      const newProg = Math.min(1, progressRef.current + increment);
      progressRef.current = newProg;
      setStirProgress(newProg);

      if (newProg >= 1) {
        setPhase('done');
        onScore(150);
        audioManager.complete();
      }
      if (!stirSoundTimer.current) {
        stirSoundTimer.current = setInterval(() => audioManager.stir(), 200);
      }
    });

    const unsubUp = inputManager.on('drawEnd', () => {
      setStirring(false);
      if (stirSoundTimer.current) { clearInterval(stirSoundTimer.current); stirSoundTimer.current = null; }
    });

    return () => {
      unsubStir();
      unsubUp();
      inputManager.disableCircularTracking();
      if (stirSoundTimer.current) { clearInterval(stirSoundTimer.current); stirSoundTimer.current = null; }
    };
  }, [phase, getPotCenter, onScore]);

  // Bonus score for sustained stirring
  useEffect(() => {
    if (phase !== 'stir') return;
    const t = setInterval(() => {
      if (!pausedRef.current && stirring && progressRef.current < 1) {
        onScore(5);
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
          {/* Soup level */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${40 + stirProgress * 45}%`,
            background: soupColor,
            transition: 'height 0.5s ease, background 0.3s ease',
            borderRadius: '0 0 36% 36%',
          }}>
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

          {/* Floating ingredients */}
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

        {/* Stir indicator ring — always spinning, emoji fades once stirring starts */}
        {phase === 'stir' && (
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: '50%',
            border: '3px dashed rgba(255,107,53,0.6)',
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
