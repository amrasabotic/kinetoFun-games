/**
 * MediaPipe Hands TypeScript declarations.
 * Globals loaded via CDN in index.html (synchronous, pinned versions).
 */

declare interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

declare interface HandsResults {
  multiHandLandmarks: NormalizedLandmark[][];
  multiHandedness: Array<{ label: string; score: number }>;
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
}

declare interface HandsOptions {
  locateFile?: (file: string) => string;
}

declare interface HandsSetOptions {
  maxNumHands?: number;
  modelComplexity?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

declare class Hands {
  constructor(config?: HandsOptions);
  setOptions(options: HandsSetOptions): void;
  initialize(): Promise<void>;
  send(input: { image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement }): Promise<void>;
  onResults(callback: (results: HandsResults) => void): void;
  close(): Promise<void>;
}

declare interface CameraConfig {
  // MediaPipe Camera does NOT pass a canvas to onFrame — send the video element directly.
  onFrame: () => Promise<void>;
  width?: number;
  height?: number;
}

declare class Camera {
  constructor(videoEl: HTMLVideoElement, config: CameraConfig);
  start(): Promise<void>;
  stop(): void;
}
