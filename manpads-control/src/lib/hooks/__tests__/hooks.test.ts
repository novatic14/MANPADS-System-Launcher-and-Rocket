import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedCallback } from '../useDebouncedCallback';
import { useThrottleCallback } from '../useThrottleCallback';

describe('useDebouncedCallback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should debounce callback execution', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(callback, 500));

        act(() => {
            result.current();
        });

        expect(callback).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on repeated calls', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(callback, 500));

        act(() => {
            result.current();
        });
        act(() => {
            vi.advanceTimersByTime(200);
            result.current();
        });

        expect(callback).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(callback).toHaveBeenCalledTimes(1);
    });
});

describe('useThrottleCallback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should throttle callback execution', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottleCallback(callback, 500));

        act(() => {
            result.current();
        });

        expect(callback).toHaveBeenCalledTimes(1);

        act(() => {
            result.current();
        });

        expect(callback).toHaveBeenCalledTimes(1);

        act(() => {
            vi.advanceTimersByTime(500);
        });

        act(() => {
            result.current();
        });

        expect(callback).toHaveBeenCalledTimes(2);
    });
});