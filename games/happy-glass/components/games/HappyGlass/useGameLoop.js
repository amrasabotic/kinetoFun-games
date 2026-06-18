'use client';

import { useEffect, useRef } from 'react';

/**
 * Drives a requestAnimationFrame loop.
 * The callback ref is kept current so callers can change the closure
 * without restarting the loop.
 *
 * @param {() => void} callback  - called once per animation frame
 * @param {boolean}    active    - set false to pause/stop the loop
 */
export function useGameLoop(callback, active) {
  const cbRef  = useRef(callback);
  const rafRef = useRef(0);

  cbRef.current = callback;

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let running = true;

    const loop = () => {
      if (!running) return;
      cbRef.current();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [active]);
}
