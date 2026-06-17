'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaceTracker, type FaceData, type CalibrationProgress } from './FaceTracker';
import { HandTracker, type HandCursorData } from './HandTracker';
import { GameEngine, type GameMode, type GameEngineState, type FallingObject, type Particle } from './GameEngine';
import { AudioManager } from './AudioManager';
import { StorageManager } from './StorageManager';
import {
  MainMenu, HUD, PauseScreen, GameOverScreen,
  CalibrationScreen, HowToPlayScreen, SettingsScreen,
  HighScoresScreen, AchievementsScreen, CharactersScreen,
  AchievementToast, DwellCursor, ALL_CHARACTERS,
} from './UI';

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | 'MENU' | 'CALIBRATION' | 'PLAYING' | 'PAUSED'
  | 'GAME_OVER' | 'HOW_TO_PLAY' | 'SETTINGS'
  | 'HIGH_SCORES' | 'ACHIEVEMENTS' | 'CHARACTERS';

/**
 * Screens that need face tracking (gameplay + calibration).
 * All others use hand tracking for dwell-cursor navigation.
 */
function needsFaceInput(s: Screen): boolean {
  return s === 'PLAYING' || s === 'CALIBRATION';
}

// ─── Canvas Renderer ──────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private emojiCache: Map<string, HTMLCanvasElement> = new Map();
  private bgGrad: CanvasGradient | null = null;
  private lastTheme = '';
  private starPositions: Array<{ x: number; y: number; r: number; t: number }> = [];
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.generateStars();
  }

  resize(): void {
    this.W = this.canvas.width = window.innerWidth;
    this.H = this.canvas.height = window.innerHeight;
    this.bgGrad = null;
    this.generateStars();
  }

  private generateStars(): void {
    this.starPositions = Array.from({ length: 60 }, () => ({
      x: Math.random() * this.W,
      y: Math.random() * this.H * 0.8,
      r: 0.5 + Math.random() * 2,
      t: Math.random() * Math.PI * 2,
    }));
  }

  private px(n: number): number { return n * this.W; }
  private py(n: number): number { return n * this.H; }

  private getEmojiCanvas(emoji: string, size: number): HTMLCanvasElement {
    const key = `${emoji}_${size}`;
    if (this.emojiCache.has(key)) return this.emojiCache.get(key)!;
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const cx = c.getContext('2d')!;
    cx.font = `${size * 1.6}px serif`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(emoji, size, size);
    this.emojiCache.set(key, c);
    return c;
  }

  render(state: GameEngineState, faceData: FaceData, theme: string, dt: number, characterId: string): void {
    this.time += dt;
    const ctx = this.ctx;
    const W = this.W, H = this.H;

    if (state.screenShake > 0) {
      const s = state.screenShake * 12;
      ctx.save();
      ctx.translate(Math.sin(this.time * 80) * s, Math.cos(this.time * 60) * s);
    }

    this.drawBackground(theme);
    this.drawStars();

    for (const obj of state.objects) {
      if (!obj.active) continue;
      this.drawFallingObject(obj);
    }

    for (const p of state.particles) {
      this.drawParticle(p);
    }

    this.drawChompy(state, characterId);

    ctx.save();
    const groundGrad = ctx.createLinearGradient(0, H * 0.93, 0, H);
    groundGrad.addColorStop(0, 'rgba(124,58,237,0.3)');
    groundGrad.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, H * 0.93, W, H * 0.07);
    ctx.restore();

    if (state.screenShake > 0) ctx.restore();
  }

  private drawBackground(theme: string): void {
    const ctx = this.ctx;
    const W = this.W, H = this.H;

    if (!this.bgGrad || this.lastTheme !== theme) {
      this.lastTheme = theme;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      switch (theme) {
        case 'kitchen': grad.addColorStop(0, '#0f0a1e'); grad.addColorStop(1, '#1a0a3e'); break;
        case 'candy':   grad.addColorStop(0, '#1a0520'); grad.addColorStop(1, '#2d0a3a'); break;
        case 'space':   grad.addColorStop(0, '#000510'); grad.addColorStop(1, '#050520'); break;
        case 'jungle':  grad.addColorStop(0, '#051a05'); grad.addColorStop(1, '#0a2a0a'); break;
        case 'pirate':  grad.addColorStop(0, '#0a0810'); grad.addColorStop(1, '#1a1020'); break;
        default:        grad.addColorStop(0, '#0f0a1e'); grad.addColorStop(1, '#1a0a3e');
      }
      this.bgGrad = grad;
    }
    ctx.fillStyle = this.bgGrad;
    ctx.fillRect(0, 0, W, H);
  }

  private drawStars(): void {
    const ctx = this.ctx;
    for (const s of this.starPositions) {
      const twinkle = 0.3 + 0.7 * Math.sin(this.time * 2 + s.t);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.6})`;
      ctx.fill();
    }
  }

  private drawFallingObject(obj: FallingObject): void {
    const ctx = this.ctx;
    const x = this.px(obj.x);
    const y = this.py(obj.y);
    const sz = Math.max(8, this.px(obj.size));
    const wobble = Math.sin(obj.wobble + this.time * obj.wobbleSpeed) * 3;

    ctx.save();
    ctx.translate(x, y + wobble);
    ctx.rotate(obj.rotation);

    ctx.shadowColor = obj.glowColor;
    ctx.shadowBlur = obj.category === 'collectible' ? 20 : obj.category === 'powerup' ? 30 : 10;

    const emojiSz = Math.floor(sz * 1.2);
    const ec = this.getEmojiCanvas(obj.emoji, emojiSz);
    ctx.drawImage(ec, -emojiSz, -emojiSz, emojiSz * 2, emojiSz * 2);

    if (obj.category === 'collectible' || obj.category === 'powerup') {
      const sparks = obj.category === 'powerup' ? 8 : 4;
      for (let i = 0; i < sparks; i++) {
        const angle = (i / sparks) * Math.PI * 2 + this.time * 2;
        const sr = sz * 0.9;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * sr, Math.sin(angle) * sr, 3, 0, Math.PI * 2);
        ctx.fillStyle = obj.glowColor;
        ctx.shadowBlur = 6;
        ctx.shadowColor = obj.glowColor;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawParticle(p: Particle): void {
    const ctx = this.ctx;
    const alpha = p.life / p.maxLife;
    const x = this.px(p.x);
    const y = this.py(p.y);

    if (p.text) {
      const sz = Math.max(12, this.px(p.size) * 1.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${sz}px "Fredoka One", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      const s = 0.8 + alpha * 0.4;
      ctx.scale(s, s);
      ctx.fillText(p.text, x / s, y / s);
      ctx.restore();
    } else {
      const r = Math.max(1, this.px(p.size));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  }

  private drawChompy(state: GameEngineState, characterId: string): void {
    const ctx = this.ctx;
    const c = state.chompy;
    const x = this.px(c.x);
    const baseY = this.py(c.y);
    const y = baseY + this.py(c.bounceY);
    const char = ALL_CHARACTERS.find(ch => ch.id === characterId) || ALL_CHARACTERS[0];
    const size = Math.max(40, Math.min(90, this.W * 0.07));

    ctx.save();
    ctx.translate(x, y);

    if (c.comboGlow > 0.1) {
      ctx.shadowColor = char.color;
      ctx.shadowBlur = 20 + c.comboGlow * 30;
    }
    if (state.activePowerUps.length > 0) {
      ctx.shadowColor = `hsl(${(this.time * 120) % 360},100%,60%)`;
      ctx.shadowBlur = 35;
    }

    const bodyColors: Record<string, [string, string]> = {
      chompy: ['#7c3aed', '#5b21b6'], shark:  ['#2563eb', '#1d4ed8'],
      dragon: ['#059669', '#047857'], alien:  ['#7c3aed', '#6d28d9'],
      goblin: ['#d97706', '#b45309'], dino:   ['#10b981', '#059669'],
      robot:  ['#64748b', '#475569'], frog:   ['#65a30d', '#4d7c0f'],
    };
    const [bodyCol1, bodyCol2] = bodyColors[characterId] || bodyColors.chompy;

    const bodyGrad = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size);
    bodyGrad.addColorStop(0, lighten(bodyCol1, 0.3));
    bodyGrad.addColorStop(1, bodyCol2);
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    if (state.isStunned) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(0, 0, size, size * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const eyeOffsetX = size * 0.28;
    const eyeY = -size * 0.2;
    const eyeR = size * 0.22 * (c.reaction === 'excited' ? 1.3 : 1) * c.eyeScale;
    const eyeScale = c.eyeScale;

    ctx.save();
    ctx.scale(eyeScale, eyeScale);

    for (const ex of [-eyeOffsetX, eyeOffsetX]) {
      ctx.beginPath();
      ctx.ellipse(ex / eyeScale, eyeY / eyeScale, eyeR, eyeR * 1.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = state.isStunned ? '#ffaaaa' : '#fff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255,255,255,0.5)';
      ctx.fill();

      const pupilX = ex / eyeScale + (c.lookDir === 'left' ? -size * 0.08 : c.lookDir === 'right' ? size * 0.08 : 0);
      ctx.beginPath();
      ctx.arc(pupilX, eyeY / eyeScale, eyeR * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.shadowBlur = 0;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pupilX - eyeR * 0.15, eyeY / eyeScale - eyeR * 0.15, eyeR * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      if (c.reaction === 'excited') {
        ctx.fillStyle = '#fbbf24';
        ctx.font = `${eyeR * 0.8}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', ex / eyeScale, eyeY / eyeScale);
      }

      if (c.reaction === 'gameover' || state.isStunned) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        const r = eyeR * 0.5;
        ctx.beginPath();
        ctx.moveTo(ex / eyeScale - r, eyeY / eyeScale - r);
        ctx.lineTo(ex / eyeScale + r, eyeY / eyeScale + r);
        ctx.moveTo(ex / eyeScale + r, eyeY / eyeScale - r);
        ctx.lineTo(ex / eyeScale - r, eyeY / eyeScale + r);
        ctx.stroke();
      }
    }
    ctx.restore();

    c.eyeScale = Math.max(1, c.eyeScale - 0.05);

    this.drawChompyMouth(ctx, size, c.mouthOpenness, state);

    if (c.reaction === 'happy' || c.reaction === 'excited') {
      ctx.globalAlpha = 0.5;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sx * size * 0.55, size * 0.05, size * 0.2, size * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f472b6';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (state.isStunned) {
      for (let i = 0; i < 3; i++) {
        const angle = this.time * 3 + (i / 3) * Math.PI * 2;
        const r = size * 1.1;
        ctx.font = `${size * 0.3}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', Math.cos(angle) * r, -size * 0.3 + Math.sin(angle) * r * 0.4);
      }
    }

    if (state.activePowerUps.length > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${(this.time * 120) % 360},100%,60%,0.4)`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawChompyMouth(ctx: CanvasRenderingContext2D, size: number, openness: number, state: GameEngineState): void {
    const mouthY = size * 0.25;
    const mouthW = size * 0.65;
    const mouthH = Math.max(size * 0.06, size * 0.55 * openness);

    ctx.beginPath();
    ctx.ellipse(0, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0a2e';
    ctx.shadowBlur = 0;
    ctx.fill();

    if (openness > 0.3) {
      const innerGrad = ctx.createRadialGradient(0, mouthY, 0, 0, mouthY, mouthW);
      const isGolden = state.activePowerUps.some(p => p.type === 'golden_mouth');
      const isGiant  = state.activePowerUps.some(p => p.type === 'giant_mouth');
      if (isGolden) {
        innerGrad.addColorStop(0, 'rgba(251,191,36,0.9)');
        innerGrad.addColorStop(1, 'rgba(251,191,36,0.1)');
      } else if (isGiant) {
        innerGrad.addColorStop(0, 'rgba(244,114,182,0.9)');
        innerGrad.addColorStop(1, 'rgba(244,114,182,0.1)');
      } else {
        innerGrad.addColorStop(0, 'rgba(124,58,237,0.6)');
        innerGrad.addColorStop(1, 'rgba(124,58,237,0.05)');
      }
      ctx.beginPath();
      ctx.ellipse(0, mouthY, mouthW * 0.9, mouthH * 0.85, 0, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();
    }

    ctx.fillStyle = '#f0f0f0';
    ctx.shadowBlur = 0;
    for (let i = 0; i < 5; i++) {
      const tx = -mouthW * 0.7 + (i / 4) * mouthW * 1.4;
      const tw = mouthW * 0.2;
      const th = Math.max(4, mouthH * 0.45);
      ctx.beginPath();
      ctx.roundRect(tx - tw / 2, mouthY - mouthH * 0.3 - th / 2, tw, th, tw * 0.4);
      ctx.fill();
    }

    if (openness > 0.5) {
      ctx.globalAlpha = Math.min(1, (openness - 0.5) * 4);
      ctx.beginPath();
      ctx.ellipse(0, mouthY + mouthH * 0.3, mouthW * 0.45, mouthH * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (state.activePowerUps.some(p => p.type === 'giant_mouth')) {
      ctx.beginPath();
      ctx.ellipse(0, mouthY, size * 1.4, size * 0.8, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(244,114,182,0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, r + amount * 255)},${Math.min(255, g + amount * 255)},${Math.min(255, b + amount * 255)})`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MouthOpenCatchGame() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const faceRef      = useRef<FaceTracker | null>(null);
  const handRef      = useRef<HandTracker | null>(null);
  const engineRef    = useRef<GameEngine | null>(null);
  const audioRef     = useRef<AudioManager | null>(null);
  const storageRef   = useRef<StorageManager | null>(null);
  const rendererRef  = useRef<Renderer | null>(null);
  const faceDataRef  = useRef<FaceData>({ detected: false, noseX: 0.5, noseY: 0.5, mouthOpenness: 0, rawMouthGap: 0, upperLipY: 0, lowerLipY: 0 });
  const handDataRef  = useRef<HandCursorData>({ detected: false, x: 0.5, y: 0.5 });
  const animRef      = useRef<number>(0);
  const lastTimeRef  = useRef<number>(0);

  const [screen, setScreen] = useState<Screen>('MENU');
  const [gameState, setGameState] = useState<GameEngineState | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [calibProgress, setCalibProgress] = useState<CalibrationProgress>({ phase: 'closed', progress: 0, closedValue: 0, openValue: 0 });
  const [calibPhase, setCalibPhase] = useState<'waiting' | 'closed' | 'open' | 'done'>('waiting');
  const [cameraReady, setCameraReady] = useState(false);
  const [handReady, setHandReady] = useState(false);
  const [settings, setSettings] = useState({ soundEnabled: true, musicEnabled: true, showCamera: false, highContrast: false, selectedCharacter: 'chompy', selectedTheme: 'kitchen' });
  const [stats, setStats] = useState({ highScore: 0, coins: 0, diamonds: 0, gamesPlayed: 0, bestCombo: 0, totalCaught: 0, totalMissed: 0, timePlayed: 0, bestSurvivalTime: 0 });
  const [achievements, setAchievements] = useState<ReturnType<StorageManager['getAchievements']>>([]);
  const [dailyChallenge, setDailyChallenge] = useState<ReturnType<StorageManager['getDailyChallenge']>>(null);
  const [unlockedChars, setUnlockedChars] = useState<string[]>(['chompy']);
  const [unlockedThemes, setUnlockedThemes] = useState<string[]>(['kitchen']);
  const [toastAchievement, setToastAchievement] = useState<string | null>(null);
  const [newGameOverAchievements, setNewGameOverAchievements] = useState<string[]>([]);
  // Cursor position comes from HandTracker during UI screens
  const [dwellPos, setDwellPos] = useState({ x: 0.5, y: 0.5 });
  const [handDetected, setHandDetected] = useState(false);

  // ── Init storage ──────────────────────────────────────────────────────────
  useEffect(() => {
    const storage = new StorageManager();
    storageRef.current = storage;
    const s = storage.getSettings();
    const st = storage.getStats();
    setSettings({ soundEnabled: s.soundEnabled, musicEnabled: s.musicEnabled, showCamera: s.showCamera, highContrast: s.highContrast, selectedCharacter: s.selectedCharacter, selectedTheme: s.selectedTheme });
    setStats(st);
    setAchievements(storage.getAchievements());
    setDailyChallenge(storage.getDailyChallenge());
    setUnlockedChars(storage.getUnlockedCharacters());
    setUnlockedThemes(storage.getUnlockedThemes());
    audioRef.current = new AudioManager(s.soundEnabled, s.musicEnabled);
  }, []);

  // ── Init renderer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rendererRef.current = new Renderer(canvas);
    const onResize = () => rendererRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Init face tracker + camera (once) ────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let destroyed = false;

    const face = new FaceTracker();
    faceRef.current = face;

    const stored = storageRef.current?.getSettings().calibrationData;
    if (stored) face.setCalibration(stored.closedThreshold, stored.openThreshold);

    // Face callback: only update faceDataRef — no dwell logic here
    face.init(video, (data: FaceData) => {
      faceDataRef.current = data;
    }).then(() => {
      if (destroyed) return;
      return face.startCamera();
    }).then(() => {
      if (destroyed) return;
      setCameraReady(true);
      // Camera is open — now init HandTracker on the same video element
      const hand = new HandTracker();
      handRef.current = hand;
      hand.init(video, (data: HandCursorData) => {
        handDataRef.current = data;
      }).then(() => {
        if (destroyed) return;
        setHandReady(true);
        // Start hand tracking immediately (we start on a menu screen)
        hand.startProcessing();
      }).catch(console.error);
    }).catch(console.error);

    return () => {
      destroyed = true;
      face.stopCamera();
      handRef.current?.stopProcessing();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── INPUT ROUTER: switch trackers based on screen ─────────────────────────
  useEffect(() => {
    const face = faceRef.current;
    const hand = handRef.current;
    if (!face || !hand) return;

    if (needsFaceInput(screen)) {
      // Gameplay / calibration: face on, hand off
      hand.stopProcessing();
      face.resumeDetection();
    } else {
      // All UI screens: hand on, face suspended
      face.suspendDetection();
      hand.startProcessing();
    }
  }, [screen]);

  // ── Poll hand cursor position for UI screens ──────────────────────────────
  useEffect(() => {
    if (needsFaceInput(screen)) return;
    const id = setInterval(() => {
      const h = handDataRef.current;
      setDwellPos({ x: h.x, y: h.y });
      setHandDetected(h.detected);
    }, 50);
    return () => clearInterval(id);
  }, [screen]);

  // ─── Game Loop ─────────────────────────────────────────────────────────────

  const gameLoop = useCallback((timestamp: number) => {
    const dt = Math.min(50, timestamp - (lastTimeRef.current || timestamp));
    lastTimeRef.current = timestamp;

    const engine   = engineRef.current;
    const renderer = rendererRef.current;
    const face     = faceDataRef.current;

    if (engine && renderer) {
      const mouthOpen = face.mouthOpenness > 0.55;
      engine.setPlayerInput(face.noseX, mouthOpen, face.mouthOpenness, face.detected);
      engine.update(dt);
      const state = engine.getState();

      renderer.render(state, face, settings.selectedTheme, dt / 1000, settings.selectedCharacter);
      setGameState({ ...state });

      if (state.isGameOver) {
        handleGameOver(state);
        return;
      }
    }

    animRef.current = requestAnimationFrame(gameLoop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const handleGameOver = useCallback((state: GameEngineState) => {
    audioRef.current?.play('gameOver');
    audioRef.current?.stopMusic();
    const storage = storageRef.current!;
    const unlocked = storage.recordGameEnd(state.score, state.gameTime, state.totalCaught, state.totalMissed, state.maxCombo, state.coinsEarned, state.diamondsEarned);
    setStats(storage.getStats());
    setAchievements(storage.getAchievements());
    setNewGameOverAchievements(unlocked);
    setScreen('GAME_OVER');
    cancelAnimationFrame(animRef.current);
  }, []);

  // ─── Screen transitions ────────────────────────────────────────────────────

  const startGame = useCallback((mode: GameMode) => {
    audioRef.current?.resume();
    setGameMode(mode);
    const stored = storageRef.current?.getSettings().calibrationData;
    if (!stored) {
      setCalibPhase('waiting');
      setScreen('CALIBRATION');
      setTimeout(() => {
        if (faceDataRef.current.detected) {
          setCalibPhase('closed');
          faceRef.current?.startCalibration(
            (p) => { setCalibProgress(p); setCalibPhase(p.phase); },
            (closed, open) => {
              storageRef.current?.updateCalibration({ closedThreshold: closed, openThreshold: open, timestamp: Date.now() });
              setCalibPhase('done');
              setTimeout(() => launchGame(mode), 1000);
            }
          );
        } else {
          launchGame(mode);
        }
      }, 1500);
    } else {
      launchGame(mode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const launchGame = useCallback((mode: GameMode) => {
    const engine = new GameEngine(mode);
    engine.setCallbacks({
      onCatch: (r) => {
        if (r.isBomb) {
          audioRef.current?.play('bomb');
        } else if (r.isHazard) {
          audioRef.current?.play('rotten');
        } else if (r.obj.subtype === 'diamond') {
          audioRef.current?.play('diamond');
          storageRef.current?.unlockAchievement('diamonds_10');
        } else if (r.obj.subtype === 'treasure') {
          audioRef.current?.play('treasure');
          if (storageRef.current?.unlockAchievement('treasure_catch')) setToastAchievement('Treasure Hunter');
        } else if (r.obj.category === 'collectible') {
          audioRef.current?.play('coin');
        } else if (r.obj.category === 'powerup') {
          audioRef.current?.play('powerup');
          if (storageRef.current?.unlockAchievement('powerup_catch')) setToastAchievement('Powered Up');
        } else {
          audioRef.current?.play('catch');
        }
        if (r.pointsAwarded > 0 && engine.getState().combo >= 5) audioRef.current?.play('combo');
      },
      onLifeLost: () => { audioRef.current?.play('miss'); },
      onGameOver: () => { /* handled in loop */ },
    });
    engineRef.current = engine;
    audioRef.current?.startMusic();
    setScreen('PLAYING');
    cancelAnimationFrame(animRef.current);
    lastTimeRef.current = 0;
    animRef.current = requestAnimationFrame(gameLoop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameLoop]);

  const handlePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.togglePause();
    const isPaused = engine.getState().isPaused;
    setScreen(isPaused ? 'PAUSED' : 'PLAYING');
    if (isPaused) {
      cancelAnimationFrame(animRef.current);
      audioRef.current?.stopMusic();
    } else {
      audioRef.current?.startMusic();
      animRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameLoop]);

  const handleResume = useCallback(() => {
    engineRef.current?.resume();
    setScreen('PLAYING');
    audioRef.current?.startMusic();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const handleQuitToMenu = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    audioRef.current?.stopMusic();
    engineRef.current = null;
    setScreen('MENU');
  }, []);

  const handlePlayAgain = useCallback(() => { launchGame(gameMode); }, [gameMode, launchGame]);

  const handleRecalibrate = useCallback(() => {
    storageRef.current?.updateSettings({ calibrationData: null });
    setCalibPhase('waiting');
    setScreen('CALIBRATION');
    setTimeout(() => {
      setCalibPhase('closed');
      faceRef.current?.startCalibration(
        (p) => { setCalibProgress(p); setCalibPhase(p.phase); },
        (closed, open) => {
          storageRef.current?.updateCalibration({ closedThreshold: closed, openThreshold: open, timestamp: Date.now() });
          setCalibPhase('done');
          setTimeout(() => setScreen('SETTINGS'), 1000);
        }
      );
    }, 1500);
  }, []);

  const menuSelect = useCallback(() => audioRef.current?.play('menuSelect'), []);

  const toggleSound    = useCallback(() => setSettings(s => { const e = !s.soundEnabled;  audioRef.current?.setSoundEnabled(e);  storageRef.current?.updateSettings({ soundEnabled: e });  return { ...s, soundEnabled: e }; }), []);
  const toggleMusic    = useCallback(() => setSettings(s => { const e = !s.musicEnabled;  audioRef.current?.setMusicEnabled(e);  storageRef.current?.updateSettings({ musicEnabled: e });  return { ...s, musicEnabled: e }; }), []);
  const toggleCamera   = useCallback(() => setSettings(s => { storageRef.current?.updateSettings({ showCamera: !s.showCamera });   return { ...s, showCamera: !s.showCamera }; }), []);
  const toggleContrast = useCallback(() => setSettings(s => { storageRef.current?.updateSettings({ highContrast: !s.highContrast }); return { ...s, highContrast: !s.highContrast }; }), []);
  const selectCharacter = useCallback((id: string) => setSettings(s => { storageRef.current?.updateSettings({ selectedCharacter: id }); audioRef.current?.play('menuSelect'); return { ...s, selectedCharacter: id }; }), []);

  // Whether to show the hand cursor (UI screens only, not during gameplay/calibration)
  const showHandCursor = !needsFaceInput(screen);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0F0A1E' }}>
      {/* Game canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Shared webcam video (used by both trackers) */}
      <video ref={videoRef} className="absolute"
        style={{
          bottom: 16, right: 16, width: 160, height: 120,
          objectFit: 'cover', borderRadius: 12, border: '2px solid rgba(124,58,237,0.5)',
          display: settings.showCamera ? 'block' : 'none',
          transform: 'scaleX(-1)',
          zIndex: 40,
        }}
        muted playsInline autoPlay />

      {/* ── Screens ── */}

      {screen === 'MENU' && (
        <MainMenu
          onPlay={(m) => { menuSelect(); startGame(m); }}
          onHowToPlay={() => { menuSelect(); setScreen('HOW_TO_PLAY'); }}
          onHighScores={() => { menuSelect(); setScreen('HIGH_SCORES'); }}
          onAchievements={() => { menuSelect(); setScreen('ACHIEVEMENTS'); }}
          onSettings={() => { menuSelect(); setScreen('SETTINGS'); }}
          onCharacters={() => { menuSelect(); setScreen('CHARACTERS'); }}
          highScore={stats.highScore}
          dwellX={dwellPos.x} dwellY={dwellPos.y}
          cameraReady={cameraReady}
        />
      )}

      {screen === 'CALIBRATION' && (
        <CalibrationScreen
          phase={calibPhase}
          progress={calibProgress.progress}
          onSkip={() => {
            storageRef.current?.updateCalibration({ closedThreshold: 0.02, openThreshold: 0.08, timestamp: Date.now() });
            launchGame(gameMode);
          }}
        />
      )}

      {screen === 'PLAYING' && gameState && (
        <HUD
          score={gameState.score} lives={gameState.lives} combo={gameState.combo}
          activePowerUps={gameState.activePowerUps}
          mouthOpenness={faceDataRef.current.mouthOpenness}
          faceDetected={gameState.faceDetected}
          isStunned={gameState.isStunned}
          bossWaveLabel={gameState.bossWaveLabel} bossWaveTimer={gameState.bossWaveTimer}
          gameMode={gameState.gameMode} dailyChallenge={dailyChallenge}
          isPaused={false} onPause={handlePause}
        />
      )}

      {screen === 'PAUSED' && gameState && (
        <>
          <HUD
            score={gameState.score} lives={gameState.lives} combo={gameState.combo}
            activePowerUps={gameState.activePowerUps} mouthOpenness={0}
            faceDetected={true} isStunned={false} bossWaveLabel='' bossWaveTimer={0}
            gameMode={gameState.gameMode} dailyChallenge={null} isPaused={true}
            onPause={handleResume}
          />
          <PauseScreen
            onResume={handleResume} onQuit={handleQuitToMenu}
            score={gameState.score} dwellX={dwellPos.x} dwellY={dwellPos.y}
          />
        </>
      )}

      {screen === 'GAME_OVER' && gameState && (
        <GameOverScreen
          score={gameState.score} highScore={stats.highScore}
          combo={gameState.maxCombo} caught={gameState.totalCaught}
          gameMode={gameState.gameMode} newAchievements={newGameOverAchievements}
          onPlayAgain={handlePlayAgain} onMenu={handleQuitToMenu}
          dwellX={dwellPos.x} dwellY={dwellPos.y}
        />
      )}

      {screen === 'HOW_TO_PLAY' && (
        <HowToPlayScreen onBack={() => { menuSelect(); setScreen('MENU'); }} dwellX={dwellPos.x} dwellY={dwellPos.y} />
      )}

      {screen === 'SETTINGS' && (
        <SettingsScreen
          soundEnabled={settings.soundEnabled} musicEnabled={settings.musicEnabled}
          showCamera={settings.showCamera} highContrast={settings.highContrast}
          onToggleSound={toggleSound} onToggleMusic={toggleMusic}
          onToggleCamera={toggleCamera} onToggleContrast={toggleContrast}
          onRecalibrate={() => { menuSelect(); handleRecalibrate(); }}
          onBack={() => { menuSelect(); setScreen('MENU'); }}
          dwellX={dwellPos.x} dwellY={dwellPos.y}
        />
      )}

      {screen === 'HIGH_SCORES' && (
        <HighScoresScreen stats={stats} onBack={() => { menuSelect(); setScreen('MENU'); }} dwellX={dwellPos.x} dwellY={dwellPos.y} />
      )}

      {screen === 'ACHIEVEMENTS' && (
        <AchievementsScreen achievements={achievements} onBack={() => { menuSelect(); setScreen('MENU'); }} dwellX={dwellPos.x} dwellY={dwellPos.y} />
      )}

      {screen === 'CHARACTERS' && (
        <CharactersScreen
          selected={settings.selectedCharacter} unlocked={unlockedChars}
          onSelect={selectCharacter} onBack={() => { menuSelect(); setScreen('MENU'); }}
          dwellX={dwellPos.x} dwellY={dwellPos.y}
        />
      )}

      {/* Hand cursor — only during UI screens, never during gameplay */}
      {showHandCursor && (
        <DwellCursor x={dwellPos.x} y={dwellPos.y} detected={handDetected} />
      )}

      {/* Status badge: shows which input mode is active */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
          {needsFaceInput(screen)
            ? <span className="text-green-400">😮 Face Control</span>
            : <span className="text-blue-400">☝️ Hand Control</span>}
        </div>
      </div>

      {toastAchievement && (
        <AchievementToast name={toastAchievement} onDone={() => setToastAchievement(null)} />
      )}
    </div>
  );
}
