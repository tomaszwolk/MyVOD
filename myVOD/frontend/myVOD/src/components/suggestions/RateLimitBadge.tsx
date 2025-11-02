import { Badge } from "@/components/ui/badge";
import { useCountdownTo } from "@/hooks/useCountdownTo";
import type { EmptyStateVariant } from "@/types/view/suggestions.types";

/**
 * Props for RateLimitBadge component.
 */
type RateLimitBadgeProps = {
  expiresAt?: string | null;
  isRateLimited: boolean;
};

/**
 * Badge displaying countdown to rate limit reset.
 * Shows time until expires_at, or falls back to midnight if not provided.
 */
export function RateLimitBadge({ expiresAt, isRateLimited }: RateLimitBadgeProps) {
  // If no expires_at, calculate midnight as fallback
  const targetDate = expiresAt || (() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.toISOString();
  })();

  const countdown = useCountdownTo(targetDate);

  if (!isRateLimited) {
    return null;
  }

  return (
    <Badge variant="secondary" className="text-xs">
      {countdown ? `Nowe sugestie za: ${countdown}` : "Limit wykorzystany"}
    </Badge>
  );
}

