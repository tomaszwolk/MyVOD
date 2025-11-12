import { useState } from "react";
// import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { logTMDBImageError } from "@/utils/error-logger";
import PlaceholderPoster from "@/assets/poster-myVOD.png";

/**
 * Props for TMDBPoster component.
 */
interface TMDBPosterRenderProps {
  isPlaceholder: boolean;
  imgProps: {
    src: string;
    className: string;
    onError: () => void;
  };
}

interface TMDBPosterProps {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  children: (props: TMDBPosterRenderProps) => React.ReactNode;
}

/**
 * TMDBPoster component that renders movie posters from TMDB with controlled fallback.
 * Opis: Renderuje plakat z TMDB, z kontrolowanym fallbackiem na placeholder (US-039).
 * Główne elementy: <img> z onError → placeholder (ten sam rozmiar), opcjonalny alt.
 * Obsługiwane interakcje: brak.
 * Obsługiwana walidacja: nigdy nie pokazuje komunikatu błędu użytkownikowi; błąd logowany dla admina.
 * Propsy: src?: string | null, alt: string, width: number, height: number.
 */
export function TMDBPoster({
  src,
  alt,
  width,
  height,
  className = "",
  children,
}: TMDBPosterProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
    logTMDBImageError(src || "", alt, { width, height });
  };
  // Determine the final source for the image
  const isPlaceholder = !src || hasError;
  const imageSrc = isPlaceholder ? PlaceholderPoster : src;

  // For placeholders, we replace 'object-cover' with 'object-contain'
  // to ensure the whole image is visible without being cropped.
  const imageClassName = isPlaceholder
    ? cn(className.replace("object-cover", ""), "object-contain")
    : className;

  return children({
    isPlaceholder,
    imgProps: {
      src: imageSrc,
      className: imageClassName,
      onError: handleError,
    },
  });
  // // If no src or error occurred, show placeholder
  // if (!src || hasError) {
  //   return (
  //     <div
  //       className={`flex items-center justify-center bg-muted ${className}`}
  //       style={{ width, height }}
  //       role="img"
  //       aria-label={`Brak plakatu dla filmu ${alt}`}
  //     >
  //       <ImageIcon className="w-8 h-8 text-muted-foreground" />
  //     </div>
  //   );
  // }

  // return (
  //   <img
  //     src={src}
  //     alt={alt}
  //     width={width}
  //     height={height}
  //     className={className}
  //     loading="lazy"
  //     onError={handleError}
  //   />
  // );
}
