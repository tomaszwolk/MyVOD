import type { SearchOptionVM } from "@/types/api.types";

/**
 * Props for SearchResultItem component.
 */
type SearchResultItemProps = {
  item: SearchOptionVM;
  disabled: boolean;
  onAdd: (item: SearchOptionVM) => void;
};

/**
 * Individual search result item in the movie search dropdown.
 * Displays movie poster, title, year, rating and add button.
 */
export function SearchResultItem({ item, disabled, onAdd }: SearchResultItemProps) {
  const handleClick = () => {
    if (!disabled) {
      onAdd(item);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!disabled) {
        onAdd(item);
      }
    }
  };

  return (
    <li
      role="option"
      className={`flex items-center gap-3 p-3 hover:bg-accent cursor-pointer ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      {/* Poster */}
      <div className="flex-shrink-0 w-[50px] h-[75px] bg-muted rounded overflow-hidden">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={`${item.primaryTitle} poster`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </div>

      {/* Movie info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm truncate">{item.primaryTitle}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.startYear && <span>{item.startYear}</span>}
          {item.avgRating && (
            <>
              <span>•</span>
              <span>⭐ {item.avgRating}/10</span>
            </>
          )}
        </div>
      </div>

      {/* Add button */}
      <button
        type="button"
        className="flex-shrink-0 px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onAdd(item);
        }}
        aria-label={`Add ${item.primaryTitle} to watchlist`}
      >
        Dodaj
      </button>
    </li>
  );
}
