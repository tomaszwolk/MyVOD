import type { InfiniteData } from "@tanstack/react-query";
import type { PaginatedResponse, UserMovieDto } from "@/types/api.types";

export type UserMoviesInfiniteData =
  InfiniteData<PaginatedResponse<UserMovieDto>>;

export function findUserMovieById(
  data: UserMoviesInfiniteData | undefined,
  id: number
): UserMovieDto | undefined {
  if (!data) {
    return undefined;
  }

  for (const page of data.pages) {
    const match = page.results.find((movie) => movie.id === id);
    if (match) {
      return match;
    }
  }

  return undefined;
}

export function removeUserMovieById(
  data: UserMoviesInfiniteData | undefined,
  id: number
): UserMoviesInfiniteData | undefined {
  if (!data) {
    return data;
  }

  let removedCount = 0;

  const updatedPages = data.pages.map((page) => {
    let pageRemoved = false;
    const filteredResults = page.results.filter((movie) => {
      if (movie.id === id) {
        pageRemoved = true;
        removedCount += 1;
        return false;
      }
      return true;
    });

    if (!pageRemoved) {
      return page;
    }

    return {
      ...page,
      results: filteredResults,
    };
  });

  if (removedCount === 0) {
    return data;
  }

  return {
    ...data,
    pages: updatedPages.map((page) => ({
      ...page,
      count:
        typeof page.count === "number"
          ? Math.max(0, page.count - removedCount)
          : page.count,
    })),
  };
}

