import { RateLimitBadge } from "./RateLimitBadge";

/**
 * Props for AISuggestionsHeader component.
 */
type AISuggestionsHeaderProps = {
  expiresAt?: string | null;
  isRateLimited: boolean;
};

/**
 * Header component for AI suggestions dialog.
 * Displays title and rate limit badge.
 */
export function AISuggestionsHeader({
  expiresAt,
  isRateLimited,
}: AISuggestionsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold">Sugestie filmów od AI</h2>
      <RateLimitBadge expiresAt={expiresAt} isRateLimited={isRateLimited} />
    </div>
  );
}

