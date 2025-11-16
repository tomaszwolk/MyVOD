import { useCallback, useEffect, useRef, useState } from "react";

type UseInViewOptions = {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
};

type UseInViewResult = {
  ref: (node: Element | null) => void;
  inView: boolean;
};

/**
 * Lightweight IntersectionObserver hook used by watchlist & watched pages.
 * Avoids relying on react-intersection-observer, which currently breaks
 * with React 19 during pre-bundling.
 */
export function useInView(options: UseInViewOptions = {}): UseInViewResult {
  const {
    root = null,
    rootMargin = "0px",
    threshold = 0,
    triggerOnce = false,
  } = options;

  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<Element | null>(null);

  const cleanupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  const ref = useCallback(
    (node: Element | null) => {
      cleanupObserver();
      elementRef.current = node;

      if (!node) {
        setInView(false);
        return;
      }

      if (typeof IntersectionObserver === "undefined") {
        setInView(true);
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.length === 0) {
            return;
          }

          const entry = entries[0];
          if (entry.isIntersecting) {
            setInView(true);
            if (triggerOnce && observerRef.current && elementRef.current) {
              observerRef.current.unobserve(elementRef.current);
            }
          } else if (!triggerOnce) {
            setInView(false);
          }
        },
        {
          root: (root as Element | null) ?? null,
          rootMargin,
          threshold,
        }
      );

      observerRef.current.observe(node);
    },
    [cleanupObserver, root, rootMargin, threshold, triggerOnce]
  );

  useEffect(
    () => () => {
      cleanupObserver();
    },
    [cleanupObserver]
  );

  return { ref, inView };
}

