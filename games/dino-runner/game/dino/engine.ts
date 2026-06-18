import type { GameState, GestureState, Obstacle, ObstacleType, Cloud, Player } from './types';
import {
  CANVAS_WIDTH,
  GROUND_Y,
  PLAYER_X,
  PLAYER_RUN_WIDTH,
  PLAYER_RUN_HEIGHT,
  PLAYER_DUCK_WIDTH,
  PLAYER_DUCK_HEIGHT,
  GRAVITY,
  JUMP_VELOCITY,
  INITIAL_SPEED,
  MAX_SPEED,
  SPEED_INCREMENT,
  SCORE_PER_FRAME,
  MILESTONE_INTERVAL,
  MILESTONE_FLASH_FRAMES,
  NIGHT_CYCLE_INTERVAL,
  OBSTACLE_MIN_GAP,
  OBSTACLE_MAX_GAP,
  BIRD_Y_LOW,
  BIRD_Y_MID,
  BIRD_Y_HIGH,
  BIRD_WIDTH,
  BIRD_HEIGHT,
  RUN_ANIM_INTERVAL,
  BIRD_ANIM_INTERVAL,
  CLOUD_SPEED_RATIO,
  CLOUD_MIN_GAP,
  CLOUD_MAX_GAP,
} from './constants';

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makePlayer(): Player {
  return {
    x: PLAYER_X,
    y: GROUND_Y - PLAYER_RUN_HEIGHT,
    width: PLAYER_RUN_WIDTH,
    height: PLAYER_RUN_HEIGHT,
    velocityY: 0,
    state: 'running',
    onGround: true,
    animFrame: 0,
    animTimer: RUN_ANIM_INTERVAL,
    bounceOffset: 0,
    bounceVelocity: 0,
  };
}

export function createInitialState(highScore: number): GameState {
  return {
    phase: 'idle',
    score: 0,
    highScore,
    speed: INITIAL_SPEED,
    player: makePlayer(),
    obstacles: [],
    clouds: [],
    frameCount: 0,
    nextObstacleIn: 80,
    nextCloudIn: 60,
    milestoneFlash: 0,
    isNight: false,
    nextNightAt: NIGHT_CYCLE_INTERVAL,
    obstacleIdCounter: 0,
    cloudIdCounter: 0,
  };
}

export function startGame(highScore: number): GameState {
  return { ...createInitialState(highScore), phase: 'running' };
}

// ── Obstacle spawning ──────────────────────────────────────────────────────────

function spawnObstacle(state: GameState): Obstacle {
  const speedRatio = (state.speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);
  const birdChance = Math.min(0.3, speedRatio * 0.38);

  let type: ObstacleType;
  if (Math.random() < birdChance) {
    type = 'bird';
  } else {
    const groundTypes: ObstacleType[] = ['cactus-small', 'cactus-medium', 'cactus-large'];
    type = groundTypes[Math.floor(Math.random() * groundTypes.length)];
  }

  let width: number, height: number, y: number;

  switch (type) {
    case 'cactus-small':
      width = 20; height = 40; y = GROUND_Y - 40; break;
    case 'cactus-medium':
      width = 25; height = 55; y = GROUND_Y - 55; break;
    case 'cactus-large':
      width = 52; height = 55; y = GROUND_Y - 55; break;
    case 'bird': {
      const opts = [BIRD_Y_LOW, BIRD_Y_MID, BIRD_Y_HIGH];
      y = opts[rand(0, 2)];
      width = BIRD_WIDTH;
      height = BIRD_HEIGHT;
      break;
    }
    default:
      width = 20; height = 40; y = GROUND_Y - 40;
  }

  return {
    id: state.obstacleIdCounter + 1,
    x: CANVAS_WIDTH + 10,
    y,
    width,
    height,
    type,
    animFrame: 0,
    animTimer: BIRD_ANIM_INTERVAL,
  };
}

function obstacleGap(state: GameState): number {
  const speedRatio = (state.speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);
  const min = Math.max(30, OBSTACLE_MIN_GAP - speedRatio * 15);
  const max = Math.max(60, OBSTACLE_MAX_GAP - speedRatio * 35);
  return rand(Math.floor(min), Math.floor(max));
}

function spawnCloud(state: GameState): Cloud {
  return {
    id: state.cloudIdCounter + 1,
    x: CANVAS_WIDTH + 40,
    y: rand(20, 90),
    width: rand(60, 130),
  };
}

// ── Collision ─────────────────────────────────────────────────────────────────

function hitbox(e: { x: number; y: number; width: number; height: number }, pad: number) {
  const px = e.width * pad;
  const py = e.height * pad;
  return { x: e.x + px, y: e.y + py, w: e.width - px * 2, h: e.height - py * 2 };
}

function collides(player: Player, obs: Obstacle): boolean {
  const p = hitbox(player, 0.15);
  const o = hitbox(obs, 0.08);
  return p.x < o.x + o.w && p.x + p.w > o.x && p.y < o.y + o.h && p.y + p.h > o.y;
}

// ── Main update (mutates state in place for 60 fps performance) ───────────────

export function updateGame(state: GameState, gesture: GestureState): void {
  if (state.phase !== 'running') return;

  const { player } = state;

  // ── Gesture → player intent ──────────────────────────────────────────────
  if (player.onGround) {
    if (gesture === 'duck') {
      if (player.state !== 'ducking') {
        player.state = 'ducking';
        player.width = PLAYER_DUCK_WIDTH;
        player.height = PLAYER_DUCK_HEIGHT;
        player.y = GROUND_Y - PLAYER_DUCK_HEIGHT;
      }
    } else {
      // Stand up from duck
      if (player.state === 'ducking') {
        player.state = 'running';
        player.width = PLAYER_RUN_WIDTH;
        player.height = PLAYER_RUN_HEIGHT;
        player.y = GROUND_Y - PLAYER_RUN_HEIGHT;
      }
      // Jump
      if (gesture === 'jump') {
        player.velocityY = JUMP_VELOCITY;
        player.state = 'jumping';
        player.onGround = false;
      }
    }
  }

  // ── Physics ──────────────────────────────────────────────────────────────
  if (!player.onGround) {
    player.velocityY += GRAVITY;
    player.y += player.velocityY;

    if (player.y >= GROUND_Y - player.height) {
      player.y = GROUND_Y - player.height;
      player.velocityY = 0;
      player.onGround = true;
      player.state = gesture === 'duck' ? 'ducking' : 'running';
      if (player.state === 'ducking') {
        player.width = PLAYER_DUCK_WIDTH;
        player.height = PLAYER_DUCK_HEIGHT;
      } else {
        player.width = PLAYER_RUN_WIDTH;
        player.height = PLAYER_RUN_HEIGHT;
      }
      // Landing bounce
      player.bounceOffset = 5;
      player.bounceVelocity = -0.5;
    }
  }

  // Landing bounce decay
  if (player.bounceOffset > 0) {
    player.bounceVelocity += 0.18;
    player.bounceOffset += player.bounceVelocity;
    if (player.bounceOffset <= 0) {
      player.bounceOffset = 0;
      player.bounceVelocity = 0;
    }
  }

  // ── Run animation ────────────────────────────────────────────────────────
  if (player.state === 'running' || player.state === 'ducking') {
    player.animTimer--;
    if (player.animTimer <= 0) {
      player.animFrame ^= 1;
      player.animTimer = RUN_ANIM_INTERVAL;
    }
  }

  // ── Speed ramp ───────────────────────────────────────────────────────────
  if (state.speed < MAX_SPEED) {
    state.speed = Math.min(MAX_SPEED, state.speed + SPEED_INCREMENT);
  }

  // ── Score ────────────────────────────────────────────────────────────────
  const prevScore = state.score;
  state.score += SCORE_PER_FRAME;
  state.frameCount++;

  // Milestone flash
  if (
    Math.floor(state.score / MILESTONE_INTERVAL) >
    Math.floor(prevScore / MILESTONE_INTERVAL) &&
    Math.floor(state.score / MILESTONE_INTERVAL) > 0
  ) {
    state.milestoneFlash = MILESTONE_FLASH_FRAMES;
  }
  if (state.milestoneFlash > 0) state.milestoneFlash--;

  // Night cycle
  if (state.score >= state.nextNightAt) {
    state.isNight = !state.isNight;
    state.nextNightAt += NIGHT_CYCLE_INTERVAL;
  }

  // ── Obstacles ────────────────────────────────────────────────────────────
  state.nextObstacleIn--;
  if (state.nextObstacleIn <= 0) {
    state.obstacleIdCounter++;
    state.obstacles.push(spawnObstacle(state));
    state.nextObstacleIn = obstacleGap(state);
  }

  for (let i = state.obstacles.length - 1; i >= 0; i--) {
    const obs = state.obstacles[i];
    obs.x -= state.speed;

    if (obs.type === 'bird') {
      obs.animTimer--;
      if (obs.animTimer <= 0) {
        obs.animFrame ^= 1;
        obs.animTimer = BIRD_ANIM_INTERVAL;
      }
    }

    if (obs.x + obs.width < 0) {
      state.obstacles.splice(i, 1);
      continue;
    }

    if (collides(player, obs)) {
      state.phase = 'gameover';
      if (state.score > state.highScore) state.highScore = state.score;
      return;
    }
  }

  // ── Clouds ───────────────────────────────────────────────────────────────
  state.nextCloudIn--;
  if (state.nextCloudIn <= 0) {
    state.cloudIdCounter++;
    state.clouds.push(spawnCloud(state));
    state.nextCloudIn = rand(CLOUD_MIN_GAP, CLOUD_MAX_GAP);
  }
  for (let i = state.clouds.length - 1; i >= 0; i--) {
    state.clouds[i].x -= state.speed * CLOUD_SPEED_RATIO;
    if (state.clouds[i].x + state.clouds[i].width < 0) {
      state.clouds.splice(i, 1);
    }
  }
}
