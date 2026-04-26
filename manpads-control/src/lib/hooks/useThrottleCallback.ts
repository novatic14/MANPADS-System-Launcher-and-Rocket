import { useCallback, useRef } from 'react';

export function useThrottleCallback<T extends (...args: unknown[]) => unknown>(
    callback: T,
    delay: number
): T {
    const lastCallRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback((...args: Parameters<T>) => {
        const now = Date.now();
        const remaining = delay - (now - lastCallRef.current);

        if (remaining <= 0) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            lastCallRef.current = now;
            callback(...args);
        } else if (!timeoutRef.current) {
            timeoutRef.current = setTimeout(() => {
                lastCallRef.current = Date.now();
                timeoutRef.current = null;
                callback(...args);
            }, remaining);
        }
    }, [callback, delay]) as T;
}