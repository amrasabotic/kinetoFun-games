// ============================================================
// CANVAS RENDERER — Layer 4 component
// Pure renderer. Zero logic. Draws what it is told.
// Inputs: strokes, currentStroke, gesture, guideShapes, colorWheel
// ============================================================

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import type { Stroke, Point, GestureState, GuideShape, BrushType } from "../types";

export interface RendererHandle {
  clearCanvas(): void;
  exportPNG(): string;
}

interface Props {
  strokes: Stroke[];
  currentStroke: Point[];
  gesture: GestureState;
  currentColor: string;
  currentSize: number;
  currentBrush: BrushType;
  guideShapes?: GuideShape[];
  showColorWheel: boolean;
  colorWheelX: number;
  colorWheelY: number;
  onColorPicked?: (color: string) => void;
  width: number;
  height: number;
}

// ── Brush rendering functions ──────────────────────────────

function pathFromPoints(ctx: CanvasRenderingContext2D, pts: Point[]): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
}

function drawBasicStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  if (s.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = s.opacity;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  pathFromPoints(ctx, s.points);
  ctx.stroke();
  ctx.restore();
}

function drawSmoothStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  if (s.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = s.opacity * 0.9;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size * 1.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = s.color;
  ctx.shadowBlur = s.size * 0.5;
  pathFromPoints(ctx, s.points);
  ctx.stroke();
  ctx.restore();
}

function drawGradientStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  if (s.points.length < 2) return;
  const first = s.points[0];
  const last = s.points[s.points.length - 1];
  const grad = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
  grad.addColorStop(0, s.color);
  grad.addColorStop(0.5, shiftHue(s.color, 40));
  grad.addColorStop(1, shiftHue(s.color, 80));

  ctx.save();
  ctx.globalAlpha = s.opacity;
  ctx.strokeStyle = grad;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  pathFromPoints(ctx, s.points);
  ctx.stroke();
  ctx.restore();
}

function drawNeonStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  if (s.points.length < 2) return;
  ctx.save();

  const passes = [
    { width: s.size * 3, alpha: 0.15, blur: s.size * 4 },
    { width: s.size * 1.5, alpha: 0.4, blur: s.size * 2 },
    { width: s.size * 0.6, alpha: 1.0, blur: 0 },
  ];

  for (const p of passes) {
    ctx.globalAlpha = p.alpha * s.opacity;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = p.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = s.color;
    ctx.shadowBlur = p.blur;
    pathFromPoints(ctx, s.points);
    ctx.stroke();
  }

  // White core
  ctx.globalAlpha = 0.9 * s.opacity;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = s.size * 0.25;
  ctx.shadowBlur = 0;
  pathFromPoints(ctx, s.points);
  ctx.stroke();

  ctx.restore();
}

function drawParticleStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  ctx.save();
  const rng = seededRng(s.timestamp);
  for (const pt of s.points) {
    const count = Math.floor(s.size / 2) + 3;
    for (let i = 0; i < count; i++) {
      const ox = (rng() - 0.5) * s.size * 2.5;
      const oy = (rng() - 0.5) * s.size * 2.5;
      const r  = rng() * s.size * 0.45 + 0.8;
      ctx.globalAlpha = (rng() * 0.6 + 0.3) * s.opacity;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(pt.x + ox, pt.y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function shiftHue(hex: string, degrees: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return `hsl(${(h + degrees) % 360},${s}%,${l}%)`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// ── Guide shape rendering ──────────────────────────────────

function drawGuides(ctx: CanvasRenderingContext2D, shapes: GuideShape[], w: number, h: number): void {
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;

  for (const shape of shapes) {
    const cx = shape.x * w, cy = shape.y * h;
    const r  = shape.size * Math.min(w, h) * 0.5;

    switch (shape.type) {
      case "circle":
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case "triangle": {
        const a = r;
        ctx.beginPath();
        ctx.moveTo(cx, cy - a);
        ctx.lineTo(cx + a * Math.sin(Math.PI * 2 / 3), cy - a * Math.cos(Math.PI * 2 / 3));
        ctx.lineTo(cx + a * Math.sin(Math.PI * 4 / 3), cy - a * Math.cos(Math.PI * 4 / 3));
        ctx.closePath();
        ctx.stroke();
        break;
      }

      case "star": {
        const pts = shape.params?.points ?? 5;
        const outerR = r, innerR = r * 0.42;
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
          const angle = (i * Math.PI) / pts - Math.PI / 2;
          const rad   = i % 2 === 0 ? outerR : innerR;
          i === 0
            ? ctx.moveTo(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle))
            : ctx.lineTo(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
        }
        ctx.closePath();
        ctx.stroke();
        break;
      }

      case "tree": {
        const tw = r * 0.22, th = r * 0.55;
        // Trunk
        ctx.strokeRect(cx - tw / 2, cy + th * 0.2, tw, th * 0.8);
        // Canopy (triangle)
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.9);
        ctx.lineTo(cx - r * 0.7, cy + th * 0.2);
        ctx.lineTo(cx + r * 0.7, cy + th * 0.2);
        ctx.closePath();
        ctx.stroke();
        break;
      }

      case "flower": {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const px = cx + r * 0.55 * Math.cos(a), py = cy + r * 0.55 * Math.sin(a);
          ctx.beginPath();
          ctx.arc(px, py, r * 0.32, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case "cloud": {
        const cloudParts = [
          [0, 0, r * 0.45],
          [-r * 0.38, r * 0.12, r * 0.32],
          [r * 0.38, r * 0.12, r * 0.32],
          [-r * 0.18, -r * 0.22, r * 0.28],
          [r * 0.18, -r * 0.22, r * 0.28],
        ];
        for (const [dx, dy, cr] of cloudParts) {
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dy, cr, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      case "house": {
        const hw = r * 0.9, hh = r * 0.7;
        // Walls
        ctx.strokeRect(cx - hw / 2, cy - hh * 0.2, hw, hh);
        // Roof
        ctx.beginPath();
        ctx.moveTo(cx - hw / 2 - 5, cy - hh * 0.2);
        ctx.lineTo(cx, cy - r * 0.9);
        ctx.lineTo(cx + hw / 2 + 5, cy - hh * 0.2);
        ctx.stroke();
        // Door
        ctx.strokeRect(cx - hw * 0.12, cy + hh * 0.3, hw * 0.24, hh * 0.48);
        // Window
        ctx.strokeRect(cx - hw * 0.37, cy - hh * 0.05, hw * 0.22, hh * 0.24);
        ctx.strokeRect(cx + hw * 0.15, cy - hh * 0.05, hw * 0.22, hh * 0.24);
        break;
      }

      case "car": {
        const cw = r * 1.3, ch = r * 0.5;
        // Body
        ctx.strokeRect(cx - cw / 2, cy - ch * 0.4, cw, ch);
        // Roof
        ctx.beginPath();
        ctx.moveTo(cx - cw * 0.25, cy - ch * 0.4);
        ctx.lineTo(cx - cw * 0.15, cy - ch * 1.0);
        ctx.lineTo(cx + cw * 0.15, cy - ch * 1.0);
        ctx.lineTo(cx + cw * 0.25, cy - ch * 0.4);
        ctx.stroke();
        // Wheels
        ctx.beginPath(); ctx.arc(cx - cw * 0.3, cy + ch * 0.6, ch * 0.4, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + cw * 0.3, cy + ch * 0.6, ch * 0.4, 0, Math.PI * 2); ctx.stroke();
        break;
      }
    }
  }

  ctx.setLineDash([]);
  ctx.restore();
}

// ── Color Wheel ───────────────────────────────────────────

function drawColorWheel(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  highlightAngle: number
): void {
  const SEG = 360;
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / SEG) * Math.PI * 2 - Math.PI / 2;
    const hue = i;
    const innerR = radius * 0.28;
    const gradient = ctx.createRadialGradient(cx, cy, innerR, cx, cy, radius);
    gradient.addColorStop(0, `hsla(${hue},20%,90%,0.95)`);
    gradient.addColorStop(1, `hsla(${hue},100%,50%,0.95)`);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, a0, a1);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // White fade in center
  const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.28);
  centerGrad.addColorStop(0, "rgba(255,255,255,1)");
  centerGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = centerGrad;
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Selector indicator
  if (!isNaN(highlightAngle)) {
    const sx = cx + Math.cos(highlightAngle - Math.PI / 2) * radius * 0.75;
    const sy = cy + Math.sin(highlightAngle - Math.PI / 2) * radius * 0.75;
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// ── Main component ────────────────────────────────────────

export const CanvasRenderer = forwardRef<RendererHandle, Props>(({
  strokes, currentStroke, gesture, currentColor, currentSize, currentBrush,
  guideShapes, showColorWheel, colorWheelX, colorWheelY, onColorPicked, width, height,
}, ref) => {
  const strokeCanvasRef  = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef  = useRef<HTMLCanvasElement>(null);
  const colorWheelRef    = useRef<HTMLCanvasElement>(null);

  // Expose imperative handles
  useImperativeHandle(ref, () => ({
    clearCanvas() {
      const ctx = strokeCanvasRef.current?.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, width, height);
    },
    exportPNG() {
      const merged = document.createElement("canvas");
      merged.width = width; merged.height = height;
      const ctx = merged.getContext("2d")!;
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, width, height);
      if (strokeCanvasRef.current) ctx.drawImage(strokeCanvasRef.current, 0, 0);
      return merged.toDataURL("image/png");
    },
  }));

  // Redraw strokes when list changes
  useEffect(() => {
    const canvas = strokeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    if (guideShapes?.length) drawGuides(ctx, guideShapes, width, height);
    for (const stroke of strokes) renderStroke(ctx, stroke);
  }, [strokes, guideShapes, width, height]);

  // Draw live cursor + current stroke every render
  useEffect(() => {
    const canvas = cursorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    // Current in-progress stroke
    if (currentStroke.length > 1) {
      renderStroke(ctx, {
        id: "live",
        points: currentStroke,
        color: currentColor,
        size: currentSize,
        brushType: currentBrush,
        opacity: 1,
        timestamp: Date.now(),
      });
    }

    // Cursor ring
    const cx = gesture.cursorX * width;
    const cy = gesture.cursorY * height;
    const isDrawing = gesture.gesture === "DRAW";

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, isDrawing ? currentSize / 2 + 4 : 18, 0, Math.PI * 2);
    ctx.strokeStyle = isDrawing ? currentColor : "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (isDrawing) {
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = currentColor;
      ctx.fill();
    }
    ctx.restore();
  });

  // Color wheel canvas
  useEffect(() => {
    const canvas = colorWheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    if (!showColorWheel) return;

    const cx = colorWheelX * width;
    const cy = colorWheelY * height;
    const R  = 110;

    // Backdrop blur
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(cx, cy, R + 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const dx = gesture.cursorX * width - cx;
    const dy = gesture.cursorY * height - cy;
    const angle = Math.atan2(dy, dx);
    drawColorWheel(ctx, cx, cy, R, angle);

    // Label
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("COLOR WHEEL", cx, cy + R + 28);
    ctx.restore();
  }, [showColorWheel, colorWheelX, colorWheelY, gesture.cursorX, gesture.cursorY, width, height]);

  function renderStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
    switch (s.brushType) {
      case "smooth":   drawSmoothStroke(ctx, s);   break;
      case "gradient": drawGradientStroke(ctx, s);  break;
      case "neon":     drawNeonStroke(ctx, s);      break;
      case "particle": drawParticleStroke(ctx, s);  break;
      default:         drawBasicStroke(ctx, s);     break;
    }
  }

  const shared: React.CSSProperties = {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
  };

  return (
    <>
      <canvas ref={strokeCanvasRef} width={width} height={height} style={shared} />
      <canvas ref={cursorCanvasRef} width={width} height={height} style={{ ...shared, pointerEvents: "none" }} />
      <canvas ref={colorWheelRef}   width={width} height={height} style={{ ...shared, pointerEvents: "none" }} />
    </>
  );
});

CanvasRenderer.displayName = "CanvasRenderer";
