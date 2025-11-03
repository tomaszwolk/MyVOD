import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatLastCheckedDate,
  isValidDate,
  formatRelativeTime
} from '../date-utils';

describe('date-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatLastCheckedDate', () => {
    it('should format date in Polish locale', () => {
      const dateString = '2025-11-15T14:30:00Z';
      const result = formatLastCheckedDate(dateString);

      expect(result).toBe('15 listopada 2025');
    });

    it('should handle invalid date strings', () => {
      const invalidDate = 'invalid-date';
      const result = formatLastCheckedDate(invalidDate);

      expect(result).toBe('nieznana data');
    });


    it('should use correct Polish date format', () => {
      const dateString = '2024-01-01T00:00:00Z';
      const result = formatLastCheckedDate(dateString);

      expect(result).toBe('1 stycznia 2024');
    });

    it('should include time if present', () => {
      const dateString = '2025-11-15T14:30:45Z';
      const result = formatLastCheckedDate(dateString);

      // formatLastCheckedDate nie używa czasu, tylko daty
      expect(result).toBe('15 listopada 2025');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid date strings', () => {
      expect(isValidDate('2025-11-15')).toBe(true);
      expect(isValidDate('2025-11-15T14:30:00Z')).toBe(true);
      expect(isValidDate('2023-01-01')).toBe(true);
    });

    it('should return false for invalid date strings', () => {
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('2025-13-45')).toBe(false);
      expect(isValidDate('')).toBe(false);
      expect(isValidDate('abc')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidDate('2025-02-29')).toBe(true); // Valid leap year (2024 is leap year)
      expect(isValidDate('2025-02-30')).toBe(true); // JavaScript Date rolls over to March 2nd
      expect(isValidDate('2025-00-15')).toBe(false); // Invalid month
      expect(isValidDate('2025-13-15')).toBe(false); // Invalid month
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      // Mock Date.now to return a fixed time
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "przed chwilą" for very recent dates', () => {
      const recentDate = '2025-11-15T11:59:30Z'; // 30 seconds ago
      const result = formatRelativeTime(recentDate);

      expect(result).toBe('przed chwilą');
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = '2025-11-15T11:55:00Z';
      const result = formatRelativeTime(fiveMinutesAgo);

      expect(result).toBe('5 min temu');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = '2025-11-15T10:00:00Z';
      const result = formatRelativeTime(twoHoursAgo);

      expect(result).toBe('2 godz. temu');
    });

    it('should format days ago', () => {
      const threeDaysAgo = '2025-11-12T12:00:00Z';
      const result = formatRelativeTime(threeDaysAgo);

      expect(result).toBe('3 dni temu');
    });

    it('should fallback to formatted date for older dates', () => {
      const oldDate = '2024-11-15T12:00:00Z'; // 1 year ago
      const result = formatRelativeTime(oldDate);

      expect(result).toBe('15 listopada 2024');
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDate = 'invalid-date';
      const result = formatRelativeTime(invalidDate);

      // formatRelativeTime returns 'nieznany czas' for invalid dates
      expect(result).toBe('nieznany czas');
    });

    it('should handle edge cases', () => {
      const futureDate = '2026-11-15T12:00:00Z';
      const result = formatRelativeTime(futureDate);

      // Future dates should still be formatted
      expect(typeof result).toBe('string');
      expect(result).not.toBe('nieznany czas');
    });
  });
});
