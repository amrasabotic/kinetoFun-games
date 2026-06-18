// Canvas (logical resolution — CSS scales to fit)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 300;
export const GROUND_Y = 255;

// Player
export const PLAYER_X = 80;
export const PLAYER_RUN_WIDTH = 44;
export const PLAYER_RUN_HEIGHT = 54;
export const PLAYER_DUCK_WIDTH = 64;
export const PLAYER_DUCK_HEIGHT = 34;

// Physics — tuned to Chrome Dino feel: smooth arc, predictable clearance
export const GRAVITY = 0.6;
export const JUMP_VELOCITY = -12;

// Speed
export const INITIAL_SPEED = 6;
export const MAX_SPEED = 20;
export const SPEED_INCREMENT = 0.0008; // per frame

// Scoring
export const SCORE_PER_FRAME = 0.1;
export const MILESTONE_INTERVAL = 100;
export const MILESTONE_FLASH_FRAMES = 30;

// Night cycle
export const NIGHT_CYCLE_INTERVAL = 700;

// Obstacle spawning
export const OBSTACLE_MIN_GAP = 45;
export const OBSTACLE_MAX_GAP = 130;

// Bird heights above ground
export const BIRD_Y_LOW = GROUND_Y - 44;   // passable by ducking
export const BIRD_Y_MID = GROUND_Y - 84;   // requires ducking or precision timing
export const BIRD_Y_HIGH = GROUND_Y - 120; // passable by running under

// Bird size
export const BIRD_WIDTH = 46;
export const BIRD_HEIGHT = 32;

// Animations
export const RUN_ANIM_INTERVAL = 6;   // frames per leg switch
export const BIRD_ANIM_INTERVAL = 8;  // frames per wing flap

// Clouds
export const CLOUD_SPEED_RATIO = 0.28;
export const CLOUD_MIN_GAP = 100;
export const CLOUD_MAX_GAP = 280;
