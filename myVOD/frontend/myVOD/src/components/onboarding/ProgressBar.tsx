/**
 * Progress bar component showing current step in onboarding flow.
 */
export function ProgressBar({
  current,
  total,
  className = ""
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const progress = (current / total) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Krok {current} z {total}</span>
        <span>{Math.round(progress)}% ukończony</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
