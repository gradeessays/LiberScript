import { useEffect, useState, type MutableRefObject } from 'react';

/**
 * Debounce a fast-changing value (e.g. live-preview HTML) to avoid thrash.
 *
 * Pass `immediateRef` to allow specific updates to skip the debounce: set
 * `immediateRef.current = true` right before the change that produced this
 * `value` (e.g. a discrete dropdown/checkbox switch), and the new value is
 * applied right away instead of waiting `delayMs`. The flag is consumed
 * (reset to `false`) on use, so subsequent continuous changes (sliders,
 * typing) fall back to the normal debounce.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350, immediateRef?: MutableRefObject<boolean>): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (immediateRef?.current) {
      immediateRef.current = false;
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs, immediateRef]);
  return debounced;
}
