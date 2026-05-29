import type { CSSProperties } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * ReturnBadge — small chip showing return-since-IPO.
 *
 * Save as:  calendar-app/src/components/ReturnBadge.tsx
 *
 * Renders green/red pill with arrow + percent. Used in AllIPOs rows,
 * DetailPanel cards, and anywhere we want post-IPO names to stand out.
 *
 * Returns null if value is undefined / null / NaN so it can be
 * dropped in anywhere without conditionals at call sites.
 */

interface ReturnBadgeProps {
  value: number | undefined;
  size?: "sm" | "md";
  label?: string; // optional prefix, e.g. "Since IPO"
  style?: CSSProperties;
}

export default function ReturnBadge({
  value,
  size = "sm",
  label,
  style,
}: ReturnBadgeProps) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }

  const positive = value >= 0;
  const color = positive ? "#03c8b5" : "#d86060";
  const bg = positive ? "rgba(3, 200, 181, 0.12)" : "rgba(216, 96, 96, 0.12)";
  const border = positive
    ? "1px solid rgba(3, 200, 181, 0.25)"
    : "1px solid rgba(216, 96, 96, 0.25)";

  const fontSize = size === "md" ? 12 : 10;
  const pad = size === "md" ? "4px 8px" : "2px 6px";
  const iconSize = size === "md" ? 12 : 10;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: pad,
        borderRadius: 999,
        background: bg,
        border,
        color,
        fontFamily: '"DM Mono", monospace',
        fontSize,
        fontWeight: 500,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {positive ? <TrendingUp size={iconSize} /> : <TrendingDown size={iconSize} />}
      {label ? <span style={{ opacity: 0.7 }}>{label}</span> : null}
      <span>
        {positive ? "+" : ""}
        {value.toFixed(1)}%
      </span>
    </span>
  );
}
