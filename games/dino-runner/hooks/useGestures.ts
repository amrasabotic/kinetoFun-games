'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { GestureState } from '@/game/dino/types';
import { GestureSmoother } from '@/utils/dino/smoothing';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const CONFIDENCE_THRESHOLD = 0.72;

export interface GesturesOutput {
  gestureState: GestureState;
  rawGestureName: string;
  confidence: number;
  videoRef: RefObject<HTMLVideoElement>;
  isReady: boolean;
  error: string | null;
}

function mapName(name: string): GestureState {
  if (name === 'Open_Palm') return 'jump';
  if (name === 'Closed_Fist') return 'duck';
  return 'none';
}

// Wait for MediaPipe scripts to load on window
function waitForMediaPipe(timeout = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const w = window as unknown as Record<string, unknown>;
      if (w.FilesetResolver && w.GestureRecognizer) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error('Timeout waiting for MediaPipe to load'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

export function useGestures(enabled: boolean): GesturesOutput {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<unknown>(null);
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
        // Wait for MediaPipe scripts to load from CDN (loaded in layout.tsx)
        await waitForMediaPipe();
        if (cancelled) return;

        const w = window as unknown as {
          FilesetResolver: { forVisionTasks: (path: string) => Promise<unknown> };
          GestureRecognizer: {
            createFromOptions: (fileset: unknown, opts: unknown) => Promise<{
              recognizeForVideo: (video: HTMLVideoElement, ts: number) => {
                gestures?: Array<Array<{ categoryName: string; score: number }>>;
              };
              close: () => void;
            }>;
          };
        };

        const fileset = await w.FilesetResolver.forVisionTasks(WASM_CDN);
        if (cancelled) return;

        const recognizer = await w.GestureRecognizer.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (cancelled) { recognizer.close(); return; }
        recognizerRef.current = recognizer;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await new Promise<void>(resolve => { video.onloadedmetadata = () => resolve(); });
          await video.play();
        }

        if (cancelled) return;
        setIsReady(true);
        startLoop();
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Camera / MediaPipe init failed');
        }
      }
    }

    function startLoop() {
      let lastVideoTime = -1;

      const rec = recognizerRef.current as {
        recognizeForVideo: (v: HTMLVideoElement, ts: number) => {
          gestures?: Array<Array<{ categoryName: string; score: number }>>;
        };
      };

      function detect() {
        if (cancelled) return;

        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const result = rec.recognizeForVideo(video, performance.now());
            if (result.gestures && result.gestures.length > 0) {
              const top = result.gestures[0][0];
              const raw: GestureState =
                top.score >= CONFIDENCE_THRESHOLD ? mapName(top.categoryName) : 'none';
              const smoothed = smootherRef.current.update(raw);
              setGestureState(smoothed);
              setRawGestureName(top.categoryName);
              setConfidence(top.score);
            } else {
              const smoothed = smootherRef.current.update('none');
              setGestureState(smoothed);
              setRawGestureName('');
              setConfidence(0);
            }
          } catch { /* detection errors are transient */ }
        }

        rafRef.current = requestAnimationFrame(detect);
      }

      rafRef.current = requestAnimationFrame(detect);
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      (recognizerRef.current as { close?: () => void } | null)?.close?.();
      streamRef.current?.getTracks().forEach(t => t.stop());
      smootherRef.current.reset();
    };
  }, [enabled]);

  return { gestureState, rawGestureName, confidence, videoRef, isReady, error };
}
