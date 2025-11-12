/**
 * Header component for onboarding steps with title and hint.
 */
export function OnboardingHeader({
  title,
  hint,
  className = ""
}: {
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {hint && (
        <p className="text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
