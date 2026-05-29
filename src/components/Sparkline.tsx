import type { CSSProperties } from "react";

/**
 * Sparkline — minimal SVG line chart.
 *
 * Save as:  calendar-app/src/components/Sparkline.tsx
 *
 * Pure SVG, no chart library. Designed to live inside the
 * Performance section of the fact sheet.
 *
 * Props:
 *   data       — array of { date, price } sorted ascending
 *   width      — defaults to 100% (responsive via viewBox)
 *   height     — defaults to 80
 *   stroke     — line color (defaults to Velocia teal)
 *   fill       — fill gradient color (defaults to teal w/ alpha)
 *   showAxis   — show subtle baseline axis (default false)
 */

export interface SparklinePoint {
  date: string;
  price: number;
}

interface SparklineProps {
  data: SparklinePoint[];
  width?: number | string;
  height?: number;
  stroke?: string;
  fill?: string;
  showAxis?: boolean;
  style?: CSSProperties;
}

export default function Sparkline({
  data,
  width = "100%",
  height = 80,
  stroke = "#03c8b5",
  fill = "rgba(3, 200, 181, 0.18)",
  showAxis = false,
  style,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#5b6068",
          fontFamily: '"Barlow", sans-serif',
          fontSize: 12,
          ...style,
        }}
      >
        Not enough price history yet
      </div>
    );
  }

  const VBW = 600; // virtual width inside viewBox
  const VBH = 100; // virtual height
  const padX = 4;
  const padY = 6;

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const stepX = (VBW - 2 * padX) / (data.length - 1);

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + (VBH - 2 * padY) * (1 - (d.price - min) / range);
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${
    VBH - padY
  } L ${points[0].x.toFixed(2)} ${VBH - padY} Z`;

  const gradId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VBW} ${VBH}`}
      preserveAspectRatio="none"
      style={{ display: "block", ...style }}
      aria-label="Price history sparkline"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={1} />
          <stop offset="100%" stopColor={fill} stopOpacity={0} />
        </linearGradient>
      </defs>

      {showAxis && (
        <line
          x1={padX}
          x2={VBW - padX}
          y1={VBH - padY}
          y2={VBH - padY}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      )}

      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* end-point dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2.5"
        fill={stroke}
      />
    </svg>
  );
}
