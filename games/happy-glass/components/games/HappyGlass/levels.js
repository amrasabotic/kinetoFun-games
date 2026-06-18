'use client';

// ─── Level definitions ────────────────────────────────────────────────────────
//
// Coordinate conventions (all fractions of canvas W=800, H=560):
//   emitterXFrac  — X centre of the water spout
//   glass.xFrac   — X centre of the glass
//   glass.width/height — pixels (absolute)
//   obstacles[].xFrac / yFrac — obstacle centre as fraction of W / H
//   obstacles[].angle — rotation in radians (positive = clockwise)
//   targetFill    — fraction of spawned water that must reach the glass
//   maxStrokes    — star-3 threshold ÷ 3 (see calcStars in canvasRenderer)
//   waterCount    — finite particles spawned once on RUN
//
// Obstacle types:
//   { type:'platform', xFrac, yFrac, width, angle }  — horizontal/angled slab
//   { type:'barrier',  xFrac, yFrac, height, angle } — thin vertical wall

export const TOTAL_LEVELS = 20;

export const LEVELS = [

  // ════════════════════════════════════════════════════════
  //  TUTORIAL  (1 – 4)
  //  Teach: drawing, guidance, glass positioning.
  //  No obstacles. Generous sizes and stroke budgets.
  // ════════════════════════════════════════════════════════

  {
    id: 1,
    label: 'Warm-Up',
    emitterXFrac: 0.5,
    glass:        { xFrac: 0.5, width: 130, height: 115 },
    targetFill:   0.50,
    maxStrokes:   6,
    waterCount:   30,
    obstacles:    [],
  },
  {
    id: 2,
    label: 'Lean Right',
    emitterXFrac: 0.5,
    glass:        { xFrac: 0.73, width: 120, height: 105 },
    targetFill:   0.50,
    maxStrokes:   5,
    waterCount:   30,
    obstacles:    [],
  },
  {
    id: 3,
    label: 'Lean Left',
    emitterXFrac: 0.5,
    glass:        { xFrac: 0.27, width: 112, height: 100 },
    targetFill:   0.52,
    maxStrokes:   5,
    waterCount:   32,
    obstacles:    [],
  },
  {
    id: 4,
    label: 'Side Pour',
    emitterXFrac: 0.28,       // emitter now off-centre left
    glass:        { xFrac: 0.62, width: 108, height: 94 },
    targetFill:   0.52,
    maxStrokes:   4,
    waterCount:   32,
    obstacles:    [],
  },

  // ════════════════════════════════════════════════════════
  //  OBSTACLES INTRO  (5 – 8)
  //  One or two obstacles per level; generous stroke counts.
  // ════════════════════════════════════════════════════════

  {
    id: 5,
    label: 'First Ramp',
    emitterXFrac: 0.5,
    glass:        { xFrac: 0.76, width: 112, height: 100 },
    targetFill:   0.52,
    maxStrokes:   5,
    waterCount:   34,
    obstacles: [
      // Slightly tilted platform nudges water rightward
      { type: 'platform', xFrac: 0.48, yFrac: 0.43, width: 105, angle: 0.22 },
    ],
  },
  {
    id: 6,
    label: 'Deflect Left',
    emitterXFrac: 0.5,
    glass:        { xFrac: 0.24, width: 108, height: 96 },
    targetFill:   0.52,
    maxStrokes:   5,
    waterCount:   35,
    obstacles: [
      // Angled ramp deflects water leftward
      { type: 'platform', xFrac: 0.57, yFrac: 0.50, width: 115, angle: -0.28 },
    ],
  },
  {
    id: 7,
    label: 'The Wall',
    emitterXFrac: 0.72,
    glass:        { xFrac: 0.24, width: 100, height: 90 },
    targetFill:   0.52,
    maxStrokes:   4,
    waterCount:   35,
    obstacles: [
      // Central barrier — water must be guided over or around it
      { type: 'barrier', xFrac: 0.50, yFrac: 0.40, width: 10, height: 100 },
    ],
  },
  {
    id: 8,
    label: 'Double Step',
    emitterXFrac: 0.5,
    glass:        { xFrac: 0.20, width: 100, height: 90 },
    targetFill:   0.52,
    maxStrokes:   5,
    waterCount:   36,
    obstacles: [
      { type: 'platform', xFrac: 0.43, yFrac: 0.34, width: 82, angle: -0.22 },
      { type: 'platform', xFrac: 0.28, yFrac: 0.57, width: 82, angle:  0.18 },
    ],
  },

  // ════════════════════════════════════════════════════════
  //  MEDIUM  (9 – 12)
  //  Smaller glass, longer travel paths, tighter routing.
  // ════════════════════════════════════════════════════════

  {
    id: 9,
    label: 'Far Right',
    emitterXFrac: 0.5,
    glass:        { xFrac: 0.79, width: 92, height: 86 },
    targetFill:   0.53,
    maxStrokes:   4,
    waterCount:   38,
    obstacles: [
      { type: 'platform', xFrac: 0.63, yFrac: 0.42, width: 92, angle: 0.22 },
    ],
  },
  {
    id: 10,
    label: 'Cross Court',
    emitterXFrac: 0.82,
    glass:        { xFrac: 0.18, width: 96, height: 86 },
    targetFill:   0.53,
    maxStrokes:   4,
    waterCount:   38,
    obstacles: [
      { type: 'platform', xFrac: 0.64, yFrac: 0.38, width: 102, angle: -0.30 },
      { type: 'platform', xFrac: 0.36, yFrac: 0.60, width: 102, angle:  0.26 },
    ],
  },
  {
    id: 11,
    label: 'The Funnel',
    emitterXFrac: 0.5,
    glass:        { xFrac: 0.50, width: 88, height: 82 },
    targetFill:   0.53,
    maxStrokes:   4,
    waterCount:   38,
    obstacles: [
      // V-shaped funnel narrows the water stream
      { type: 'platform', xFrac: 0.34, yFrac: 0.46, width: 84, angle:  0.36 },
      { type: 'platform', xFrac: 0.66, yFrac: 0.46, width: 84, angle: -0.36 },
    ],
  },
  {
    id: 12,
    label: 'Maze Run',
    emitterXFrac: 0.5,
    glass:        { xFrac: 0.79, width: 86, height: 80 },
    targetFill:   0.53,
    maxStrokes:   5,
    waterCount:   40,
    obstacles: [
      { type: 'barrier',  xFrac: 0.36, yFrac: 0.37, width: 10, height: 92 },
      { type: 'platform', xFrac: 0.63, yFrac: 0.55, width: 90, angle:  0.22 },
    ],
  },

  // ════════════════════════════════════════════════════════
  //  HARD  (13 – 16)
  //  Small glass, tight stroke limits, precise angles needed.
  // ════════════════════════════════════════════════════════

  {
    id: 13,
    label: 'Sharp Angle',
    emitterXFrac: 0.76,
    glass:        { xFrac: 0.22, width: 80, height: 76 },
    targetFill:   0.54,
    maxStrokes:   4,
    waterCount:   40,
    obstacles: [
      { type: 'platform', xFrac: 0.50, yFrac: 0.40, width: 114, angle: -0.36 },
    ],
  },
  {
    id: 14,
    label: 'Gauntlet',
    emitterXFrac: 0.20,
    glass:        { xFrac: 0.80, width: 78, height: 74 },
    targetFill:   0.54,
    maxStrokes:   4,
    waterCount:   42,
    obstacles: [
      { type: 'platform', xFrac: 0.37, yFrac: 0.34, width: 92, angle:  0.30 },
      { type: 'barrier',  xFrac: 0.60, yFrac: 0.50, width: 10, height: 84 },
      { type: 'platform', xFrac: 0.72, yFrac: 0.62, width: 72, angle: -0.20 },
    ],
  },
  {
    id: 15,
    label: 'The Gate',
    emitterXFrac: 0.22,
    glass:        { xFrac: 0.50, width: 76, height: 70 },
    targetFill:   0.54,
    maxStrokes:   3,
    waterCount:   42,
    obstacles: [
      { type: 'barrier',  xFrac: 0.37, yFrac: 0.33, width: 10, height: 72 },
      { type: 'barrier',  xFrac: 0.63, yFrac: 0.33, width: 10, height: 72 },
      { type: 'platform', xFrac: 0.50, yFrac: 0.54, width: 100, angle: 0 },
    ],
  },
  {
    id: 16,
    label: 'Long Haul',
    emitterXFrac: 0.18,
    glass:        { xFrac: 0.82, width: 72, height: 68 },
    targetFill:   0.54,
    maxStrokes:   4,
    waterCount:   43,
    obstacles: [
      { type: 'platform', xFrac: 0.32, yFrac: 0.30, width: 92, angle:  0.28 },
      { type: 'barrier',  xFrac: 0.50, yFrac: 0.50, width: 10, height: 100 },
      { type: 'platform', xFrac: 0.70, yFrac: 0.62, width: 80, angle: -0.26 },
    ],
  },

  // ════════════════════════════════════════════════════════
  //  EXPERT  (17 – 20)
  //  Minimal stroke budget, complex multi-step routing.
  // ════════════════════════════════════════════════════════

  {
    id: 17,
    label: 'Cascade',
    emitterXFrac: 0.15,
    glass:        { xFrac: 0.85, width: 70, height: 66 },
    targetFill:   0.55,
    maxStrokes:   3,
    waterCount:   44,
    obstacles: [
      { type: 'platform', xFrac: 0.30, yFrac: 0.27, width: 100, angle:  0.32 },
      { type: 'platform', xFrac: 0.57, yFrac: 0.49, width: 100, angle: -0.30 },
      { type: 'platform', xFrac: 0.78, yFrac: 0.68, width: 82,  angle:  0.20 },
    ],
  },
  {
    id: 18,
    label: 'Needle',
    emitterXFrac: 0.50,
    glass:        { xFrac: 0.50, width: 64, height: 62 },
    targetFill:   0.55,
    maxStrokes:   3,
    waterCount:   44,
    obstacles: [
      { type: 'barrier',  xFrac: 0.32, yFrac: 0.36, width: 10, height: 92 },
      { type: 'barrier',  xFrac: 0.68, yFrac: 0.36, width: 10, height: 92 },
      { type: 'platform', xFrac: 0.50, yFrac: 0.52, width: 68, angle:  0.42 },
    ],
  },
  {
    id: 19,
    label: 'Crossroads',
    emitterXFrac: 0.50,
    glass:        { xFrac: 0.80, width: 66, height: 62 },
    targetFill:   0.55,
    maxStrokes:   3,
    waterCount:   44,
    obstacles: [
      { type: 'platform', xFrac: 0.35, yFrac: 0.29, width: 86, angle: -0.22 },
      { type: 'barrier',  xFrac: 0.60, yFrac: 0.46, width: 10, height: 82 },
      { type: 'platform', xFrac: 0.72, yFrac: 0.61, width: 72, angle:  0.26 },
    ],
  },
  {
    id: 20,
    label: 'Mastermind',
    emitterXFrac: 0.12,
    glass:        { xFrac: 0.88, width: 62, height: 58 },
    targetFill:   0.55,
    maxStrokes:   3,
    waterCount:   45,
    obstacles: [
      { type: 'platform', xFrac: 0.28, yFrac: 0.24, width: 92,  angle:  0.34 },
      { type: 'barrier',  xFrac: 0.48, yFrac: 0.42, width: 10,  height: 88 },
      { type: 'platform', xFrac: 0.64, yFrac: 0.55, width: 82,  angle: -0.30 },
      { type: 'barrier',  xFrac: 0.78, yFrac: 0.68, width: 10,  height: 62 },
    ],
  },
];
