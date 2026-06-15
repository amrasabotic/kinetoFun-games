'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseMediaPipeOptions {
  onPoseResults: (landmarks: PoseLandmark[] | null) => void;
  onHandResults: (landmarks: HandLandmark[][], handedness: Array<{ label: string; score: number; index: number }>) => void;
  onCameraError: (error: Error) => void;
  onReady: () => void;
  enabled: boolean;
  cameraWidth?: number;
  cameraHeight?: number;
}

const MEDIAPIPE_POSE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js';
const MEDIAPIPE_HANDS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
const MEDIAPIPE_CAMERA_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js';
const MEDIAPIPE_DRAW_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1620248257/drawing_utils.js';

function waitForWindow(key: string, timeout = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if ((window as unknown as Record<string, unknown>)[key]) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error(`Timeout waiting for ${key}`));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

export function useMediaPipe(
  videoRef: RefObject<HTMLVideoElement>,
  options: UseMediaPipeOptions
): { isLoading: boolean; isReady: boolean } {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const poseRef = useRef<Pose | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!options.enabled) return;
    let mounted = true;

    async function init() {
      try {
        // Wait for CDN scripts
        await Promise.all([
          waitForWindow('Pose'),
          waitForWindow('Hands'),
          waitForWindow('Camera'),
          waitForWindow('drawConnectors'),
        ]);

        if (!mounted || !videoRef.current) return;

        // Init Pose
        const pose = new Pose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
        });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.5,
        });
        pose.onResults((results: PoseResults) => {
          if (!mounted) return;
          optionsRef.current.onPoseResults(results.poseLandmarks ?? null);
        });
        poseRef.current = pose;

        // Init Hands
        const hands = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
        });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });
        hands.onResults((results: HandResults) => {
          if (!mounted) return;
          optionsRef.current.onHandResults(
            results.multiHandLandmarks ?? [],
            results.multiHandedness ?? []
          );
        });
        handsRef.current = hands;

        // Start Camera with both pose and hands in onFrame
        const width = options.cameraWidth ?? 640;
        const height = options.cameraHeight ?? 480;

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (!videoRef.current || !mounted) return;
            await pose.send({ image: videoRef.current });
            await hands.send({ image: videoRef.current });
          },
          width,
          height,
        });

        cameraRef.current = camera;

        camera.start().then(() => {
          if (!mounted) return;
          setIsLoading(false);
          setIsReady(true);
          optionsRef.current.onReady();
        }).catch((err: Error) => {
          if (!mounted) return;
          optionsRef.current.onCameraError(err);
          setIsLoading(false);
        });

        cleanupRef.current = () => {
          camera.stop();
          pose.close();
          hands.close();
        };

      } catch (err) {
        if (!mounted) return;
        optionsRef.current.onCameraError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
      poseRef.current = null;
      handsRef.current = null;
      cameraRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.enabled]);

  return { isLoading, isReady };
}
