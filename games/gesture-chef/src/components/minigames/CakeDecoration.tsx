import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { MinigameComponentProps } from './types';
import { audioManager } from '../../utils/audio';

interface Decoration {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

interface FrostingPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

const TOOLS = [
  { id: 'strawberry',  emoji: '🍓', label: 'Strawberry',  pts: 15 },
  { id: 'sprinkles',   emoji: '🌈', label: 'Sprinkles',   pts: 5  },
  { id: 'cherry',      emoji: '🍒', label: 'Cherry',      pts: 12 },
  { id: 'star',        emoji: '⭐', label: 'Star',         pts: 20 },
  { id: 'heart',       emoji: '❤️', label: 'Heart',        pts: 18 },
  { id: 'candle',      emoji: '🕯️', label: 'Candle',       pts: 20 },
  { id: 'choco',       emoji: '🍫', label: 'Chocolate',   pts: 10 },
  { id: 'rainbow',     emoji: '🌈', label: 'Rainbow',     pts: 15 },
];

const FROSTING_COLORS = ['#FFB6C1', '#98FB98', '#87CEEB', '#FFD700', '#DDA0DD'];

export const CakeDecoration: React.FC<MinigameComponentProps> = ({
  paused, onScore, onCombo,
}) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(TOOLS[0].id);
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [frostingPaths, setFrostingPaths] = useState<FrostingPath[]>([]);
  const [frostingColor, setFrostingColor] = useState(FROSTING_COLORS[0]);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [combo, setComboState] = useState(1);

  const cakeRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const comboRef = useRef(1);
  const comboTimerRef = useRef(0);
  const decorCountRef = useRef(0);
  const pausedRef = useRef(paused);
  const nextIdRef = useRef(0);
  const nextSparkleId = useRef(0);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Draw frosting on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const path of frostingPaths) {
      if (path.points.length < 2) continue;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        const mid = {
          x: (path.points[i - 1].x + path.points[i].x) / 2,
          y: (path.points[i - 1].y + path.points[i].y) / 2,
        };
        ctx.quadraticCurveTo(path.points[i - 1].x, path.points[i - 1].y, mid.x, mid.y);
      }
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      ctx.restore();
    }
  }, [frostingPaths]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  const addSparkle = (x: number, y: number) => {
    const id = nextSparkleId.current++;
    setSparkles(prev => [...prev, { id, x, y }]);
    setTimeout(() => setSparkles(prev => prev.filter(s => s.id !== id)), 600);
  };

  const placeDecoration = useCallback((clientX: number, clientY: number) => {
    if (pausedRef.current || !selectedTool) return;
    if (selectedTool === 'frosting') return;

    const cake = cakeRef.current;
    if (!cake) return;
    const rect = cake.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Only place within cake bounds
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

    const tool = TOOLS.find(t => t.id === selectedTool);
    if (!tool) return;

    setDecorations(prev => [...prev, {
      id: nextIdRef.current++,
      emoji: tool.emoji,
      x, y,
      size: 32 + Math.random() * 16,
      rotation: (Math.random() - 0.5) * 30,
    }]);

    decorCountRef.current++;
    audioManager.decorate();
    addSparkle(x, y);

    const now = performance.now();
    if (now - comboTimerRef.current < 1500) {
      comboRef.current = Math.min(comboRef.current + 1, 6);
    } else {
      comboRef.current = 1;
    }
    comboTimerRef.current = now;
    setComboState(comboRef.current);
    onCombo(comboRef.current);

    const pts = tool.pts * comboRef.current;
    onScore(pts);
  }, [selectedTool, onScore, onCombo]);

  // Frosting drawing on canvas
  const startFrosting = useCallback((clientX: number, clientY: number) => {
    if (!cakeRef.current || selectedTool !== 'frosting') return;
    const rect = cakeRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    isDrawingRef.current = true;
    // drawing started (tracked via ref)
    currentPathRef.current = [{ x, y }];
  }, [selectedTool]);

  const continueFrosting = useCallback((clientX: number, clientY: number) => {
    if (!isDrawingRef.current || !cakeRef.current) return;
    const rect = cakeRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    currentPathRef.current = [...currentPathRef.current, { x, y }];

    // Draw in-progress on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pts = currentPathRef.current;
    if (pts.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.strokeStyle = frostingColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.restore();

    audioManager.stir();
  }, [frostingColor]);

  const endFrosting = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    // drawing ended (tracked via ref)
    if (currentPathRef.current.length > 2) {
      setFrostingPaths(prev => [...prev, {
        points: currentPathRef.current,
        color: frostingColor,
        width: 14,
      }]);
      onScore(10);
    }
    currentPathRef.current = [];
  }, [frostingColor, onScore]);

  // Cake interaction events
  useEffect(() => {
    const cake = cakeRef.current;
    if (!cake) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (pausedRef.current) return;
      const { x, y } = cPos(e);
      if (selectedTool === 'frosting') startFrosting(x, y);
      else placeDecoration(x, y);
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (pausedRef.current) return;
      const { x, y } = cPos(e);
      if (selectedTool === 'frosting') continueFrosting(x, y);
    };
    const onUp = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      endFrosting();
    };

    cake.addEventListener('mousedown', onDown);
    cake.addEventListener('mousemove', onMove);
    cake.addEventListener('mouseup', onUp);
    cake.addEventListener('mouseleave', onUp);
    cake.addEventListener('touchstart', onDown, { passive: false });
    cake.addEventListener('touchmove', onMove, { passive: false });
    cake.addEventListener('touchend', onUp, { passive: false });
    return () => {
      cake.removeEventListener('mousedown', onDown);
      cake.removeEventListener('mousemove', onMove);
      cake.removeEventListener('mouseup', onUp);
      cake.removeEventListener('mouseleave', onUp);
      cake.removeEventListener('touchstart', onDown);
      cake.removeEventListener('touchmove', onMove);
      cake.removeEventListener('touchend', onUp);
    };
  }, [selectedTool, placeDecoration, startFrosting, continueFrosting, endFrosting]);

  // Resize canvas to match cake element
  useEffect(() => {
    const canvas = canvasRef.current;
    const cake = cakeRef.current;
    if (!canvas || !cake) return;
    const ro = new ResizeObserver(() => {
      canvas.width = cake.offsetWidth;
      canvas.height = cake.offsetHeight;
      redrawCanvas();
    });
    ro.observe(cake);
    canvas.width = cake.offsetWidth;
    canvas.height = cake.offsetHeight;
    return () => ro.disconnect();
  }, [redrawCanvas]);

  const cakeSize = 'clamp(180px, 34vw, 280px)';

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #FFF0F8 0%, #FFE8F8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Nunito, sans-serif', userSelect: 'none',
      overflow: 'hidden', position: 'relative', touchAction: 'none',
    }}>
      {/* Tool palette — left side */}
      <div style={{
        position: 'absolute', left: 'clamp(8px,2vw,20px)',
        top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10,
      }}>
        {/* Frosting tool */}
        <div>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#BB88AA', textAlign: 'center', marginBottom: 4 }}>
            FROSTING
          </div>
          {FROSTING_COLORS.map(color => (
            <button
              key={color}
              onClick={() => { setSelectedTool('frosting'); setFrostingColor(color); audioManager.tick(); }}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: color, border: `3px solid ${selectedTool === 'frosting' && frostingColor === color ? '#333' : 'transparent'}`,
                cursor: 'pointer', margin: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                display: 'block',
              }}
            />
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(0,0,0,0.1)', margin: '4px 0' }} />

        {/* Decoration tools */}
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            title={tool.label}
            onClick={() => { setSelectedTool(tool.id); audioManager.tick(); }}
            style={{
              width: 'clamp(38px,5vw,48px)',
              height: 'clamp(38px,5vw,48px)',
              borderRadius: 12,
              border: `3px solid ${selectedTool === tool.id ? '#FF6B35' : 'rgba(0,0,0,0.1)'}`,
              background: selectedTool === tool.id ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              fontSize: 'clamp(1rem,2.5vw,1.5rem)',
              transform: selectedTool === tool.id ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.15s ease',
              boxShadow: selectedTool === tool.id ? '0 4px 12px rgba(255,107,53,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
              animation: tool.id === TOOLS[0].id && decorations.length === 0
                ? 'toolPulse 1.2s ease-in-out infinite'
                : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {tool.emoji}
          </button>
        ))}
      </div>

      {/* Cake canvas area */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 5,
      }}>
        <div style={{ fontWeight: 800, fontSize: 'clamp(1rem,2vw,1.3rem)', color: '#BB44AA' }}>
          {selectedTool
            ? `${selectedTool === 'frosting'
                ? '🎨 Frosting — drag on the cake!'
                : (TOOLS.find(t => t.id === selectedTool)?.emoji ?? '') + ' ' + (TOOLS.find(t => t.id === selectedTool)?.label ?? '') + ' — click the cake to place!'}`
            : '👆 Pick a tool from the left palette!'}
        </div>

        {/* The cake */}
        <div
          ref={cakeRef}
          style={{
            position: 'relative',
            width: cakeSize,
            height: cakeSize,
            cursor: selectedTool ? (selectedTool === 'frosting' ? 'crosshair' : 'cell') : 'default',
          }}
        >
          {/* Cake layers */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            borderRadius: 16, overflow: 'hidden',
          }}>
            {/* Bottom layer — cake body */}
            <div style={{
              width: '100%', height: '70%',
              background: 'linear-gradient(180deg, #F5C77E 0%, #E8A050 100%)',
              borderRadius: '0 0 16px 16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              position: 'relative',
            }}>
              {/* Horizontal layer lines */}
              {[33, 66].map(pct => (
                <div key={pct} style={{
                  position: 'absolute', top: `${pct}%`,
                  left: 0, right: 0, height: 3,
                  background: 'rgba(120,60,0,0.2)',
                }} />
              ))}
            </div>
            {/* White frosting top */}
            <div style={{
              position: 'absolute', top: '28%', left: 0, right: 0,
              height: '8%',
              background: 'linear-gradient(180deg, #fff 0%, #f8e8e8 100%)',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            }} />
          </div>

          {/* Frosting canvas layer */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute', inset: 0,
              pointerEvents: 'none',
              borderRadius: 16,
            }}
          />

          {/* Placed decorations */}
          {decorations.map(d => (
            <div key={d.id} style={{
              position: 'absolute',
              left: d.x - d.size / 2,
              top: d.y - d.size / 2,
              fontSize: d.size,
              lineHeight: 1,
              transform: `rotate(${d.rotation}deg)`,
              pointerEvents: 'none',
              animation: 'decorPop 0.3s cubic-bezier(.36,.07,.19,.97) both',
              filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))',
            }}>
              {d.emoji}
            </div>
          ))}

          {/* Sparkle effects */}
          {sparkles.map(s => (
            <div key={s.id} style={{
              position: 'absolute', left: s.x - 16, top: s.y - 16,
              fontSize: '1.8rem', pointerEvents: 'none',
              animation: 'sparkleOut 0.6s ease-out both',
            }}>
              ✨
            </div>
          ))}
        </div>

        {/* Decoration count */}
        <div style={{
          fontWeight: 800, fontSize: '0.9rem', color: '#BB44AA',
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <span>🎂 {decorations.length} decoration{decorations.length !== 1 ? 's' : ''}</span>
          {combo > 1 && (
            <span style={{
              background: 'linear-gradient(135deg, #FF6B9D, #FF6B35)',
              color: '#fff', borderRadius: 12, padding: '3px 12px',
              animation: 'comboPulse 0.3s ease',
            }}>
              ×{combo} COMBO
            </span>
          )}
        </div>
      </div>

      {/* Clear button */}
      <button
        onClick={() => {
          setDecorations([]);
          setFrostingPaths([]);
          const canvas = canvasRef.current;
          if (canvas) canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
        }}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.9)', border: '2px solid #FF4444',
          borderRadius: 12, padding: '6px 14px', cursor: 'pointer',
          fontFamily: 'Nunito, sans-serif', fontWeight: 700,
          color: '#FF4444', fontSize: '0.85rem', zIndex: 10,
        }}
      >
        🗑️ Clear
      </button>
    </div>
  );
};

function cPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e) {
    const t = e.touches[0] ?? e.changedTouches[0];
    return { x: t.clientX, y: t.clientY };
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
}
