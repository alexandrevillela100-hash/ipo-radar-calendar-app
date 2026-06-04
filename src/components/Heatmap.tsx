import type { CSSProperties } from "react";

/**
 * Heatmap — minimal SVG 2D heatmap.
 *
 * Save as:  calendar-app/src/components/Heatmap.tsx
 *
 * Renders a grid of cells colored by value intensity. Used by /insights.
 *
 * Props:
 *   - rowLabels   : Y-axis labels (top to bottom)
 *   - colLabels   : X-axis labels (left to right)
 *   - data        : rowLabels.length × colLabels.length matrix; null = no data
 *   - colorScale  : "teal" (positive = primary) | "diverging" (red→muted→teal)
 *   - format      : function to convert a value to its cell label
 *   - title       : section title (above the grid)
 *   - subtitle    : description (below title)
 */

const COLORS = {
  primary: "#03c8b5",
  red: "#d86060",
  gold: "#c8a45c",
  fg: "#e4e6e8",
  fgMuted: "#8b9099",
  fgDim: "#5b6068",
  border: "rgba(255, 255, 255, 0.08)",
  bgCard: "#131820",
};

const FONTS = {
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '"Barlow", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", "SF Mono", Consolas, monospace',
};

interface Props {
  rowLabels: string[];
  colLabels: string[];
  data: Array<Array<number | null>>;
  colorScale?: "teal" | "diverging";
  format?: (v: number) => string;
  title?: string;
  subtitle?: string;
}

function lerpColor(c1: number[], c2: number[], t: number): string {
  const tt = Math.max(0, Math.min(1, t));
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * tt);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * tt);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * tt);
  return `rgb(${r}, ${g}, ${b})`;
}

// Convert a hex to RGB triplet
function hexToRgb(hex: string): number[] {
  const m = hex.replace("#", "");
  return [
    parseInt(m.substring(0, 2), 16),
    parseInt(m.substring(2, 4), 16),
    parseInt(m.substring(4, 6), 16),
  ];
}

const BG = hexToRgb("#0f141a"); // dark card background
const TEAL = hexToRgb(COLORS.primary);
const RED = hexToRgb(COLORS.red);

function cellColor(
  v: number | null,
  min: number,
  max: number,
  scale: "teal" | "diverging",
): string {
  if (v === null || Number.isNaN(v)) return "#1a1f28";
  if (scale === "teal") {
    const range = max - min || 1;
    const t = (v - min) / range;
    return lerpColor(BG, TEAL, t);
  }
  // diverging: red for negative, teal for positive, scaled by absolute max
  const absMax = Math.max(Math.abs(min), Math.abs(max)) || 1;
  if (v >= 0) {
    return lerpColor(BG, TEAL, v / absMax);
  }
  return lerpColor(BG, RED, Math.abs(v) / absMax);
}

function cellTextColor(v: number | null, scale: "teal" | "diverging"): string {
  if (v === null) return "#5b6068";
  if (scale === "diverging") {
    if (Math.abs(v) < 1) return COLORS.fgDim;
    return v >= 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.95)";
  }
  return v > 0 ? "rgba(255,255,255,0.95)" : COLORS.fgDim;
}

export default function Heatmap({
  rowLabels,
  colLabels,
  data,
  colorScale = "teal",
  format,
  title,
  subtitle,
}: Props) {
  const fmt = format || ((v: number) => v.toFixed(0));

  // Compute min/max across all non-null cells
  let min = Infinity;
  let max = -Infinity;
  for (const row of data) {
    for (const v of row) {
      if (v === null || Number.isNaN(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min)) { min = 0; max = 0; }

  const CELL_W = 56;
  const CELL_H = 34;
  const LABEL_W = 180;
  const TOP_H = 56;
  const VBW = LABEL_W + colLabels.length * CELL_W + 16;
  const VBH = TOP_H + rowLabels.length * CELL_H + 16;

  const cardStyle: CSSProperties = {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "24px 28px",
  };

  return (
    <div style={cardStyle}>
      {title ? (
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.fgMuted,
            marginBottom: 6,
          }}
        >
          {title}
        </div>
      ) : null}
      {subtitle ? (
        <div
          style={{
            fontFamily: FONTS.serif,
            fontSize: 22,
            fontWeight: 500,
            color: COLORS.fg,
            marginBottom: 18,
            lineHeight: 1.2,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${VBW} ${VBH}`}
          width="100%"
          style={{ minWidth: VBW, display: "block", maxWidth: "100%" }}
          aria-label={title}
        >
          {/* Column headers */}
          {colLabels.map((col, ci) => {
            const x = LABEL_W + ci * CELL_W + CELL_W / 2;
            return (
              <text
                key={`col-${ci}`}
                x={x}
                y={TOP_H - 12}
                textAnchor="middle"
                fontFamily='"DM Mono", monospace'
                fontSize="9"
                fill={COLORS.fgMuted}
                letterSpacing="1.5"
                style={{ textTransform: "uppercase" }}
              >
                {col}
              </text>
            );
          })}

          {/* Row labels + cells */}
          {rowLabels.map((label, ri) => {
            const y = TOP_H + ri * CELL_H;
            return (
              <g key={`row-${ri}`}>
                <text
                  x={LABEL_W - 12}
                  y={y + CELL_H / 2 + 4}
                  textAnchor="end"
                  fontFamily='"Barlow", sans-serif'
                  fontSize="13"
                  fill={COLORS.fg}
                  fontWeight="300"
                >
                  {label}
                </text>

                {colLabels.map((_, ci) => {
                  const v = data[ri]?.[ci] ?? null;
                  const fill = cellColor(v, min, max, colorScale);
                  const textFill = cellTextColor(v, colorScale);
                  const x = LABEL_W + ci * CELL_W;
                  const isPresent = v !== null && !Number.isNaN(v);
                  return (
                    <g key={`cell-${ri}-${ci}`}>
                      <rect
                        x={x + 2}
                        y={y + 2}
                        width={CELL_W - 4}
                        height={CELL_H - 4}
                        rx={3}
                        fill={fill}
                        stroke={COLORS.border}
                        strokeWidth={isPresent ? 0 : 0.5}
                      />
                      {isPresent ? (
                        <text
                          x={x + CELL_W / 2}
                          y={y + CELL_H / 2 + 4}
                          textAnchor="middle"
                          fontFamily='"DM Mono", monospace'
                          fontSize="10"
                          fill={textFill}
                        >
                          {fmt(v as number)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
