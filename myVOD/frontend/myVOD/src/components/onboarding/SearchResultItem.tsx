import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TMDBPoster } from "@/components/TMDBPoster";
import type { SearchOptionVM } from "@/types/api.types";
import { cn } from "@/lib/utils";

type SearchResultItemProps = {
  item: SearchOptionVM;
  disabled: boolean;
  onAdd: (item: SearchOptionVM) => void;
};

export function SearchResultItem({
  item,
  disabled,
  onAdd,
}: SearchResultItemProps) {
  return (
    <li
      role="option"
      className="p-3 border-b last:border-b-0 hover:bg-accent data-[active=true]:bg-accent/50"
      data-testid={`search-result-${item.tconst}`}
    >
      <div className="flex items-center gap-3">
        <TMDBPoster
          src={item.posterUrl}
          alt={`${item.primaryTitle} poster`}
          width={50}
          height={75}
          className="w-full h-full object-cover"
        >
          {({ isPlaceholder, imgProps }) => (
            <div
              className={cn(
                "flex-shrink-0 w-[50px] h-[75px] rounded overflow-hidden",
                isPlaceholder ? "bg-muted" : ""
              )}
            >
              <img
                {...imgProps}
                alt={`${item.primaryTitle} poster`}
                width={50}
                height={75}
                loading="lazy"
              />
            </div>
          )}
        </TMDBPoster>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{item.primaryTitle}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.startYear && <span>{item.startYear}</span>}
            {item.avgRating && <span>• ⭐ {item.avgRating}/10</span>}
          </div>
        </div>

        {!disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAdd(item)}
            className="flex-shrink-0"
            aria-label={`Add ${item.primaryTitle} to watchlist`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
