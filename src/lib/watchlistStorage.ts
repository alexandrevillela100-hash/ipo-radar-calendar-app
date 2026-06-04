/**
 * watchlistStorage.ts — localStorage-backed watchlist for the calendar app.
 *
 * Save as:  calendar-app/src/lib/watchlistStorage.ts
 *
 * No backend required. Star/unstar operations dispatch a "watchlist-change"
 * window event so multiple star buttons on the same page stay in sync.
 */

const KEY = "ipo-radar-watchlist-v1";
const EVENT = "watchlist-change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

function write(slugs: string[]) {
  if (typeof window === "undefined") return;
  try {
    const cleaned = Array.from(new Set(slugs.filter(Boolean)));
    window.localStorage.setItem(KEY, JSON.stringify(cleaned));
    window.dispatchEvent(
      new CustomEvent(EVENT, { detail: { slugs: cleaned } }),
    );
  } catch {
    /* swallow quota / privacy errors */
  }
}

export function loadWatchlist(): string[] {
  return read();
}

export function isWatched(slug: string): boolean {
  if (!slug) return false;
  return read().includes(slug);
}

export function addToWatchlist(slug: string): string[] {
  if (!slug) return read();
  const next = [...read(), slug];
  write(next);
  return read();
}

export function removeFromWatchlist(slug: string): string[] {
  if (!slug) return read();
  const next = read().filter((s) => s !== slug);
  write(next);
  return read();
}

export function toggleWatchlist(slug: string): string[] {
  if (!slug) return read();
  return isWatched(slug)
    ? removeFromWatchlist(slug)
    : addToWatchlist(slug);
}

export function clearWatchlist(): void {
  write([]);
}

/**
 * Subscribe to changes from any source (this component or another).
 * Returns the unsubscribe function.
 */
export function onWatchlistChange(
  handler: (slugs: string[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const wrapper = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail && Array.isArray(detail.slugs)) {
      handler(detail.slugs);
    } else {
      handler(read());
    }
  };
  const storageWrapper = (e: StorageEvent) => {
    if (e.key === KEY) handler(read());
  };
  window.addEventListener(EVENT, wrapper);
  window.addEventListener("storage", storageWrapper);
  return () => {
    window.removeEventListener(EVENT, wrapper);
    window.removeEventListener("storage", storageWrapper);
  };
}
