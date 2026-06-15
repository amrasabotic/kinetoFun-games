import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { MinigameComponentProps } from './types';
import { audioManager } from '../../utils/audio';
import { inputManager } from '../../input/InputManager';
import { mouseInputProvider } from '../../input/MouseInputProvider';

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
  paused, cameraEnabled, onScore, onCombo,
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
  const pausedRef = useRef(paused);
  const nextIdRef = useRef(0);
  const nextSparkleId = useRef(0);
  // Track selectedTool in a ref so gesture callbacks always have current value
  const selectedToolRef = useRef(selectedTool);
  const frostingColorRef = useRef(frostingColor);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { selectedToolRef.current = selectedTool; }, [selectedTool]);
  useEffect(() => { frostingColorRef.current = frostingColor; }, [frostingColor]);

  // Redraw frosting paths on canvas
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

  // ─── Gameplay actions — all coordinates are element-relative ───────────────
  // (MouseInputProvider computes them relative to the attached cakeRef element)

  const placeDecoration = useCallback((x: number, y: number) => {
    if (pausedRef.current) return;
    const tool = selectedToolRef.current;
    if (!tool || tool === 'frosting') return;

    const cake = cakeRef.current;
    if (!cake) return;
    if (x < 0 || y < 0 || x > cake.offsetWidth || y > cake.offsetHeight) return;

    const toolDef = TOOLS.find(t => t.id === tool);
    if (!toolDef) return;

    setDecorations(prev => [...prev, {
      id: nextIdRef.current++,
      emoji: toolDef.emoji,
      x, y,
      size: 32 + Math.random() * 16,
      rotation: (Math.random() - 0.5) * 30,
    }]);

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

    const pts = toolDef.pts * comboRef.current;
    onScore(pts);
  }, [onScore, onCombo]);

  const startFrosting = useCallback((x: number, y: number) => {
    if (selectedToolRef.current !== 'frosting') return;
    const cake = cakeRef.current;
    if (!cake) return;
    if (x < 0 || y < 0 || x > cake.offsetWidth || y > cake.offsetHeight) return;
    isDrawingRef.current = true;
    currentPathRef.current = [{ x, y }];
  }, []);

  const continueFrosting = useCallback((x: number, y: number) => {
    if (!isDrawingRef.current) return;
    currentPathRef.current = [...currentPathRef.current, { x, y }];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pts = currentPathRef.current;
    if (pts.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.strokeStyle = frostingColorRef.current;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.restore();

    audioManager.stir();
  }, []);

  const endFrosting = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentPathRef.current.length > 2) {
      setFrostingPaths(prev => [...prev, {
        points: currentPathRef.current,
        color: frostingColorRef.current,
        width: 14,
      }]);
      onScore(10);
    }
    currentPathRef.current = [];
  }, [onScore]);

  // ─── Attach input provider + subscribe to cooking gesture events ────────────
  useEffect(() => {
    const cake = cakeRef.current;
    if (!cake) return;

    if (!cameraEnabled) {
      mouseInputProvider.attach(cake);
    }
    return () => {
      if (!cameraEnabled) {
        mouseInputProvider.detach();
      }
    };
  }, [cameraEnabled]);

  useEffect(() => {
    // PLACE gesture — quick tap/click on the cake → place a decoration
    const unsubPlace = inputManager.on('place', ({ x, y }) => {
      placeDecoration(x, y);
    });

    // DRAW* gestures — frosting strokes
    const unsubDrawStart = inputManager.on('drawStart', ({ x, y }) => {
      startFrosting(x, y);
    });
    const unsubDraw = inputManager.on('draw', ({ x, y }) => {
      continueFrosting(x, y);
    });
    const unsubDrawEnd = inputManager.on('drawEnd', () => {
      endFrosting();
    });

    return () => {
      unsubPlace(); unsubDrawStart(); unsubDraw(); unsubDrawEnd();
    };
  }, [placeDecoration, startFrosting, continueFrosting, endFrosting]);

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
        {/* Frosting color swatches */}
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
                background: color,
                border: `3px solid ${selectedTool === 'frosting' && frostingColor === color ? '#333' : 'transparent'}`,
                cursor: 'pointer', margin: 2,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
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
              boxShadow: selectedTool === tool.id
                ? '0 4px 12px rgba(255,107,53,0.3)'
                : '0 2px 6px rgba(0,0,0,0.1)',
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 5 }}>
        <div style={{ fontWeight: 800, fontSize: 'clamp(1rem,2vw,1.3rem)', color: '#BB44AA' }}>
          {selectedTool
            ? `${selectedTool === 'frosting'
                ? '🎨 Frosting — drag on the cake!'
                : (TOOLS.find(t => t.id === selectedTool)?.emoji ?? '') + ' ' +
                  (TOOLS.find(t => t.id === selectedTool)?.label ?? '') +
                  ' — click the cake to place!'}`
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
            <div style={{
              width: '100%', height: '70%',
              background: 'linear-gradient(180deg, #F5C77E 0%, #E8A050 100%)',
              borderRadius: '0 0 16px 16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              position: 'relative',
            }}>
              {[33, 66].map(pct => (
                <div key={pct} style={{
                  position: 'absolute', top: `${pct}%`,
                  left: 0, right: 0, height: 3,
                  background: 'rgba(120,60,0,0.2)',
                }} />
              ))}
            </div>
            <div style={{
              position: 'absolute', top: '28%', left: 0, right: 0, height: '8%',
              background: 'linear-gradient(180deg, #fff 0%, #f8e8e8 100%)',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            }} />
          </div>

          {/* Frosting canvas */}
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16 }}
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

        {/* Decoration count + combo */}
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
