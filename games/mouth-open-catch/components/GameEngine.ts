// ─── Types ───────────────────────────────────────────────────────────────────

export type GameMode = 'CLASSIC' | 'SURVIVAL' | 'COIN_RUSH' | 'HEALTHY_EATING' | 'KIDS';
export type MouthState = 'CLOSED' | 'HALF' | 'OPEN';

export interface FallingObject {
  id: number;
  category: 'food' | 'collectible' | 'hazard' | 'powerup';
  subtype: string;
  emoji: string;
  label: string;
  x: number;       // 0–1 normalized
  y: number;       // 0–1 normalized
  vy: number;      // normalized units/sec
  vx: number;
  size: number;    // normalized
  points: number;
  active: boolean;
  caught: boolean;
  catchTime: number;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  glowColor: string;
}

export interface Particle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  text?: string;
  type: 'spark' | 'score' | 'star' | 'trail';
}

export interface ActivePowerUp {
  type: string;
  label: string;
  icon: string;
  endTime: number;
}

export interface ChompyState {
  x: number;           // 0–1
  y: number;           // always near bottom
  mouthOpenness: number; // 0–1
  reaction: 'idle' | 'happy' | 'excited' | 'stunned' | 'gameover' | 'powerup';
  reactionTimer: number;
  bounceY: number;
  bounceVY: number;
  lookDir: 'left' | 'right' | 'center';
  comboGlow: number;   // 0–1
  eyeScale: number;
}

export interface GameEngineState {
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  gameMode: GameMode;
  objects: FallingObject[];
  particles: Particle[];
  activePowerUps: ActivePowerUp[];
  chompy: ChompyState;
  isStunned: boolean;
  stunEndTime: number;
  gameTime: number;    // seconds
  isGameOver: boolean;
  isPaused: boolean;
  totalCaught: number;
  totalMissed: number;
  coinsEarned: number;
  diamondsEarned: number;
  isBossWave: boolean;
  bossWaveLabel: string;
  bossWaveTimer: number;
  screenShake: number;
  difficultyLevel: number;
  faceDetected: boolean;
  faceLostTimer: number;
}

export interface CatchResult {
  caught: boolean;
  obj: FallingObject;
  pointsAwarded: number;
  isBomb: boolean;
  isHazard: boolean;
  newLife?: boolean;
  powerUpActivated?: string;
  newAchievement?: string;
}

// ─── Object Definitions ──────────────────────────────────────────────────────

const FOOD_ITEMS = [
  { subtype: 'apple',       emoji: '🍎', label: 'Apple',        points: 10,  category: 'food' as const, glowColor: '#ef4444' },
  { subtype: 'banana',      emoji: '🍌', label: 'Banana',       points: 10,  category: 'food' as const, glowColor: '#fbbf24' },
  { subtype: 'strawberry',  emoji: '🍓', label: 'Strawberry',   points: 10,  category: 'food' as const, glowColor: '#f43f5e' },
  { subtype: 'cookie',      emoji: '🍪', label: 'Cookie',       points: 15,  category: 'food' as const, glowColor: '#d97706' },
  { subtype: 'burger',      emoji: '🍔', label: 'Burger',       points: 20,  category: 'food' as const, glowColor: '#b45309' },
  { subtype: 'pizza',       emoji: '🍕', label: 'Pizza',        points: 25,  category: 'food' as const, glowColor: '#f97316' },
];

const COLLECTIBLES = [
  { subtype: 'coin',        emoji: '🪙', label: 'Coin',         points: 10,  category: 'collectible' as const, glowColor: '#fbbf24' },
  { subtype: 'gold_coin',   emoji: '💰', label: 'Gold Coin',    points: 30,  category: 'collectible' as const, glowColor: '#f59e0b' },
  { subtype: 'diamond',     emoji: '💎', label: 'Diamond',      points: 100, category: 'collectible' as const, glowColor: '#67e8f9' },
  { subtype: 'treasure',    emoji: '🎁', label: 'Treasure',     points: 200, category: 'collectible' as const, glowColor: '#a78bfa' },
];

const HAZARDS = [
  { subtype: 'rotten',      emoji: '🤢', label: 'Rotten Apple', points: -20, category: 'hazard' as const, glowColor: '#4ade80' },
  { subtype: 'mushroom',    emoji: '🍄', label: 'Poison Mushroom', points: -50, category: 'hazard' as const, glowColor: '#c084fc' },
  { subtype: 'bomb',        emoji: '💣', label: 'Bomb',         points: 0,   category: 'hazard' as const, glowColor: '#1e1e1e' },
  { subtype: 'chili',       emoji: '🌶️', label: 'Burning Chili', points: 0, category: 'hazard' as const, glowColor: '#ef4444' },
];

const POWER_UPS = [
  { subtype: 'golden_mouth', emoji: '✨', label: 'Golden Mouth', points: 0, category: 'powerup' as const, glowColor: '#fbbf24' },
  { subtype: 'giant_mouth',  emoji: '👄', label: 'Giant Mouth',  points: 0, category: 'powerup' as const, glowColor: '#f472b6' },
  { subtype: 'slow_motion',  emoji: '⏰', label: 'Slow Motion',  points: 0, category: 'powerup' as const, glowColor: '#60a5fa' },
  { subtype: 'magnet',       emoji: '🧲', label: 'Coin Magnet',  points: 0, category: 'powerup' as const, glowColor: '#f87171' },
];

const BOSS_WAVES = [
  { label: '💰 COIN SHOWER!',    items: 'coins',     duration: 12 },
  { label: '💎 DIAMOND RAIN!',   items: 'diamonds',  duration: 10 },
  { label: '🍕 FOOD FESTIVAL!',  items: 'food',      duration: 12 },
  { label: '💣 BOMB STORM!',     items: 'bombs',     duration: 10 },
  { label: '🎁 TREASURE HUNT!',  items: 'treasure',  duration: 12 },
];

const HEALTHY_FOODS = new Set(['apple', 'banana', 'strawberry']);
const JUNK_FOODS = new Set(['cookie', 'burger', 'pizza']);

// ─── GameEngine ───────────────────────────────────────────────────────────────

export class GameEngine {
  private state: GameEngineState;
  private idCounter = 0;
  private particleId = 0;
  private lastSpawnTime = 0;
  private lastDiffTime = 0;
  private lastBossTime = 0;
  private lastBombDodgeTime = 0;
  private bombDodgeStreak = 0;
  private spawnInterval = 1200; // ms
  private objectSpeed = 0.18;   // normalized units/sec
  private hazardChance = 0.2;
  private powerUpChance = 0.04;
  private playerX = 0.5;
  private playerMouthOpen = false;
  private mouthOpenness = 0;
  private catchRadius = 0.075;  // normalized
  private onCatch?: (r: CatchResult) => void;
  private onLifeLost?: () => void;
  private onGameOver?: () => void;
  private bossWaveIndex = 0;
  private bossWaveEndTime = 0;
  private isBossActive = false;

  constructor(mode: GameMode) {
    this.state = this.createInitialState(mode);
  }

  private createInitialState(mode: GameMode): GameEngineState {
    return {
      score: 0, lives: mode === 'KIDS' ? 5 : 3,
      combo: 0, maxCombo: 0,
      gameMode: mode,
      objects: [], particles: [], activePowerUps: [],
      chompy: {
        x: 0.5, y: 0.88, mouthOpenness: 0,
        reaction: 'idle', reactionTimer: 0,
        bounceY: 0, bounceVY: 0, lookDir: 'center',
        comboGlow: 0, eyeScale: 1,
      },
      isStunned: false, stunEndTime: 0,
      gameTime: 0, isGameOver: false, isPaused: false,
      totalCaught: 0, totalMissed: 0,
      coinsEarned: 0, diamondsEarned: 0,
      isBossWave: false, bossWaveLabel: '', bossWaveTimer: 0,
      screenShake: 0, difficultyLevel: 1,
      faceDetected: true, faceLostTimer: 0,
    };
  }

  setCallbacks(opts: {
    onCatch?: (r: CatchResult) => void;
    onLifeLost?: () => void;
    onGameOver?: () => void;
  }): void {
    this.onCatch = opts.onCatch;
    this.onLifeLost = opts.onLifeLost;
    this.onGameOver = opts.onGameOver;
  }

  getState(): GameEngineState { return this.state; }

  setPlayerInput(noseX: number, mouthOpen: boolean, openness: number, detected: boolean): void {
    this.playerX = noseX;
    this.playerMouthOpen = mouthOpen;
    this.mouthOpenness = openness;
    const s = this.state;

    if (!detected) {
      s.faceLostTimer += 0.016;
      if (s.faceLostTimer > 0.5) s.faceDetected = false;
    } else {
      s.faceDetected = true;
      s.faceLostTimer = 0;
    }
  }

  update(dtMs: number): void {
    if (this.state.isPaused || this.state.isGameOver) return;
    if (!this.state.faceDetected) return;

    const dt = Math.min(dtMs / 1000, 0.05);
    const s = this.state;
    const now = performance.now();

    s.gameTime += dt;

    // Stun check
    if (s.isStunned && now >= s.stunEndTime) s.isStunned = false;

    this.updateChompy(dt);
    this.updateDifficulty(now);
    this.spawnObjects(now);
    this.updateObjects(dt, now);
    this.updateParticles(dt);
    this.updatePowerUps(now);
    this.updateBossWave(now);

    if (s.screenShake > 0) s.screenShake = Math.max(0, s.screenShake - dt * 8);
  }

  private updateChompy(dt: number): void {
    const c = this.state.chompy;
    const targetX = this.playerX;

    c.x += (targetX - c.x) * Math.min(1, dt * 8);
    c.mouthOpenness += (this.mouthOpenness - c.mouthOpenness) * Math.min(1, dt * 12);

    // Look direction
    const dx = targetX - c.x;
    if (Math.abs(dx) > 0.03) c.lookDir = dx < 0 ? 'left' : 'right';
    else c.lookDir = 'center';

    // Bounce physics
    c.bounceVY += (0 - c.bounceY) * 200 * dt;
    c.bounceVY *= Math.pow(0.7, dt * 60);
    c.bounceY += c.bounceVY * dt;

    // Reaction timer
    if (c.reactionTimer > 0) {
      c.reactionTimer -= dt;
      if (c.reactionTimer <= 0) c.reaction = 'idle';
    }

    // Combo glow
    const targetGlow = Math.min(1, this.state.combo / 10);
    c.comboGlow += (targetGlow - c.comboGlow) * dt * 3;
  }

  private updateDifficulty(now: number): void {
    const s = this.state;
    const elapsed = s.gameTime;

    // Every 30 seconds increase difficulty
    const newLevel = 1 + Math.floor(elapsed / 30);
    if (newLevel !== s.difficultyLevel) s.difficultyLevel = newLevel;

    // Scale speed and spawn
    const speedMult = this.hasPowerUp('slow_motion') ? 0.5 : 1;
    const baseMult = s.gameMode === 'KIDS' ? 0.65 : 1;
    this.objectSpeed = (0.18 + Math.min(elapsed / 60, 1) * 0.22) * speedMult * baseMult;
    this.spawnInterval = Math.max(400, 1200 - elapsed * 4) * (1 / baseMult);
    this.hazardChance = s.gameMode === 'KIDS'
      ? 0.08
      : Math.min(0.45, 0.15 + elapsed / 300);
    this.powerUpChance = 0.04;
    this.catchRadius = this.hasPowerUp('giant_mouth') ? 0.13 : s.gameMode === 'KIDS' ? 0.1 : 0.075;
  }

  private spawnObjects(now: number): void {
    if (now - this.lastSpawnTime < this.spawnInterval) return;
    this.lastSpawnTime = now;

    if (this.isBossActive) {
      this.spawnBossObject(now);
      return;
    }

    const roll = Math.random();
    const mode = this.state.gameMode;

    if (roll < this.powerUpChance) {
      this.spawnFromPool(POWER_UPS);
    } else if (mode === 'COIN_RUSH') {
      this.spawnFromPool(Math.random() < 0.2 ? COLLECTIBLES.slice(2) : COLLECTIBLES.slice(0, 2));
    } else if (mode === 'HEALTHY_EATING') {
      if (roll < 0.5) this.spawnFromPool(FOOD_ITEMS.filter(f => HEALTHY_FOODS.has(f.subtype)));
      else if (roll < 0.65) this.spawnFromPool(FOOD_ITEMS.filter(f => JUNK_FOODS.has(f.subtype)));
      else this.spawnFromPool(HAZARDS.slice(0, 2));
    } else if (roll < this.hazardChance) {
      this.spawnFromPool(HAZARDS);
    } else if (roll < this.hazardChance + 0.25) {
      this.spawnFromPool(COLLECTIBLES);
    } else {
      this.spawnFromPool(FOOD_ITEMS);
    }

    // Extra objects at higher difficulties
    if (this.state.difficultyLevel >= 4 && Math.random() < 0.35) {
      setTimeout(() => this.spawnFromPool(FOOD_ITEMS), 300);
    }
  }

  private spawnBossObject(now: number): void {
    const wave = BOSS_WAVES[this.bossWaveIndex % BOSS_WAVES.length];
    switch (wave.items) {
      case 'coins':     this.spawnFromPool(COLLECTIBLES.slice(0, 2)); break;
      case 'diamonds':  this.spawnItem(COLLECTIBLES[2]); break;
      case 'food':      this.spawnFromPool(FOOD_ITEMS); break;
      case 'bombs':     this.spawnItem(HAZARDS[2]); if (Math.random() < 0.3) this.spawnItem(HAZARDS[2]); break;
      case 'treasure':  this.spawnItem(COLLECTIBLES[3]); break;
    }
  }

  private spawnFromPool(pool: Array<{ subtype: string; emoji: string; label: string; points: number; category: FallingObject['category']; glowColor: string }>): void {
    const item = pool[Math.floor(Math.random() * pool.length)];
    this.spawnItem(item);
  }

  private spawnItem(def: { subtype: string; emoji: string; label: string; points: number; category: FallingObject['category']; glowColor: string }): void {
    const obj: FallingObject = {
      id: this.idCounter++,
      category: def.category,
      subtype: def.subtype,
      emoji: def.emoji,
      label: def.label,
      x: 0.05 + Math.random() * 0.9,
      y: -0.08,
      vy: this.objectSpeed * (0.85 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 0.04,
      size: this.state.gameMode === 'KIDS' ? 0.075 : 0.055 + Math.random() * 0.02,
      points: def.points,
      active: true,
      caught: false,
      catchTime: 0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 3,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 1 + Math.random() * 2,
      glowColor: def.glowColor,
    };
    this.state.objects.push(obj);
  }

  private updateObjects(dt: number, now: number): void {
    const s = this.state;
    const magnet = this.hasPowerUp('magnet');
    const catchY = s.chompy.y - 0.02;

    for (const obj of s.objects) {
      if (!obj.active) continue;

      if (obj.caught) {
        obj.vy -= dt * 2;
        obj.y += obj.vy * dt;
        obj.size *= 0.94;
        if (obj.size < 0.005 || now - obj.catchTime > 600) obj.active = false;
        continue;
      }

      obj.y += obj.vy * dt;
      obj.x += obj.vx * dt;
      obj.x = Math.max(0.02, Math.min(0.98, obj.x));
      obj.rotation += obj.rotationSpeed * dt;
      obj.wobble += obj.wobbleSpeed * dt;

      // Magnet effect
      if (magnet && obj.category === 'collectible') {
        const dx = s.chompy.x - obj.x;
        const dy = catchY - obj.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.35) {
          obj.vx += (dx / dist) * dt * 1.2;
          obj.vy += (dy / dist) * dt * 1.2;
        }
      }

      // Collision with Chompy's mouth
      const dx = obj.x - s.chompy.x;
      const dy = obj.y - catchY;
      const dist = Math.hypot(dx, dy);

      if (dist < this.catchRadius + obj.size * 0.5) {
        if (obj.category === 'hazard') {
          this.handleHazardCollision(obj, now);
        } else if (s.isStunned) {
          // Stunned — can't catch
        } else if (this.playerMouthOpen || s.chompy.mouthOpenness > 0.45) {
          this.catchObject(obj, now);
        }
      }

      // Missed — went off screen
      if (obj.y > 1.12) {
        obj.active = false;
        if (obj.category === 'food' || obj.category === 'collectible') {
          s.totalMissed++;
          s.combo = 0;
          this.spawnParticle(obj.x, 1.0, '💨', 'spark');
        }
      }
    }

    // Cleanup inactive objects
    s.objects = s.objects.filter(o => o.active);
  }

  private catchObject(obj: FallingObject, now: number): void {
    const s = this.state;
    obj.caught = true;
    obj.catchTime = now;
    s.totalCaught++;

    let points = obj.points;
    const isGolden = this.hasPowerUp('golden_mouth');

    if (obj.category === 'powerup') {
      this.activatePowerUp(obj.subtype);
      this.spawnBurst(obj.x, obj.y, obj.glowColor, 12);
      s.chompy.reaction = 'powerup';
      s.chompy.reactionTimer = 2;
      this.onCatch?.({ caught: true, obj, pointsAwarded: 0, isBomb: false, isHazard: false, powerUpActivated: obj.subtype });
      return;
    }

    // Combo
    s.combo++;
    if (s.combo > s.maxCombo) s.maxCombo = s.combo;

    // Score with multiplier
    const comboMult = Math.min(5, 1 + Math.floor((s.combo - 1) / 3) * 0.5);
    const goldenMult = isGolden ? 2 : 1;
    points = Math.round(points * comboMult * goldenMult);
    s.score += points;

    if (obj.subtype === 'coin' || obj.subtype === 'gold_coin') s.coinsEarned += obj.subtype === 'coin' ? 1 : 3;
    if (obj.subtype === 'diamond') s.diamondsEarned++;

    // Chompy reaction
    if (obj.subtype === 'diamond' || obj.subtype === 'treasure') {
      s.chompy.reaction = 'excited';
      s.chompy.reactionTimer = 1.5;
      s.chompy.eyeScale = 1.4;
    } else {
      s.chompy.reaction = 'happy';
      s.chompy.reactionTimer = 0.6;
    }
    s.chompy.bounceVY = -0.3;

    this.spawnBurst(obj.x, obj.y, obj.glowColor, obj.subtype === 'diamond' ? 16 : 8);
    this.spawnScoreParticle(obj.x, obj.y, `+${points}`);

    this.onCatch?.({ caught: true, obj, pointsAwarded: points, isBomb: false, isHazard: false });
  }

  private handleHazardCollision(obj: FallingObject, now: number): void {
    const s = this.state;

    if (obj.subtype === 'bomb') {
      obj.active = false;
      s.screenShake = 1;
      s.combo = 0;
      s.lives = Math.max(0, s.lives - 1);
      s.chompy.reaction = 'stunned';
      s.chompy.reactionTimer = 1.5;
      this.spawnBurst(obj.x, obj.y, '#ff4400', 20);
      this.onCatch?.({ caught: true, obj, pointsAwarded: 0, isBomb: true, isHazard: true });
      if (s.lives <= 0) this.triggerGameOver();
      else this.onLifeLost?.();
    } else if (obj.subtype === 'chili') {
      if (!s.isStunned) {
        obj.active = false;
        s.isStunned = true;
        s.stunEndTime = now + 3000;
        s.combo = 0;
        s.chompy.reaction = 'stunned';
        s.chompy.reactionTimer = 3;
        this.spawnBurst(obj.x, obj.y, '#ef4444', 10);
        this.onCatch?.({ caught: true, obj, pointsAwarded: 0, isBomb: false, isHazard: true });
      }
    } else {
      // rotten/mushroom — only if mouth open
      if (this.playerMouthOpen || s.chompy.mouthOpenness > 0.45) {
        obj.caught = true;
        obj.catchTime = now;
        s.score = Math.max(0, s.score + obj.points);
        s.combo = 0;
        s.chompy.reaction = 'stunned';
        s.chompy.reactionTimer = 0.8;
        this.spawnBurst(obj.x, obj.y, '#22c55e', 8);
        this.spawnScoreParticle(obj.x, obj.y, `${obj.points}`);
        this.onCatch?.({ caught: true, obj, pointsAwarded: obj.points, isBomb: false, isHazard: true });
      }
    }
  }

  private activatePowerUp(type: string): void {
    const s = this.state;
    const existing = s.activePowerUps.findIndex(p => p.type === type);
    const duration = type === 'slow_motion' ? 10000 : 15000;
    const end = performance.now() + duration;

    const labels: Record<string, [string, string]> = {
      'golden_mouth': ['✨ GOLDEN MOUTH', '#fbbf24'],
      'giant_mouth':  ['👄 GIANT MOUTH',  '#f472b6'],
      'slow_motion':  ['⏰ SLOW MOTION',  '#60a5fa'],
      'magnet':       ['🧲 COIN MAGNET',  '#f87171'],
    };
    const [label, icon] = labels[type] || [type, '⚡'];

    if (existing >= 0) {
      s.activePowerUps[existing].endTime = end;
    } else {
      s.activePowerUps.push({ type, label, icon, endTime: end });
    }
  }

  private updatePowerUps(now: number): void {
    this.state.activePowerUps = this.state.activePowerUps.filter(p => now < p.endTime);
  }

  private updateBossWave(now: number): void {
    const s = this.state;

    if (this.isBossActive) {
      s.bossWaveTimer = Math.max(0, (this.bossWaveEndTime - now) / 1000);
      if (now >= this.bossWaveEndTime) {
        this.isBossActive = false;
        s.isBossWave = false;
        s.bossWaveLabel = '';
        this.bossWaveIndex++;
        this.lastBossTime = now;
      }
      return;
    }

    // Trigger boss wave every 3 minutes
    if (s.gameTime > 30 && now - this.lastBossTime > 180000) {
      this.isBossActive = true;
      s.isBossWave = true;
      const wave = BOSS_WAVES[this.bossWaveIndex % BOSS_WAVES.length];
      s.bossWaveLabel = wave.label;
      this.bossWaveEndTime = now + wave.duration * 1000;
      this.spawnInterval = 400;
    }
  }

  private updateParticles(dt: number): void {
    const s = this.state;
    for (const p of s.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += dt * 0.5;
      p.life -= dt;
    }
    s.particles = s.particles.filter(p => p.life > 0);
  }

  private spawnBurst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.2;
      this.state.particles.push({
        id: this.particleId++,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 0.008 + Math.random() * 0.012,
        color,
        type: 'spark',
      });
    }
  }

  private spawnScoreParticle(x: number, y: number, text: string): void {
    this.state.particles.push({
      id: this.particleId++,
      x, y: y - 0.05,
      vx: (Math.random() - 0.5) * 0.05,
      vy: -0.25,
      life: 1.2,
      maxLife: 1.2,
      size: 0.025,
      color: '#fff',
      text,
      type: 'score',
    });
  }

  private spawnParticle(x: number, y: number, text: string, type: Particle['type']): void {
    this.state.particles.push({
      id: this.particleId++,
      x, y,
      vx: 0, vy: -0.1,
      life: 0.8, maxLife: 0.8,
      size: 0.025, color: '#aaa',
      text, type,
    });
  }

  private hasPowerUp(type: string): boolean {
    return this.state.activePowerUps.some(p => p.type === type && p.endTime > performance.now());
  }

  private triggerGameOver(): void {
    const s = this.state;
    s.isGameOver = true;
    s.chompy.reaction = 'gameover';
    this.onGameOver?.();
  }

  pause(): void { this.state.isPaused = true; }
  resume(): void { this.state.isPaused = false; }
  togglePause(): void { this.state.isPaused = !this.state.isPaused; }

  restart(mode: GameMode): void {
    this.state = this.createInitialState(mode);
    this.idCounter = 0;
    this.particleId = 0;
    this.lastSpawnTime = 0;
    this.lastBossTime = 0;
    this.bombDodgeStreak = 0;
    this.bossWaveIndex = 0;
    this.isBossActive = false;
    this.objectSpeed = 0.18;
    this.spawnInterval = 1200;
    this.hazardChance = 0.2;
  }
}
