'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { GestureState } from '@/game/dino/types';
import { GestureSmoother } from '@/utils/dino/smoothing';

const CONFIDENCE_THRESHOLD = 0.5;

export interface GesturesOutput {
  gestureState: GestureState;
  rawGestureName: string;
  confidence: number;
  videoRef: RefObject<HTMLVideoElement>;
  isReady: boolean;
  error: string | null;
}

// Wait for MediaPipe Hands to load
function waitForMediaPipe(timeout = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const w = window as unknown as Record<string, unknown>;
      if (w.Hands && w.Camera) {
        console.log('[MediaPipe] ✓ Hands API ready');
        resolve();
      } else if (Date.now() - start > timeout) {
        console.error('[MediaPipe] ✗ Timeout after', Date.now() - start, 'ms');
        reject(new Error('Timeout waiting for MediaPipe Hands to load'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// Detect gesture from hand landmarks
// Landmarks: thumb, index, middle, ring, pinky fingers
// Open palm: fingers spread, distance from palm center is large
// Closed fist: fingers curled, distance from palm center is small
function detectGestureFromHand(landmarks: Array<{ x: number; y: number; z: number }>): GestureState {
  if (!landmarks || landmarks.length < 21) return 'none';

  // Palm center (wrist is at index 0)
  const palm = landmarks[0];

  // Fingertips: index=8, middle=12, ring=16, pinky=20
  const fingertips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];

  // Measure average distance from palm to fingertips
  const distances = fingertips.map(tip => {
    const dx = tip.x - palm.x;
    const dy = tip.y - palm.y;
    return Math.sqrt(dx * dx + dy * dy);
  });

  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

  // High distance = fingers extended = open palm (jump)
  // Low distance = fingers curled = fist (duck)
  if (avgDistance > 0.25) return 'jump';  // Open palm
  if (avgDistance < 0.15) return 'duck';  // Fist
  return 'none';
}

export function useGestures(enabled: boolean): GesturesOutput {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<unknown>(null);
  const cameraRef = useRef<unknown>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const smootherRef = useRef(new GestureSmoother());

  const [gestureState, setGestureState] = useState<GestureState>('none');
  const [rawGestureName, setRawGestureName] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function init() {
      try {
        console.log('[useGestures] Starting initialization...');
        await waitForMediaPipe();
        if (cancelled) return;

        const w = window as unknown as {
          Hands: {
            Hand: new () => {
              setOptions: (opts: unknown) => void;
              onResults: (results: unknown) => void;
            };
          };
          Camera: new (video: HTMLVideoElement, opts: unknown) => {
            start: () => void;
            stop: () => void;
          };
        };

        console.log('[useGestures] Creating Hands detector...');
        const hands = new w.Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        const video = videoRef.current;
        if (!video) throw new Error('Video element not found');

        console.log('[useGestures] Requesting camera...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;

        console.log('[useGestures] Setting up results handler...');
        hands.onResults((results: unknown) => {
          if (cancelled) return;

          const r = results as {
            multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
            multiHandedness?: Array<{ score: number }>;
          };

          if (!r.multiHandLandmarks || r.multiHandLandmarks.length === 0) {
            const smoothed = smootherRef.current.update('none');
            setGestureState(smoothed);
            setRawGestureName('');
            setConfidence(0);
            return;
          }

          const landmarks = r.multiHandLandmarks[0];
          const handedness = r.multiHandedness?.[0];
          const conf = handedness?.score ?? 0;

          if (conf < CONFIDENCE_THRESHOLD) {
            const smoothed = smootherRef.current.update('none');
            setGestureState(smoothed);
            setRawGestureName('');
            setConfidence(0);
            return;
          }

          const raw = detectGestureFromHand(landmarks);
          const smoothed = smootherRef.current.update(raw);

          const gestureName =
            raw === 'jump'
              ? 'Open_Palm'
              : raw === 'duck'
                ? 'Closed_Fist'
                : 'None';

          setGestureState(smoothed);
          setRawGestureName(gestureName);
          setConfidence(conf);
        });

        handsRef.current = hands;

        console.log('[useGestures] Starting camera with Hands detector...');
        const camera = new w.Camera(video, {
          onFrame: async () => {
            if (!handsRef.current) return;
            const h = handsRef.current as {
              send: (opts: unknown) => Promise<void>;
            };
            await h.send({ image: video });
          },
        });

        cameraRef.current = camera;
        camera.start();

        if (cancelled) {
          camera.stop();
          return;
        }

        console.log('[useGestures] ✓ Fully initialized');
        setIsReady(true);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[useGestures] ✗ Error:', errMsg, err);
        if (!cancelled) {
          setError(errMsg);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      (cameraRef.current as { stop?: () => void } | null)?.stop?.();
      streamRef.current?.getTracks().forEach(t => t.stop());
      smootherRef.current.reset();
    };
  }, [enabled]);

  return { gestureState, rawGestureName, confidence, videoRef, isReady, error };
}
