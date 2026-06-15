import type {
  GameState,
  GamePhase,
  Lane,
  ObstacleEntity,
  CoinEntity,
  PowerUpEntity,
  Particle,
  ObstacleType,
  PowerUpType,
  CharacterId,
  Environment,
} from '../types/game';
import type { GestureInput } from '../types/game';
import type { HandPosition } from '../types/gestures';
import type { GameSettings } from '../types/gestures';
import {
  MAX_Z,
  COLLISION_Z,
  JUMP_VELOCITY,
  GRAVITY,
  SLIDE_DURATION,
  LANE_TRANSITION_SPEED,
  INITIAL_SPEED,
  MAX_SPEED,
  SPEED_INCREASE_RATE,
  COIN_SCORE,
  DISTANCE_SCORE_RATE,
  OBSTACLE_SPAWN_INTERVAL_INITIAL,
  OBSTACLE_SPAWN_INTERVAL_MIN,
  COIN_SPAWN_INTERVAL,
  POWER_UP_SPAWN_INTERVAL,
  MAGNET_DURATION,
  SPEED_BOOST_DURATION,
  DOUBLE_COINS_DURATION,
  ENVIRONMENT_CYCLE_DISTANCE,
  COUNTDOWN_DURATION,
  MAX_PARTICLES,
  DIFFICULTY_INCREASE_RATE,
  MAGNET_RANGE_Z,
} from '../utils/constants';
import { lerp, rnd, rndInt, rndChoice, clamp } from '../utils/math';
import { drawScene } from './renderer';
import { getAudioManager } from '../audio/AudioManager';

const ENVIRONMENTS: Environment[] = ['neon-city', 'jungle', 'desert', 'snow'];
const LANES: Lane[] = [-1, 0, 1];
const OBSTACLE_TYPES: ObstacleType[] = ['cone', 'crate', 'barrier', 'ball', 'low-block', 'high-arch'];

function makeId(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

function initialState(characterId: CharacterId, highScore: number): GameState {
  return {
    phase: 'countdown',
    score: 0,
    coins: 0,
    distance: 0,
    speed: INITIAL_SPEED,
    time: 0,
    player: {
      lane: 0,
      targetLane: 0,
      laneTransitionProgress: 1,
      x: 0,
      y: 0,
      isJumping: false,
      jumpVelocity: 0,
      isSliding: false,
      slideDuration: 0,
      hasShield: false,
      characterId,
    },
    obstacles: [],
    coinEntities: [],
    powerUpEntities: [],
    particles: [],
    activePowerUps: {
      magnet: 0,
      shield: false,
      speed: 0,
      doubleCoins: 0,
    },
    environment: 'neon-city',
    countdownValue: 3,
    countdownTimer: COUNTDOWN_DURATION,
    difficulty: 1,
    lastObstacleZ: { [-1]: MAX_Z, 0: MAX_Z, 1: MAX_Z },
    spawnTimers: {
      obstacle: OBSTACLE_SPAWN_INTERVAL_INITIAL,
      coin: COIN_SPAWN_INTERVAL,
      powerUp: POWER_UP_SPAWN_INTERVAL,
    },
    environmentDistance: 0,
    nextParticleId: 0,
    nextEntityId: 0,
    highScore,
  };
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  state: GameState;
  private lastTs = 0;
  private rafId: number | null = null;
  private settings: GameSettings = {
    jumpSensitivity: 3,
    slideSensitivity: 3,
    leanSensitivity: 3,
    musicEnabled: true,
    sfxEnabled: true,
    highContrast: false,
    reducedMotion: false,
  };

  onScoreUpdate: ((score: number, coins: number, distance: number) => void) | null = null;
  onGameOver: ((state: GameState) => void) | null = null;
  onPhaseChange: ((phase: GamePhase) => void) | null = null;
  onActivePowerUpsChange: ((pu: GameState['activePowerUps']) => void) | null = null;

  latestGesture: GestureInput | null = null;
  handPositions: HandPosition[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.state = initialState('starter', 0);
  }

  startNewGame(characterId: CharacterId, settings: GameSettings, highScore = 0): void {
    this.settings = settings;
    this.state = initialState(characterId, highScore);
    this.lastTs = 0;

    const audio = getAudioManager();
    audio.setMusicEnabled(settings.musicEnabled);
    audio.setSfxEnabled(settings.sfxEnabled);
    audio.sfxCountdown();

    this.setPhase('countdown');
    this.startLoop();
  }

  pause(): void {
    if (this.state.phase !== 'play') return;
    this.setPhase('paused');
  }

  resume(): void {
    if (this.state.phase !== 'paused') return;
    this.lastTs = 0; // reset to avoid dt spike
    this.setPhase('play');
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    getAudioManager().stopMusic();
  }

  private setPhase(phase: GamePhase): void {
    this.state.phase = phase;
    this.onPhaseChange?.(phase);
  }

  private startLoop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    const tick = (ts: number) => {
      this.loop(ts);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private loop(ts: number): void {
    if (this.lastTs === 0) this.lastTs = ts;
    const dt = Math.min((ts - this.lastTs) / 1000, 0.1); // cap at 100ms
    this.lastTs = ts;

    this.update(dt);

    const W = this.canvas.width;
    const H = this.canvas.height;
    drawScene(this.ctx, this.state, W, H, ts / 1000);
  }

  private update(dt: number): void {
    const s = this.state;
    const audio = getAudioManager();

    switch (s.phase) {
      case 'countdown':
        this.updateCountdown(dt, audio);
        break;
      case 'play':
        this.updatePlay(dt, audio);
        break;
      case 'dead':
        // Brief death pause before gameover
        s.countdownTimer -= dt;
        if (s.countdownTimer <= 0) {
          this.setPhase('gameover');
          this.onGameOver?.(s);
        }
        break;
      case 'paused':
      case 'gameover':
      case 'idle':
        break;
    }
  }

  private updateCountdown(dt: number, audio: ReturnType<typeof getAudioManager>): void {
    const s = this.state;
    s.countdownTimer -= dt;
    if (s.countdownTimer <= 0) {
      if (s.countdownValue > 0) {
        s.countdownValue -= 1;
        s.countdownTimer = COUNTDOWN_DURATION;
        if (s.countdownValue > 0) {
          audio.sfxCountdown();
        } else {
          audio.sfxCountdownGo();
          audio.startMusic(s.environment);
          this.setPhase('play');
        }
      }
    }
  }

  private updatePlay(dt: number, audio: ReturnType<typeof getAudioManager>): void {
    const s = this.state;

    // Process gestures
    this.processGestures(audio);

    // Update physics
    this.updatePlayer(dt);
    this.updateDifficulty(dt);

    // Move world
    const effectiveSpeed = s.activePowerUps.speed > 0 ? s.speed * 1.5 : s.speed;
    const distanceDelta = effectiveSpeed * dt;
    s.distance += distanceDelta;
    s.environmentDistance += distanceDelta;
    s.time += dt;
    s.score += distanceDelta * DISTANCE_SCORE_RATE;

    // Update obstacles
    this.updateObstacles(dt, effectiveSpeed);
    this.updateCoins(dt, effectiveSpeed, audio);
    this.updatePowerUps(dt, effectiveSpeed, audio);
    this.updateParticles(dt);

    // Check collisions
    this.checkCollisions(audio);

    // Update power-up timers
    this.updatePowerUpTimers(dt, audio);

    // Spawn
    this.updateSpawners(dt, effectiveSpeed);

    // Environment cycling
    if (s.environmentDistance >= ENVIRONMENT_CYCLE_DISTANCE) {
      s.environmentDistance -= ENVIRONMENT_CYCLE_DISTANCE;
      const currentIdx = ENVIRONMENTS.indexOf(s.environment);
      s.environment = ENVIRONMENTS[(currentIdx + 1) % ENVIRONMENTS.length];
      audio.startMusic(s.environment);
    }

    // Notify score
    this.onScoreUpdate?.(Math.floor(s.score), s.coins, Math.floor(s.distance));
    this.onActivePowerUpsChange?.(s.activePowerUps);
  }

  private processGestures(audio: ReturnType<typeof getAudioManager>): void {
    const s = this.state;
    const g = this.latestGesture;
    if (!g) return;

    if (g.jump && !s.player.isJumping) {
      s.player.isJumping = true;
      s.player.jumpVelocity = JUMP_VELOCITY;
      audio.sfxJump();
    }

    if (g.slide && !s.player.isSliding && !s.player.isJumping) {
      s.player.isSliding = true;
      s.player.slideDuration = SLIDE_DURATION;
      audio.sfxSlide();
    }

    if (g.leanLeft && s.player.laneTransitionProgress >= 0.9) {
      const newLane = clamp(s.player.lane - 1, -1, 1) as Lane;
      if (newLane !== s.player.lane) {
        s.player.targetLane = newLane;
        s.player.laneTransitionProgress = 0;
        audio.sfxLaneChange();
      }
    }

    if (g.leanRight && s.player.laneTransitionProgress >= 0.9) {
      const newLane = clamp(s.player.lane + 1, -1, 1) as Lane;
      if (newLane !== s.player.lane) {
        s.player.targetLane = newLane;
        s.player.laneTransitionProgress = 0;
        audio.sfxLaneChange();
      }
    }

    // Clear consumed gestures
    this.latestGesture = null;
  }

  private updatePlayer(dt: number): void {
    const p = this.state.player;

    // Jump physics
    if (p.isJumping) {
      p.jumpVelocity += GRAVITY * dt;
      p.y -= p.jumpVelocity * dt; // y is height above ground, jumpVelocity negative = up
      if (p.y <= 0) {
        p.y = 0;
        p.isJumping = false;
        p.jumpVelocity = 0;
      }
    }

    // Slide countdown
    if (p.isSliding) {
      p.slideDuration -= dt;
      if (p.slideDuration <= 0) {
        p.isSliding = false;
        p.slideDuration = 0;
      }
    }

    // Lane transition
    if (p.laneTransitionProgress < 1) {
      p.laneTransitionProgress = Math.min(1, p.laneTransitionProgress + LANE_TRANSITION_SPEED * dt);
      if (p.laneTransitionProgress >= 1) {
        p.lane = p.targetLane;
        p.laneTransitionProgress = 1;
      }
    }
  }

  private updateObstacles(dt: number, speed: number): void {
    const s = this.state;
    for (const ob of s.obstacles) {
      if (!ob.active) continue;
      ob.z -= speed * dt;
      if (ob.z < -COLLISION_Z * 2) {
        ob.active = false;
      }
    }
  }

  private updateCoins(dt: number, speed: number, audio: ReturnType<typeof getAudioManager>): void {
    const s = this.state;
    for (const coin of s.coinEntities) {
      if (!coin.active || coin.collected) continue;
      coin.z -= speed * dt;

      // Magnet: attract toward player lane
      if (s.activePowerUps.magnet > 0 && coin.z < MAGNET_RANGE_Z) {
        const targetLane = s.player.lane;
        if (coin.lane !== targetLane) {
          // Instantly snap to player lane within range
          coin.lane = targetLane;
        }
        // Accelerate toward player
        coin.z -= speed * dt * 0.5;
      }

      if (coin.z < -COLLISION_Z * 2) {
        coin.active = false;
      }
    }
  }

  private updatePowerUps(dt: number, speed: number, audio: ReturnType<typeof getAudioManager>): void {
    const s = this.state;
    for (const pu of s.powerUpEntities) {
      if (!pu.active || pu.collected) continue;
      pu.z -= speed * dt;
      if (pu.z < -COLLISION_Z * 2) {
        pu.active = false;
      }
    }
  }

  private updatePowerUpTimers(dt: number, audio: ReturnType<typeof getAudioManager>): void {
    const pu = this.state.activePowerUps;
    if (pu.magnet > 0) pu.magnet = Math.max(0, pu.magnet - dt);
    if (pu.speed > 0) pu.speed = Math.max(0, pu.speed - dt);
    if (pu.doubleCoins > 0) pu.doubleCoins = Math.max(0, pu.doubleCoins - dt);
  }

  private checkCollisions(audio: ReturnType<typeof getAudioManager>): void {
    const s = this.state;
    const p = s.player;
    const effectiveLane = p.laneTransitionProgress > 0.5 ? p.targetLane : p.lane;

    // Obstacle collisions
    for (const ob of s.obstacles) {
      if (!ob.active) continue;
      if (Math.abs(ob.z) > COLLISION_Z) continue;
      if (ob.lane !== effectiveLane) continue;

      // Check if player can avoid
      let avoided = false;

      if (ob.requiresJump && p.isJumping && p.y > 0.4) {
        // Player jumps over low-block
        avoided = true;
      }
      if (ob.requiresSlide && p.isSliding) {
        // Player slides under high-arch
        avoided = true;
      }
      // For other obstacles, lane change is the evasion (handled by lane check above)
      if (!ob.requiresJump && !ob.requiresSlide) {
        avoided = false; // same lane = hit
      }

      if (!avoided) {
        if (p.hasShield || s.activePowerUps.shield) {
          // Shield absorbs hit
          p.hasShield = false;
          s.activePowerUps.shield = false;
          ob.active = false;
          audio.sfxShield();
          this.spawnParticles(this.canvas.width / 2, this.canvas.height * 0.7, '#00ffcc', 20);
        } else {
          ob.active = false;
          this.handlePlayerDeath(audio);
          return;
        }
      }
    }

    // Coin collection
    for (const coin of s.coinEntities) {
      if (!coin.active || coin.collected) continue;
      if (Math.abs(coin.z) > COLLISION_Z) continue;
      if (coin.lane !== effectiveLane) continue;

      coin.collected = true;
      const coinValue = s.activePowerUps.doubleCoins > 0 ? 2 : 1;
      s.coins += coinValue;
      s.score += COIN_SCORE * coinValue;
      audio.sfxCoin();
      this.spawnParticles(this.canvas.width / 2, this.canvas.height * 0.75, '#ffe04d', 8);
    }

    // Power-up collection
    for (const pu of s.powerUpEntities) {
      if (!pu.active || pu.collected) continue;
      if (Math.abs(pu.z) > COLLISION_Z) continue;
      if (pu.lane !== effectiveLane) continue;

      pu.collected = true;
      this.activatePowerUp(pu.type, audio);
    }
  }

  private activatePowerUp(type: PowerUpType, audio: ReturnType<typeof getAudioManager>): void {
    const pu = this.state.activePowerUps;
    switch (type) {
      case 'magnet': pu.magnet = MAGNET_DURATION; break;
      case 'shield': pu.shield = true; break;
      case 'speed': pu.speed = SPEED_BOOST_DURATION; break;
      case 'double-coins': pu.doubleCoins = DOUBLE_COINS_DURATION; break;
    }
    audio.sfxPowerUp();
    this.spawnParticles(this.canvas.width / 2, this.canvas.height * 0.7, '#ff8800', 15);
  }

  private updateSpawners(dt: number, speed: number): void {
    const s = this.state;
    const t = s.spawnTimers;

    t.obstacle -= dt;
    t.coin -= dt;
    t.powerUp -= dt;

    const minInterval = Math.max(
      OBSTACLE_SPAWN_INTERVAL_MIN,
      OBSTACLE_SPAWN_INTERVAL_INITIAL - s.difficulty * 0.12
    );

    if (t.obstacle <= 0) {
      this.spawnObstacle();
      t.obstacle = rnd(minInterval * 0.8, minInterval * 1.4);
    }

    if (t.coin <= 0) {
      this.spawnCoin();
      t.coin = rnd(COIN_SPAWN_INTERVAL * 0.7, COIN_SPAWN_INTERVAL * 1.3);
    }

    if (t.powerUp <= 0) {
      this.spawnPowerUp();
      t.powerUp = rnd(POWER_UP_SPAWN_INTERVAL * 0.8, POWER_UP_SPAWN_INTERVAL * 1.5);
    }
  }

  private spawnObstacle(): void {
    const s = this.state;
    const lane = rndChoice(LANES);

    // Ensure minimum Z gap
    if (s.lastObstacleZ[lane] !== undefined && s.lastObstacleZ[lane] > MAX_Z * 0.6) {
      return; // too close to last obstacle in this lane
    }

    let type: ObstacleType;
    if (s.difficulty > 5) {
      type = rndChoice(OBSTACLE_TYPES);
    } else if (s.difficulty > 3) {
      type = rndChoice(['cone', 'crate', 'barrier', 'ball', 'low-block', 'high-arch'] as ObstacleType[]);
    } else {
      type = rndChoice(['cone', 'crate', 'barrier'] as ObstacleType[]);
    }

    const requiresSlide = type === 'high-arch';
    const requiresJump = type === 'low-block';

    const id = makeId('ob', s.nextEntityId++);
    s.obstacles.push({
      id,
      type,
      lane,
      z: MAX_Z,
      width: 1,
      height: 1,
      requiresSlide,
      requiresJump,
      active: true,
    });

    s.lastObstacleZ[lane] = MAX_Z;

    // Combo obstacles at high difficulty
    if (s.difficulty > 4 && Math.random() < 0.3) {
      const comboType: ObstacleType = rndChoice(['cone', 'crate', 'low-block']);
      const comboZ = MAX_Z - rnd(150, 250);
      s.obstacles.push({
        id: makeId('ob', s.nextEntityId++),
        type: comboType,
        lane,
        z: comboZ,
        width: 1,
        height: 1,
        requiresSlide: false,
        requiresJump: comboType === 'low-block',
        active: true,
      });
    }
  }

  private spawnCoin(): void {
    const s = this.state;
    const lane = rndChoice(LANES);
    const lineLength = rndInt(3, 7);
    const spacing = rnd(55, 80);

    for (let i = 0; i < lineLength; i++) {
      s.coinEntities.push({
        id: makeId('coin', s.nextEntityId++),
        lane,
        z: MAX_Z - i * spacing,
        collected: false,
        active: true,
      });
    }
  }

  private spawnPowerUp(): void {
    const s = this.state;
    const types: PowerUpType[] = ['magnet', 'shield', 'speed', 'double-coins'];
    const type = rndChoice(types);
    const lane = rndChoice(LANES);

    s.powerUpEntities.push({
      id: makeId('pu', s.nextEntityId++),
      type,
      lane,
      z: MAX_Z,
      collected: false,
      active: true,
    });
  }

  private updateDifficulty(dt: number): void {
    const s = this.state;
    s.difficulty = Math.min(10, 1 + s.time * DIFFICULTY_INCREASE_RATE);
    s.speed = Math.min(MAX_SPEED, INITIAL_SPEED + s.time * SPEED_INCREASE_RATE);
  }

  private spawnParticles(x: number, y: number, color: string, count: number): void {
    const s = this.state;
    const active = s.particles.filter((p) => p.active);
    if (active.length >= MAX_PARTICLES) return;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + rnd(-0.3, 0.3);
      const speed = rnd(50, 150);
      s.particles.push({
        id: makeId('pt', s.nextParticleId++),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 1,
        maxLife: rnd(0.5, 1.0),
        color,
        size: rnd(3, 8),
        active: true,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.state.particles) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
      p.life -= dt / p.maxLife;
      if (p.life <= 0) p.active = false;
    }

    // Prune dead particles periodically
    if (this.state.particles.length > MAX_PARTICLES * 2) {
      this.state.particles = this.state.particles.filter((p) => p.active);
    }
  }

  private handlePlayerDeath(audio: ReturnType<typeof getAudioManager>): void {
    audio.sfxCollision();
    audio.stopMusic();
    const s = this.state;
    this.spawnParticles(this.canvas.width / 2, this.canvas.height * 0.7, '#ff3333', 30);
    s.finalScore = Math.floor(s.score);
    s.countdownTimer = 1.5; // 1.5s death pause
    this.setPhase('dead');

    // Store result in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'gesture-runner:last-result',
        JSON.stringify({
          score: Math.floor(s.score),
          coins: s.coins,
          distance: Math.floor(s.distance),
          time: Math.floor(s.time),
        })
      );
    }
  }
}
