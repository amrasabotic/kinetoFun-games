/**
 * MediaPipe Hands TypeScript declarations.
 * Declare the global Hands and Camera classes loaded via CDN.
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

declare class Hands {
  constructor(config?: HandsOptions);
  initialize(): Promise<void>;
  send(input: { image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement }): Promise<void>;
  onResults(callback: (results: HandsResults) => void): void;
  close(): Promise<void>;
}

declare interface CameraConfig {
  onFrame: (frame: HTMLCanvasElement) => Promise<void>;
}

declare class Camera {
  constructor(videoEl: HTMLVideoElement, config: CameraConfig);
  start(): Promise<void>;
  stop(): void;
}
