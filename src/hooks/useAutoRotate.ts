import { useState, useEffect } from "react";

/**
 * Rotates an index from 0 to length-1 on a fixed interval.
 * Returns [index, setIndex]. Pauses automatically when length <= 1.
 */
export function useAutoRotate(length: number, intervalMs: number): [number, React.Dispatch<React.SetStateAction<number>>] {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % length), intervalMs);
    return () => clearInterval(timer);
  }, [length, intervalMs]);

  return [index, setIndex];
}