import type { CSSProperties } from "react";

/**
 * OverlaySparkline — 2-line SVG chart for comparing performance.
 *
 * Save as:  calendar-app/src/components/OverlaySparkline.tsx
 *
 * Normalizes both series to % return from their first data point so
 * companies trading at different absolute price levels are still
 * directly comparable on the same y-axis.
 *
 * Both series share the same x-axis (trading days since each series'
 * own start — NOT calendar-aligned). That makes for an "X days since
 * IPO" comparison: how did Reddit do at day 30 vs. how did Snap do at
 * day 30, etc.
 */

export interface OverlayDataset {
  label: string;
  color: string;
  data: Array<{ date: string; price: number }>;
}

interface Props {
  series: OverlayDataset[];
  height?: number;
  style?: CSSProperties;
}

export default function OverlaySparkline({
  series,
  height = 220,
  style,
}: Props) {
  if (!series || series.length === 0) {
    return (
      <EmptyChart height={height} style={style}>
        No data available
      </EmptyChart>
    );
  }

  // Convert each series to % return from its starting point.
  const normalized = series.map((s) => {
    const data = s.data ?? [];
    if (data.length < 2) {
      return { ...s, normalized: [] as number[] };
    }
    const base = data[0].price;
    if (!base) return { ...s, normalized: [] as number[] };
    return {
      ...s,
      normalized: data.map((d) => ((d.price - base) / base) * 100),
    };
  });

  const allValid = normalized.filter((s) => s.normalized.length >= 2);
  if (allValid.length === 0) {
    return (
      <EmptyChart height={height} style={style}>
        Not enough price history yet
      </EmptyChart>
    );
  }

  const VBW = 800;
  const VBH = 280;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  // X axis = days-since-start, capped at the longer series length.
  const longest = Math.max(...allValid.map((s) => s.normalized.length));

  // Y axis = % return, scaled to include both series + a small buffer.
  const allValues = allValid.flatMap((s) => s.normalized);
  const yMin = Math.min(0, ...allValues);
  const yMax = Math.max(0, ...allValues);
  const yPadding = (yMax - yMin) * 0.08 || 5;
  const yLo = yMin - yPadding;
  const yHi = yMax + yPadding;
  const yRange = yHi - yLo || 1;

  const xScale = (i: number) =>
    padL + ((VBW - padL - padR) * i) / Math.max(1, longest - 1);
  const yScale = (v: number) =>
    padT + (VBH - padT - padB) * (1 - (v - yLo) / yRange);

  // Y-axis ticks (zero line + min + max)
  const niceTicks = (lo: number, hi: number): number[] => {
    const step = niceStep((hi - lo) / 5);
    const start = Math.ceil(lo / step) * step;
    const ticks: number[] = [];
    for (let v = start; v <= hi; v += step) ticks.push(Number(v.toFixed(2)));
    if (ticks.length === 0) ticks.push(0);
    return ticks;
  };
  const yTicks = niceTicks(yLo, yHi);

  // X-axis sample tick labels at start / mid / end
  const xTicks = [
    0,
    Math.floor(longest / 2),
    Math.max(0, longest - 1),
  ];

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: "block", ...style }}
      aria-label="Overlay sparkline"
    >
      {/* Y grid + labels */}
      {yTicks.map((t, i) => {
        const y = yScale(t);
        return (
          <g key={`y${i}`}>
            <line
              x1={padL}
              x2={VBW - padR}
              y1={y}
              y2={y}
              stroke={t === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}
              strokeWidth={t === 0 ? 1 : 1}
              strokeDasharray={t === 0 ? "0" : "2 4"}
            />
            <text
              x={padL - 8}
              y={y + 3}
              textAnchor="end"
              fontFamily='"DM Mono", monospace'
              fontSize="9"
              fill="rgba(228,230,232,0.55)"
            >
              {t > 0 ? "+" : ""}
              {t.toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* X tick labels */}
      {xTicks.map((i, idx) => {
        const x = xScale(i);
        return (
          <text
            key={`x${idx}`}
            x={x}
            y={VBH - padB + 18}
            textAnchor="middle"
            fontFamily='"DM Mono", monospace'
            fontSize="9"
            fill="rgba(228,230,232,0.5)"
          >
            {i === 0 ? "IPO" : `d+${i}`}
          </text>
        );
      })}

      {/* Lines */}
      {allValid.map((s) => {
        const path = s.normalized
          .map((v, i) => {
            const x = xScale(i).toFixed(2);
            const y = yScale(v).toFixed(2);
            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");
        return (
          <g key={s.label}>
            <path
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* end-point dot */}
            <circle
              cx={xScale(s.normalized.length - 1)}
              cy={yScale(s.normalized[s.normalized.length - 1])}
              r="3.5"
              fill={s.color}
            />
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${padL}, ${padT - 2})`}>
        {allValid.map((s, i) => (
          <g key={s.label} transform={`translate(${i * 160}, 0)`}>
            <circle cx={5} cy={6} r={5} fill={s.color} />
            <text
              x={16}
              y={9}
              fontFamily='"Barlow", sans-serif'
              fontSize="11"
              fill="rgba(228,230,232,0.85)"
              fontWeight="500"
            >
              {s.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const base = Math.pow(10, exp);
  const norm = rough / base;
  let nice = 1;
  if (norm > 5) nice = 10;
  else if (norm > 2) nice = 5;
  else if (norm > 1) nice = 2;
  return nice * base;
}

function EmptyChart({
  height,
  style,
  children,
}: {
  height: number;
  style?: CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#5b6068",
        fontFamily: '"Barlow", sans-serif',
        fontSize: 13,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
