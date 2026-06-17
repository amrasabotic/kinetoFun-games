// ============================================================
// LAYER 1: CAMERA / MEDIAPIPE WRAPPER
// Pure raw landmark output — zero gesture or game logic here.
// ============================================================

import type { HandFrame, HandLandmark } from "../../types";

export type HandTrackerCallback = (frame: HandFrame | null) => void;

declare global {
  interface Window {
    Hands: new (config: { locateFile: (f: string) => string }) => {
      setOptions: (opts: object) => void;
      onResults: (cb: (r: any) => void) => void;
      send: (input: { image: HTMLVideoElement }) => Promise<void>;
      close: () => void;
    };
    Camera: new (
      video: HTMLVideoElement,
      config: { onFrame: () => Promise<void>; width: number; height: number }
    ) => { start: () => void; stop: () => void };
  }
}

export class HandTracker {
  private hands: ReturnType<Window["Hands"]> | null = null;
  private camera: ReturnType<Window["Camera"]> | null = null;
  private running = false;

  constructor(
    private video: HTMLVideoElement,
    private onFrame: HandTrackerCallback
  ) {}

  async start(): Promise<void> {
    if (this.running) return;

    this.hands = new window.Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults(this.handleResults.bind(this));

    this.camera = new window.Camera(this.video, {
      onFrame: async () => {
        if (this.hands) await this.hands.send({ image: this.video });
      },
      width: 640,
      height: 480,
    });

    this.camera.start();
    this.running = true;
  }

  stop(): void {
    this.camera?.stop();
    this.hands?.close();
    this.camera = null;
    this.hands = null;
    this.running = false;
  }

  isActive(): boolean {
    return this.running;
  }

  private handleResults(results: any): void {
    if (!results.multiHandLandmarks?.length) {
      this.onFrame(null);
      return;
    }

    const frame: HandFrame = {
      timestamp: performance.now(),
      landmarks: results.multiHandLandmarks[0] as HandLandmark[],
      handedness: (results.multiHandedness?.[0]?.label as "Left" | "Right") ?? "Right",
      worldLandmarks: results.multiHandWorldLandmarks?.[0],
    };

    this.onFrame(frame);
  }
}
