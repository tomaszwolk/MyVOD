import { Check, X } from "lucide-react";
import { checkPasswordRules } from "@/schemas/register.schema";

type PasswordRulesProps = {
  password: string;
};

/**
 * Displays password strength requirements with visual indicators.
 * Shows which rules are met and which are not.
 */
export function PasswordRules({ password }: PasswordRulesProps) {
  const rules = checkPasswordRules(password);

  const ruleItems = [
    {
      key: "minLength",
      label: "Co najmniej 8 znaków",
      met: rules.hasMinLength,
    },
    { key: "letter", label: "Zawiera literę", met: rules.hasLetter },
    { key: "number", label: "Zawiera cyfrę", met: rules.hasNumber },
  ];

  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">
        Wymagania hasła:
      </p>
      <ul className="space-y-1">
        {ruleItems.map((rule) => (
          <li
            key={rule.key}
            className={`text-xs flex items-center gap-2 ${
              rule.met
                ? "text-green-600 dark:text-green-400"
                : "text-muted-foreground"
            }`}
          >
            {rule.met ? (
              <Check className="w-3 h-3" aria-hidden="true" />
            ) : (
              <X className="w-3 h-3" aria-hidden="true" />
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
