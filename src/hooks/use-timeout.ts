import { useCallback, useEffect, useRef } from 'preact/hooks';

/**
 * Returns a setTimeout-compatible stable function, which automatically clears
 * the previously scheduled callback every time it's called.
 *
 * The timeout instance is not returned, as the hook internally handles
 * clearing it.
 */
export function useTimeout(
  /* istanbul ignore next - test seam */
  setTimeout_: typeof setTimeout = setTimeout,
  /* istanbul ignore next - test seam */
  clearTimeout_: typeof clearTimeout = clearTimeout,
): (callback: () => void, delay: number) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout_> | null>(null);
  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout_(timeoutRef.current);
    }
  }, [clearTimeout_]);

  // When unmounted, clear the last timeout, if any
  useEffect(() => {
    return clearCurrentTimeout;
  }, [clearCurrentTimeout]);

  return useCallback(
    (callback, delay) => {
      clearCurrentTimeout();
      timeoutRef.current = setTimeout_(() => {
        callback();
        timeoutRef.current = null;
      }, delay);
    },
    [clearCurrentTimeout, setTimeout_],
  );
}
