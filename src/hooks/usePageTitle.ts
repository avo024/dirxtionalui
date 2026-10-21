import { useEffect } from "react";

/**
 * Sets document.title to "{page} · Dirxctional" while the page is mounted and
 * restores the previous title on unmount. Never pass PHI (patient names etc.)
 * — titles end up in browser history and tab lists.
 */
export function usePageTitle(page: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${page} · Dirxctional`;
    return () => {
      document.title = previous;
    };
  }, [page]);
}
