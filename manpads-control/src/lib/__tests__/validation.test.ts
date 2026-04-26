import { describe, it, expect } from 'vitest';
import { validateLaunchParams, validatePidParams } from '../validation';

describe('Launch input validation', () => {
    it('should accept valid azimuth and elevation', () => {
        const result = validateLaunchParams({ azimuth: 90, elevation: 45 });
        expect(result.valid).toBe(true);
    });

    it('should reject azimuth below 0', () => {
        const result = validateLaunchParams({ azimuth: -5, elevation: 45 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Azimuth');
    });

    it('should reject azimuth above 360', () => {
        const result = validateLaunchParams({ azimuth: 400, elevation: 45 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Azimuth');
    });

    it('should reject elevation below -10', () => {
        const result = validateLaunchParams({ azimuth: 90, elevation: -15 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Elevation');
    });

    it('should reject elevation above 85', () => {
        const result = validateLaunchParams({ azimuth: 90, elevation: 90 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Elevation');
    });
});

describe('PID validation', () => {
    it('should accept valid PID values', () => {
        const result = validatePidParams({ kp: 0.5, kd: 0.2 });
        expect(result.valid).toBe(true);
    });

    it('should reject kp below 0', () => {
        const result = validatePidParams({ kp: -0.1, kd: 0.2 });
        expect(result.valid).toBe(false);
    });

    it('should reject kd above 5.0', () => {
        const result = validatePidParams({ kp: 0.5, kd: 10.0 });
        expect(result.valid).toBe(false);
    });
});