export interface DetectedGesture {
  jump: boolean;
  slide: boolean;
  leanLeft: boolean;
  leanRight: boolean;
}

export interface HandPosition {
  x: number; // 0-1, mirrored
  y: number; // 0-1
  visible: boolean;
  isPinching: boolean;
  isPointing: boolean;
}

export interface GameSettings {
  jumpSensitivity: number; // 1-5
  slideSensitivity: number; // 1-5
  leanSensitivity: number; // 1-5
  musicEnabled: boolean;
  sfxEnabled: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}
