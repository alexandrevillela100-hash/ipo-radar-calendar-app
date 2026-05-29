import type { CSSProperties } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Sparkline from "@/components/Sparkline";
import { formatPct, returnColor } from "@/lib/filingsClient";
import type { Filing } from "@/lib/filingsClient";

/**
 * PerformanceSection — renders inside FactSheet when filing.performance exists.
 *
 * Save as:  calendar-app/src/components/PerformanceSection.tsx
 *
 * Sections:
 *   - Header (IPO date + last updated)
 *   - KPI tiles: Offer / Day-1 close / Current / Since-IPO return
 *   - Sparkline (full price history)
 *   - Benchmark row: vs. SPY / vs. IPO ETF / first-day pop
 */

const COLORS = {
  bg: "#0a0d10",
  bgCard: "#131820",
  bgCard2: "#181f28",
  fg: "#e4e6e8",
  fgMuted: "#8b9099",
  fgDim: "#5b6068",
  primary: "#03c8b5",
  red: "#d86060",
  gold: "#c8a45c",
  border: "rgba(255, 255, 255, 0.08)",
};

const FONTS = {
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '"Barlow", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", "SF Mono", Consolas, monospace',
};

const sectionStyle: CSSProperties = {
  padding: "48px 0",
  borderTop: `1px solid ${COLORS.border}`,
};

const containerStyle: CSSProperties = {
  maxWidth: "1080px",
  margin: "0 auto",
  padding: "0 32px",
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  marginBottom: "24px",
  flexWrap: "wrap",
  gap: "8px",
};

const eyebrowStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "11px",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: COLORS.primary,
  marginBottom: "8px",
};

const titleStyle: CSSProperties = {
  fontFamily: FONTS.serif,
  fontSize: "36px",
  fontWeight: 500,
  color: COLORS.fg,
  margin: 0,
  lineHeight: 1.1,
};

const metaStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "11px",
  color: COLORS.fgDim,
  letterSpacing: "0.04em",
};

const tilesGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "24px",
};

const tileStyle: CSSProperties = {
  background: COLORS.bgCard,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "10px",
  padding: "16px 18px",
};

const tileLabelStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "10px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: COLORS.fgMuted,
  marginBottom: "8px",
};

const tileValueStyle: CSSProperties = {
  fontFamily: FONTS.serif,
  fontSize: "26px",
  fontWeight: 500,
  color: COLORS.fg,
  lineHeight: 1,
};

const tileSubStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "11px",
  color: COLORS.fgMuted,
  marginTop: "6px",
};

const sparkBoxStyle: CSSProperties = {
  background: COLORS.bgCard,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "10px",
  padding: "20px 18px",
  marginBottom: "16px",
};

const benchmarkRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const benchmarkCardStyle: CSSProperties = {
  background: COLORS.bgCard2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "10px",
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

interface PerformanceSectionProps {
  filing: Filing;
}

function TrendIcon({ value }: { value: number | undefined }) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return <Minus size={14} style={{ color: COLORS.fgMuted }} />;
  }
  if (value > 0) {
    return <TrendingUp size={14} style={{ color: COLORS.primary }} />;
  }
  if (value < 0) {
    return <TrendingDown size={14} style={{ color: COLORS.red }} />;
  }
  return <Minus size={14} style={{ color: COLORS.fgMuted }} />;
}

function formatPrice(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function relativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const diffH = (Date.now() - d.getTime()) / 1000 / 3600;
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}

export default function PerformanceSection({ filing }: PerformanceSectionProps) {
  const p = filing.performance;
  const pricing = filing.pricing;

  if (!p) return null;

  const offerPrice = pricing?.offerPrice;
  const ipoDate = pricing?.ipoDate;

  const stroke =
    p.returnSinceIPO !== undefined && p.returnSinceIPO < 0
      ? COLORS.red
      : COLORS.primary;
  const fill =
    p.returnSinceIPO !== undefined && p.returnSinceIPO < 0
      ? "rgba(216, 96, 96, 0.18)"
      : "rgba(3, 200, 181, 0.18)";

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <div style={headerRowStyle}>
          <div>
            <div style={eyebrowStyle}>Post-IPO performance</div>
            <h2 style={titleStyle}>
              {filing.companyName}
              {filing.ticker ? (
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: "18px",
                    color: COLORS.fgMuted,
                    marginLeft: "12px",
                    letterSpacing: "0.04em",
                  }}
                >
                  ({filing.ticker})
                </span>
              ) : null}
            </h2>
          </div>
          <div style={metaStyle}>
            IPO {formatDate(ipoDate)} · Updated {relativeTime(p.lastUpdated)}
          </div>
        </div>

        {/* KPI tiles */}
        <div style={tilesGridStyle}>
          <div style={tileStyle}>
            <div style={tileLabelStyle}>Offer price</div>
            <div style={tileValueStyle}>{formatPrice(offerPrice)}</div>
            <div style={tileSubStyle}>{formatDate(ipoDate)}</div>
          </div>

          <div style={tileStyle}>
            <div style={tileLabelStyle}>Day-1 close</div>
            <div style={tileValueStyle}>{formatPrice(p.closeDay1)}</div>
            <div
              style={{
                ...tileSubStyle,
                color: returnColor(p.firstDayPop),
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <TrendIcon value={p.firstDayPop} />
              {formatPct(p.firstDayPop)} pop
            </div>
          </div>

          <div style={tileStyle}>
            <div style={tileLabelStyle}>Current</div>
            <div style={tileValueStyle}>{formatPrice(p.currentPrice)}</div>
            <div style={tileSubStyle}>latest close</div>
          </div>

          <div style={tileStyle}>
            <div style={tileLabelStyle}>Since IPO</div>
            <div
              style={{
                ...tileValueStyle,
                color: returnColor(p.returnSinceIPO),
              }}
            >
              {formatPct(p.returnSinceIPO)}
            </div>
            <div
              style={{
                ...tileSubStyle,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <TrendIcon value={p.returnSinceIPO} />
              vs. offer
            </div>
          </div>
        </div>

        {/* Sparkline */}
        <div style={sparkBoxStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COLORS.fgMuted,
              }}
            >
              Price history since IPO
            </div>
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: "11px",
                color: COLORS.fgDim,
              }}
            >
              {p.history?.length ?? 0} trading days
            </div>
          </div>
          <Sparkline
            data={p.history ?? []}
            height={120}
            stroke={stroke}
            fill={fill}
          />
        </div>

        {/* Benchmark row */}
        <div style={benchmarkRowStyle}>
          <div style={benchmarkCardStyle}>
            <div>
              <div style={tileLabelStyle}>vs. S&P 500</div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: "10px",
                  color: COLORS.fgDim,
                  marginTop: "2px",
                }}
              >
                Same window, SPY
              </div>
            </div>
            <div
              style={{
                fontFamily: FONTS.serif,
                fontSize: "22px",
                fontWeight: 500,
                color: returnColor(p.spy?.returnSinceIPO),
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <TrendIcon value={p.spy?.returnSinceIPO} />
              {formatPct(p.spy?.returnSinceIPO)}
            </div>
          </div>

          <div style={benchmarkCardStyle}>
            <div>
              <div style={tileLabelStyle}>vs. IPO cohort</div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: "10px",
                  color: COLORS.fgDim,
                  marginTop: "2px",
                }}
              >
                Renaissance IPO ETF
              </div>
            </div>
            <div
              style={{
                fontFamily: FONTS.serif,
                fontSize: "22px",
                fontWeight: 500,
                color: returnColor(p.ipoETF?.returnSinceIPO),
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <TrendIcon value={p.ipoETF?.returnSinceIPO} />
              {formatPct(p.ipoETF?.returnSinceIPO)}
            </div>
          </div>

          <div style={benchmarkCardStyle}>
            <div>
              <div style={tileLabelStyle}>First-day pop</div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: "10px",
                  color: COLORS.fgDim,
                  marginTop: "2px",
                }}
              >
                Offer → Day-1 close
              </div>
            </div>
            <div
              style={{
                fontFamily: FONTS.serif,
                fontSize: "22px",
                fontWeight: 500,
                color: returnColor(p.firstDayPop),
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <TrendIcon value={p.firstDayPop} />
              {formatPct(p.firstDayPop)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
