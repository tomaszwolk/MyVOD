import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

/**
 * ThemeToggle component for switching between light and dark modes.
 * Displays a sun icon for light mode and moon icon for dark mode.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      // className="shadow-sm"
      aria-label={`Przełącz na ${
        theme === "light" ? "tryb ciemny" : "tryb jasny"
      }`}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">
        Przełącz na {theme === "light" ? "tryb ciemny" : "tryb jasny"}
      </span>
    </Button>
  );
}
