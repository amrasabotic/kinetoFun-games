// Global declarations for MediaPipe libraries loaded from CDN scripts

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface PoseResults {
  poseLandmarks?: PoseLandmark[];
  poseWorldLandmarks?: PoseLandmark[];
  segmentationMask?: ImageData;
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
}

interface HandResults {
  multiHandLandmarks?: HandLandmark[][];
  multiHandedness?: Array<{ label: string; score: number; index: number }>;
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
}

interface PoseConfig {
  locateFile: (file: string) => string;
}

interface PoseOptions {
  modelComplexity?: number;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  smoothSegmentation?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  selfieMode?: boolean;
}

interface HandsConfig {
  locateFile: (file: string) => string;
}

interface HandsOptions {
  maxNumHands?: number;
  modelComplexity?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

interface CameraOptions {
  onFrame: () => Promise<void>;
  width?: number;
  height?: number;
  facingMode?: string;
}

declare class Pose {
  constructor(config: PoseConfig);
  setOptions(options: PoseOptions): void;
  onResults(callback: (results: PoseResults) => void): void;
  send(inputs: { image: HTMLVideoElement | HTMLCanvasElement }): Promise<void>;
  close(): void;
}

declare class Hands {
  constructor(config: HandsConfig);
  setOptions(options: HandsOptions): void;
  onResults(callback: (results: HandResults) => void): void;
  send(inputs: { image: HTMLVideoElement | HTMLCanvasElement }): Promise<void>;
  close(): void;
}

declare class Camera {
  constructor(videoElement: HTMLVideoElement, options: CameraOptions);
  start(): Promise<void>;
  stop(): void;
}

declare function drawConnectors(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[] | HandLandmark[],
  connections: [number, number][],
  style?: { color?: string; lineWidth?: number }
): void;

declare function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[] | HandLandmark[],
  style?: { color?: string; lineWidth?: number; radius?: number }
): void;

declare const POSE_CONNECTIONS: [number, number][];
declare const HAND_CONNECTIONS: [number, number][];
