import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from its previous value to `target` in `duration` ms,
 * easing out. All animation is skipped when the user prefers reduced motion.
 *
 * Used by the KPI cells (500 ms count-up on load and on data refresh).
 */
export function useCountUp(target: number, duration = 500): number {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const from = valueRef.current;
    if (from === target) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const next = Math.round(from + (target - from) * eased);
      valueRef.current = next;
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(tick);
      else valueRef.current = target;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
