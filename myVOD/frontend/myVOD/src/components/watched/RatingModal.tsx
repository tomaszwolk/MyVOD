import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => void;
  currentRating: number | null;
  movieTitle: string;
  isSaving?: boolean;
}

export const RatingModal = ({
  isOpen,
  onClose,
  onSubmit,
  currentRating,
  movieTitle,
  isSaving,
}: RatingModalProps) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(currentRating || 0);

  const handleSubmit = () => {
    if (selectedRating > 0) {
      onSubmit(selectedRating);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oceń "{movieTitle}"</DialogTitle>
          <DialogDescription>Wybierz ocenę od 1 do 10.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          {[...Array(10)].map((_, i) => {
            const ratingValue = i + 1;
            return (
              <Star
                key={ratingValue}
                aria-label={`Rating ${ratingValue}`}
                role="button"
                className={cn(
                  "h-8 w-8 cursor-pointer text-gray-300 transition-colors",
                  ratingValue <= (hoverRating || selectedRating) &&
                    "text-blue-400 fill-blue-400"
                )}
                onClick={() => setSelectedRating(ratingValue)}
                onMouseEnter={() => setHoverRating(ratingValue)}
                onMouseLeave={() => setHoverRating(0)}
              />
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedRating === 0 || isSaving}
          >
            {isSaving ? "Zapisywanie..." : "Oceń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
