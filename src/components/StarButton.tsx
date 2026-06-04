import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Star } from "lucide-react";
import {
  isWatched,
  toggleWatchlist,
  onWatchlistChange,
} from "@/lib/watchlistStorage";

/**
 * StarButton — toggle a filing in/out of the user's watchlist.
 *
 * Save as:  calendar-app/src/components/StarButton.tsx
 *
 * Pure client-side, backed by localStorage. Auto-syncs across all
 * StarButton instances on the same page via window events.
 *
 * Variants:
 *   - "icon" (default): just the star icon, used inside cards/tables
 *   - "chip": star + "Watch" / "Watching" label, used on fact sheets
 */

interface Props {
  slug: string | undefined;
  variant?: "icon" | "chip";
  size?: number;
}

export default function StarButton({
  slug,
  variant = "icon",
  size = 16,
}: Props) {
  const [watched, setWatched] = useState(false);

  // Sync state on mount + when other instances change.
  useEffect(() => {
    if (!slug) return;
    setWatched(isWatched(slug));
    const unsub = onWatchlistChange((slugs) => {
      setWatched(slugs.includes(slug));
    });
    return unsub;
  }, [slug]);

  if (!slug) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(slug);
  };

  const goldFill = "#c8a45c";
  const mutedColor = "rgba(228, 230, 232, 0.55)";

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
        title={watched ? "Remove from watchlist" : "Add to watchlist"}
        style={{
          background: "transparent",
          border: "none",
          padding: 4,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          color: watched ? goldFill : mutedColor,
        }}
      >
        <Star
          size={size}
          fill={watched ? goldFill : "transparent"}
          strokeWidth={1.75}
        />
      </button>
    );
  }

  const chipStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 18px",
    background: watched ? `${goldFill}1f` : "transparent",
    color: watched ? goldFill : "#e4e6e8",
    fontFamily: '"DM Mono", monospace',
    fontSize: 11,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontWeight: 500,
    border: `1px solid ${watched ? goldFill : "rgba(255, 255, 255, 0.08)"}`,
    borderRadius: 4,
    cursor: "pointer",
    transition: "border-color 0.15s ease, background 0.15s ease",
  };

  return (
    <button
      onClick={handleClick}
      aria-pressed={watched}
      style={chipStyle}
      onMouseEnter={(e) => {
        if (!watched) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = goldFill;
        }
      }}
      onMouseLeave={(e) => {
        if (!watched) {
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(255, 255, 255, 0.08)";
        }
      }}
    >
      <Star
        size={size}
        fill={watched ? goldFill : "transparent"}
        strokeWidth={1.75}
      />
      {watched ? "Watching" : "Watch"}
    </button>
  );
}
