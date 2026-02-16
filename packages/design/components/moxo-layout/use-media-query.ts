"use client";

import * as React from "react";

/**
 * Hook to detect if a media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Handler for changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener("change", handler);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}

/**
 * Common breakpoint hooks
 */
export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 640px)");
}

export function useIsTablet(): boolean {
  const isAboveMobile = useMediaQuery("(min-width: 640px)");
  const isBelowDesktop = !useMediaQuery("(min-width: 1024px)");
  return isAboveMobile && isBelowDesktop;
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

export function useIsLargeDesktop(): boolean {
  return useMediaQuery("(min-width: 1280px)");
}

/**
 * Hook that returns the current breakpoint
 */
export type Breakpoint = "mobile" | "tablet" | "desktop" | "large";

export function useBreakpoint(): Breakpoint {
  const isLarge = useMediaQuery("(min-width: 1280px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 640px)");

  if (isLarge) return "large";
  if (isDesktop) return "desktop";
  if (isTablet) return "tablet";
  return "mobile";
}
