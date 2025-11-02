import { useEffect, useState } from "react";

/**
 * Custom hook for countdown timer to a specific date.
 * Updates every second and returns formatted time string (hh:mm:ss).
 * Cleans up interval on unmount.
 *
 * @param targetDate - Target date to count down to (null to disable)
 * @returns Formatted countdown string (hh:mm:ss) or null if no target date
 */
export function useCountdownTo(targetDate: Date | string | null | undefined): string | null {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!targetDate) {
      setCountdown(null);
      return;
    }

    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    
    if (isNaN(target.getTime())) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = target.getTime() - now;

      if (diff <= 0) {
        setCountdown("00:00:00");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const format = (n: number) => n.toString().padStart(2, '0');
      setCountdown(`${format(hours)}:${format(minutes)}:${format(seconds)}`);
    };

    // Update immediately
    updateCountdown();

    // Then update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
}

