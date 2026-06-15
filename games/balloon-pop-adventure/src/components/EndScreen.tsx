import React, { useEffect, useRef } from 'react';
import type { GameMode, Scores } from '../game/types';
import { PLAYER_COLORS, PLAYER_NAMES } from '../constants/gameConfig';

interface EndScreenProps {
  scores:      Scores;
  mode:        GameMode;
  playerCount: 1 | 2;
  winner:      'p1' | 'p2' | 'tie' | null;
  isNewRecord: boolean;
  highScore:   number | null;
  onPlayAgain: () => void;
  onMenu:      () => void;
}

export function EndScreen({
  scores, mode, playerCount, winner, isNewRecord, highScore, onPlayAgain, onMenu,
}: EndScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = Array.from({ length: 80 }, () => makeConfetti(canvas.width, canvas.height));
    let lastT = performance.now();

    function tick(now: number) {
      if (!canvas || !ctx) return;
      const dt = (now - lastT) / 1000;
      lastT = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x  += p.vx * dt;
        p.y  += p.vy * dt;
        p.vy += 200 * dt;
        p.rotation += p.rs * dt;
        p.opacity  -= 0.12 * dt;

        if (p.y > canvas.height + 20 || p.opacity <= 0) {
          p.x       = Math.random() * canvas.width;
          p.y       = -20;
          p.vy      = Math.random() * 150 + 80;
          p.opacity = 1;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const isParty = playerCount === 2;

  const headline =
    winner === 'tie' ? "It's a Tie! 🤝" :
    isParty           ? `${PLAYER_NAMES[winner === 'p1' ? 1 : 2]} Wins! 🎉` :
                        'Game Over! 🎊';

  return (
    <div style={{
      position:       'absolute',
      inset:          0,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      zIndex:         20,
      padding:        'clamp(16px, 3vw, 40px)',
      overflow:       'hidden',
    }}>
      {/* Confetti */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '800px' }}>
        {/* Headline */}
        <div style={{
          fontSize:   'clamp(2rem, 6vw, 4.5rem)',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #FFD700, #FF6B35)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor:  'transparent',
          backgroundClip: 'text',
          marginBottom: 'clamp(4px, 1vh, 12px)',
          filter:     'drop-shadow(0 2px 12px rgba(255,180,0,0.5))',
        }}>
          {headline}
        </div>

        {isNewRecord && (
          <div style={{
            display:      'inline-block',
            background:   'linear-gradient(135deg, #FFD700, #FF8C00)',
            color:        '#000',
            fontWeight:   '900',
            fontSize:     'clamp(0.8rem, 2vw, 1.1rem)',
            letterSpacing: '3px',
            padding:      '6px clamp(16px, 3vw, 28px)',
            borderRadius: '30px',
            marginBottom: 'clamp(10px, 2.5vh, 24px)',
          }}>
            🏆 NEW HIGH SCORE!
          </div>
        )}

        {/* Scores */}
        <div style={{
          display:        'flex',
          gap:            'clamp(12px, 3vw, 32px)',
          justifyContent: 'center',
          margin:         'clamp(10px, 2.5vh, 24px) 0',
          flexWrap:       'wrap',
        }}>
          {isParty ? (
            <>
              <BigScore label={PLAYER_NAMES[1]} score={scores.p1} color={PLAYER_COLORS[1]} isWinner={winner === 'p1'} />
              <BigScore label={PLAYER_NAMES[2]} score={scores.p2} color={PLAYER_COLORS[2]} isWinner={winner === 'p2'} />
            </>
          ) : (
            <BigScore label="Your Score" score={scores.p1} color="#FFD700" isWinner />
          )}
        </div>

        {highScore !== null && !isNewRecord && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', marginBottom: 'clamp(10px, 2vh, 20px)' }}>
            Best: {highScore}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 'clamp(10px, 2vw, 20px)', justifyContent: 'center', flexWrap: 'wrap', marginTop: 'clamp(8px, 2vh, 20px)' }}>
          <ActionBtn label="🔄 Play Again" gradient="linear-gradient(135deg, #4ECDC4, #2196F3)" glow="rgba(78,205,196,0.5)" onClick={onPlayAgain} />
          <ActionBtn label="🏠 Main Menu" outline onClick={onMenu} />
        </div>
      </div>
    </div>
  );
}

function BigScore({ label, score, color, isWinner }: { label: string; score: number; color: string; isWinner: boolean }) {
  return (
    <div style={{
      padding:      'clamp(16px, 3vw, 28px) clamp(24px, 5vw, 48px)',
      background:   isWinner ? `${color}18` : 'rgba(255,255,255,0.06)',
      borderRadius: '20px',
      border:       `2px solid ${isWinner ? color : 'rgba(255,255,255,0.12)'}`,
      textAlign:    'center',
      minWidth:     'clamp(120px, 20vw, 200px)',
      boxShadow:    isWinner ? `0 0 30px ${color}40` : 'none',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(0.8rem, 1.8vw, 1rem)', letterSpacing: '2px', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{
        fontSize:   'clamp(2.5rem, 7vw, 5rem)',
        fontWeight: '900',
        color:      isWinner ? color : '#FFFFFF',
        textShadow: isWinner ? `0 0 20px ${color}80` : 'none',
        lineHeight: 1,
      }}>
        {score}
      </div>
      {isWinner && <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', marginTop: '4px' }}>👑</div>}
    </div>
  );
}

function ActionBtn({ label, gradient, glow, onClick, outline = false }: {
  label: string; gradient?: string; glow?: string; onClick: () => void; outline?: boolean;
}) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      style={{
        padding:      'clamp(14px, 2.5vh, 20px) clamp(24px, 5vw, 56px)',
        fontSize:     'clamp(1rem, 2.5vw, 1.5rem)',
        fontWeight:   'bold',
        letterSpacing: '2px',
        borderRadius: '16px',
        border:       outline ? '2px solid rgba(255,255,255,0.3)' : 'none',
        background:   outline ? 'rgba(255,255,255,0.08)' : gradient,
        color:        '#FFFFFF',
        cursor:       'pointer',
        minWidth:     'clamp(160px, 25vw, 240px)',
        boxShadow:    outline ? 'none' : `0 6px 24px ${glow}`,
        transition:   'transform 0.15s',
        transform:    hov ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

interface ConfettiParticle { x: number; y: number; vx: number; vy: number; w: number; h: number; color: string; rotation: number; rs: number; opacity: number; }

function makeConfetti(w: number, h: number): ConfettiParticle {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#A8E063'];
  return {
    x: Math.random() * w, y: Math.random() * h - h,
    vx: (Math.random() - 0.5) * 80, vy: Math.random() * 150 + 80,
    w: Math.random() * 10 + 6, h: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * Math.PI * 2, rs: (Math.random() - 0.5) * 6, opacity: 1,
  };
}
