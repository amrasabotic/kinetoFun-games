'use client';

import { useEffect, useRef } from 'react';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initialises MediaPipe Hands (loaded via CDN in layout.jsx).
 * Returns a ref whose .current is the latest multiHandLandmarks array,
 * or null when no hand is detected.
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef
 * @param {boolean} enabled
 * @returns {React.MutableRefObject<Array|null>}
 */
export function useHandTracking(videoRef, enabled) {
  const landmarksRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted  = true;
    let hands    = null;
    let camera   = null;

    async function init() {
      // Wait for CDN scripts (window.Hands / window.Camera)
      let retries = 0;
      while ((typeof window.Hands === 'undefined' || typeof window.Camera === 'undefined') && retries < 60) {
        await sleep(250);
        retries++;
      }
      if (!mounted) return;
      if (typeof window.Hands === 'undefined') {
        console.warn('[HappyGlass] MediaPipe Hands CDN not loaded — tracking disabled');
        return;
      }

      hands = new window.Hands({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands:            1,
        modelComplexity:        0,
        minDetectionConfidence: 0.68,
        minTrackingConfidence:  0.55,
      });

      hands.onResults(results => {
        landmarksRef.current = results.multiHandLandmarks?.length
          ? results.multiHandLandmarks
          : null;
      });

      if (!videoRef.current) return;

      camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && hands) {
            await hands.send({ image: videoRef.current });
          }
        },
        width:  640,
        height: 480,
      });

      await camera.start();
    }

    init().catch(console.error);

    return () => {
      mounted = false;
      camera?.stop();
      hands?.close().catch(() => {});
      landmarksRef.current = null;
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return landmarksRef;
}
