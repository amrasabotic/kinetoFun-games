// Pseudo-3D depth
export const MAX_Z = 800;
export const COLLISION_Z = 45;

// Lane and projection
export const LANE_WIDTH_FACTOR = 0.13; // fraction of canvas width per lane at player level
export const PLAYER_Y_FACTOR = 0.78;  // player Y as fraction of canvas height
export const HORIZON_Y_FACTOR = 0.32;

// Physics
export const JUMP_VELOCITY = -8; // m/s (negative = up)
export const GRAVITY = 18;       // m/s^2
export const SLIDE_DURATION = 0.8; // seconds
export const LANE_TRANSITION_SPEED = 4; // 0-1 per second

// Game speed
export const INITIAL_SPEED = 200;   // units/s
export const MAX_SPEED = 700;
export const SPEED_INCREASE_RATE = 3; // units/s per second

// Scoring
export const COIN_SCORE = 10;
export const DISTANCE_SCORE_RATE = 1; // points per unit of distance

// Menu navigation
export const DWELL_TIME = 900; // ms

// Spawn intervals (seconds)
export const OBSTACLE_SPAWN_INTERVAL_INITIAL = 1.8;
export const OBSTACLE_SPAWN_INTERVAL_MIN = 0.6;
export const COIN_SPAWN_INTERVAL = 1.2;
export const POWER_UP_SPAWN_INTERVAL = 22;

// Power-up durations (seconds)
export const MAGNET_DURATION = 10;
export const SPEED_BOOST_DURATION = 5;
export const DOUBLE_COINS_DURATION = 15;

// Environment cycling distance
export const ENVIRONMENT_CYCLE_DISTANCE = 1500;

// Calibration
export const STABLE_FRAMES_REQUIRED = 90;

// Difficulty
export const DIFFICULTY_INCREASE_RATE = 0.002; // per second

// Particle limits
export const MAX_PARTICLES = 80;

// Countdown
export const COUNTDOWN_DURATION = 1.0; // seconds per number

// Magnet attraction range
export const MAGNET_RANGE_Z = 250;
