import { useEffect, type RefObject } from "react";

/**
 * Calls handler when a click occurs outside the given ref element.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener("click", listener);
    return () => document.removeEventListener("click", listener);
  }, [ref, handler, enabled]);
}