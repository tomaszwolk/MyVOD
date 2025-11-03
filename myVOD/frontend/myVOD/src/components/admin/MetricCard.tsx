import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MetricCardVM } from "@/types/view/admin.types";

type MetricCardProps = {
  vm: MetricCardVM;
};

/**
 * MetricCard component for displaying a single metric.
 * Displays label, value, optional hint, and tooltip on hover.
 */
export function MetricCard({ vm }: MetricCardProps) {
  const displayValue = vm.value === null || vm.value === undefined ? "—" : vm.value;
  const hasTooltip = !!vm.tooltip;

  const cardContent = (
    <div className="bg-card rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground mb-1">{vm.label}</p>
          <p className="text-2xl font-bold text-foreground">{displayValue}</p>
          {vm.hint && (
            <p className="text-xs text-muted-foreground mt-1">{vm.hint}</p>
          )}
        </div>
        {vm.icon && (
          <div className="text-muted-foreground" aria-hidden="true">
            {vm.icon}
          </div>
        )}
      </div>
    </div>
  );

  if (!hasTooltip) {
    return cardContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{cardContent}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{vm.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

