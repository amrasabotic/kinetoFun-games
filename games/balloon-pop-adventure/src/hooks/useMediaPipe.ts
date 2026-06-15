import { useEffect, useRef, useCallback } from 'react';
import type { HandCursor, MPHandsResults, MPLandmark } from '../game/types';
import { CURSOR_SMOOTHING } from '../constants/gameConfig';
import { lerp } from '../utils/mathUtils';

// ─── MediaPipe CDN types ──────────────────────────────────────────────────

declare global {
  interface Window {
    Hands: new (config: { locateFile: (f: string) => string }) => MPHands;
    Camera: new (
      video: HTMLVideoElement,
      config: { onFrame: () => Promise<void>; width: number; height: number },
    ) => MPCamera;
  }
}

interface MPHands {
  setOptions(opts: {
    maxNumHands: number;
    modelComplexity: number;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }): void;
  onResults(cb: (results: MPHandsResults) => void): void;
  send(inputs: { image: HTMLVideoElement }): Promise<void>;
  close(): Promise<void>;
}

interface MPCamera {
  start(): Promise<void>;
  stop(): void;
}

// ─── Index finger tip landmark index ─────────────────────────────────────
const INDEX_TIP = 8;
const THUMB_TIP = 4;

// ─── Hook ─────────────────────────────────────────────────────────────────

interface UseMediaPipeOptions {
  canvasWidth: number;
  canvasHeight: number;
  playerCount: 1 | 2;
  enabled: boolean;
}

export function useMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: UseMediaPipeOptions,
): React.RefObject<HandCursor[]> {
  const { canvasWidth, canvasHeight, playerCount, enabled } = options;

  const handsRef   = useRef<MPHands | null>(null);
  const cameraRef  = useRef<MPCamera | null>(null);
  const cursorsRef = useRef<HandCursor[]>([
    { x: canvasWidth * 0.35, y: canvasHeight * 0.5, prevX: 0, prevY: 0, playerId: 1, active: false },
    { x: canvasWidth * 0.65, y: canvasHeight * 0.5, prevX: 0, prevY: 0, playerId: 2, active: false },
  ]);

  // Smoothed cursor positions (separate from ref for lerp state)
  const smoothedRef = useRef([
    { x: canvasWidth * 0.35, y: canvasHeight * 0.5 },
    { x: canvasWidth * 0.65, y: canvasHeight * 0.5 },
  ]);

  const canvasRef  = useRef({ w: canvasWidth, h: canvasHeight });
  canvasRef.current = { w: canvasWidth, h: canvasHeight };

  const handleResults = useCallback((results: MPHandsResults) => {
    const { w, h } = canvasRef.current;
    const landmarks = results.multiHandLandmarks ?? [];
    const handedness = results.multiHandedness ?? [];

    // Deactivate all cursors first
    for (const c of cursorsRef.current) c.active = false;

    for (let i = 0; i < Math.min(landmarks.length, playerCount); i++) {
      const lm: MPLandmark[] = landmarks[i];
      const tip = lm[INDEX_TIP];
      // MediaPipe x is mirrored relative to the user's perspective;
      // we flip it so the cursor matches natural hand movement on screen.
      const rawX = (1 - tip.x) * w;
      const rawY = tip.y * h;

      // Assign player based on left/right hand label, or fall back to index order
      let playerIndex = i; // 0-based
      if (handedness[i]) {
        // 'Right' hand in MediaPipe is user's LEFT hand (camera-mirrored)
        playerIndex = handedness[i].label === 'Right' ? 0 : 1;
      }
      playerIndex = Math.min(playerIndex, playerCount - 1);

      const sm = smoothedRef.current[playerIndex];
      // Exponential moving average for jitter reduction
      sm.x = lerp(rawX, sm.x, CURSOR_SMOOTHING);
      sm.y = lerp(rawY, sm.y, CURSOR_SMOOTHING);

      cursorsRef.current[playerIndex] = {
        prevX:    cursorsRef.current[playerIndex].x,
        prevY:    cursorsRef.current[playerIndex].y,
        x:        sm.x,
        y:        sm.y,
        playerId: (playerIndex + 1) as 1 | 2,
        active:   true,
      };
    }
  }, [playerCount]);

  useEffect(() => {
    if (!enabled) return;
    if (!videoRef.current) return;

    let mounted = true;

    async function init() {
      // Wait until MediaPipe scripts have loaded from CDN
      let retries = 0;
      while (typeof window.Hands === 'undefined' && retries < 40) {
        await sleep(250);
        retries++;
      }
      if (!mounted || typeof window.Hands === 'undefined') {
        console.warn('MediaPipe Hands not available — gesture tracking disabled');
        return;
      }

      const hands = new window.Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands:            playerCount,
        modelComplexity:        0,  // 0 = lite — better for Raspberry Pi
        minDetectionConfidence: 0.65,
        minTrackingConfidence:  0.55,
      });

      hands.onResults(handleResults);
      handsRef.current = hands;

      if (!videoRef.current) return;
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width:  640,
        height: 480,
      });

      cameraRef.current = camera;
      await camera.start();
    }

    init().catch(console.error);

    return () => {
      mounted = false;
      cameraRef.current?.stop();
      handsRef.current?.close().catch(() => {});
      handsRef.current  = null;
      cameraRef.current = null;
      for (const c of cursorsRef.current) c.active = false;
    };
  }, [enabled, playerCount, handleResults]); // eslint-disable-line react-hooks/exhaustive-deps

  return cursorsRef;
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
