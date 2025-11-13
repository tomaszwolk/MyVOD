import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Check } from "lucide-react";
import { TMDBPoster } from "@/components/TMDBPoster";
import type { AISuggestionsDto } from "@/types/api.types";
import { cn } from "@/lib/utils";

/**
 * Props for SuggestionModal component.
 */
type SuggestionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AISuggestionsDto | null;
  onAdd: (tconst: string) => void;
};

/**
 * Modal displaying AI-powered movie suggestions.
 * Shows movie cards with posters, details, and availability icons.
 */
export function SuggestionModal({
  open,
  onOpenChange,
  data,
  onAdd,
}: SuggestionModalProps) {
  const [addedTconsts, setAddedTconsts] = useState<Set<string>>(new Set());

  const handleAdd = (tconst: string) => {
    onAdd(tconst);
    setAddedTconsts((prev) => new Set([...prev, tconst]));
  };

  const resetAdded = () => {
    setAddedTconsts(new Set());
  };

  // Reset added state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetAdded();
    }
    onOpenChange(newOpen);
  };

  if (!data) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Sugestie filmów od AI
          </DialogTitle>
          <DialogDescription>
            Spersonalizowane rekomendacje na podstawie Twojej listy filmów
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {data.suggestions.map((suggestion) => (
            <div key={suggestion.tconst} className="border rounded-lg p-4">
              <div className="flex gap-4">
                <div className="w-20 h-28 bg-muted rounded flex-shrink-0">
                  <TMDBPoster
                    src={suggestion.poster_path}
                    alt={suggestion.primary_title}
                    width={80}
                    height={112}
                    className="w-full h-full object-cover rounded"
                  >
                    {({ isPlaceholder, imgProps }) => (
                      <div
                        className={cn(
                          "w-full h-full rounded overflow-hidden",
                          isPlaceholder ? "bg-muted" : ""
                        )}
                      >
                        <img
                          {...imgProps}
                          alt={suggestion.primary_title}
                          width={80}
                          height={112}
                          loading="lazy"
                        />
                      </div>
                    )}
                  </TMDBPoster>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-2 text-foreground">
                    {suggestion.primary_title}
                  </h3>

                  <div className="text-xs text-muted-foreground mt-1">
                    {suggestion.start_year && `${suggestion.start_year} • `}
                    {suggestion.justification}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {suggestion.availability.slice(0, 3).map((avail) => (
                      <Badge
                        key={avail.platform_id}
                        variant="outline"
                        className="text-xs"
                      >
                        {avail.platform_name}
                      </Badge>
                    ))}
                    {suggestion.availability.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{suggestion.availability.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleAdd(suggestion.tconst)}
                  disabled={addedTconsts.has(suggestion.tconst)}
                  className="flex items-center gap-2"
                >
                  {addedTconsts.has(suggestion.tconst) ? (
                    <>
                      <Check className="h-4 w-4" />
                      Dodano
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Dodaj
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
