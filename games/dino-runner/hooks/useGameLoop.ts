'use client';
import { useEffect, useRef } from 'react';

type LoopFn = () => void;

/**
 * Drives a requestAnimationFrame loop.
 * The callback ref is kept current so callers can freely use
 * non-memoised closures without restarting the loop.
 */
export function useGameLoop(callback: LoopFn, active: boolean): void {
  const cbRef = useRef<LoopFn>(callback);
  const rafRef = useRef<number>(0);

  // Keep ref current on every render
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
