import type { CSSProperties } from "react";
import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import OverlaySparkline from "@/components/OverlaySparkline";
import {
  formatPct,
  returnColor,
  type Filing,
} from "@/lib/filingsClient";

/**
 * PerformanceVsBenchmark — overlay of company price-history vs SPY
 * (and optionally vs the Renaissance IPO ETF) normalized to % return
 * from each series' first data point.
 *
 * Save as:  calendar-app/src/components/PerformanceVsBenchmark.tsx
 *
 * Renders when filing.performance.history has data AND at least one
 * benchmark series (spy.history or ipoETF.history) is present. The
 * track-performance v2 script populates the benchmark histories; if
 * they're missing for a name, this section auto-hides.
 *
 * Headline KPI shows alpha vs SPY (company return − SPY return) over
 * the same window.
 */

const COLORS = {
  bg: "#0a0d10",
  bgCard: "#131820",
  bgCard2: "#181f28",
  fg: "#e4e6e8",
  fgMuted: "#8b9099",
  fgDim: "#5b6068",
  primary: "#03c8b5",
  gold: "#c8a45c",
  red: "#d86060",
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

interface Props {
  filing: Filing;
}

function TrendIcon({ value }: { value: number | undefined }) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return <Minus size={14} style={{ color: COLORS.fgMuted }} />;
  }
  if (value > 0) return <TrendingUp size={14} style={{ color: COLORS.primary }} />;
  if (value < 0) return <TrendingDown size={14} style={{ color: COLORS.red }} />;
  return <Minus size={14} style={{ color: COLORS.fgMuted }} />;
}

export default function PerformanceVsBenchmark({ filing }: Props) {
  const p = filing.performance;
  if (!p) return null;

  const companyHist = p.history ?? [];
  const spyHist = p.spy?.history ?? [];
  const ipoHist = p.ipoETF?.history ?? [];

  // Need at least the company series + one benchmark
  const hasCompany = companyHist.length >= 2;
  const hasSpy = spyHist.length >= 2;
  const hasIpoEtf = ipoHist.length >= 2;
  if (!hasCompany || (!hasSpy && !hasIpoEtf)) return null;

  const companyReturn = p.returnSinceIPO;
  const spyReturn = p.spy?.returnSinceIPO;
  const ipoEtfReturn = p.ipoETF?.returnSinceIPO;

  const alphaSpy =
    Number.isFinite(companyReturn as number) && Number.isFinite(spyReturn as number)
      ? (companyReturn as number) - (spyReturn as number)
      : undefined;
  const alphaIpoEtf =
    Number.isFinite(companyReturn as number) &&
    Number.isFinite(ipoEtfReturn as number)
      ? (companyReturn as number) - (ipoEtfReturn as number)
      : undefined;

  const series = [
    {
      label: `${filing.ticker || filing.companyName}`,
      color: COLORS.primary,
      data: companyHist,
    },
  ];
  if (hasSpy) {
    series.push({ label: "S&P 500 (SPY)", color: COLORS.gold, data: spyHist });
  }
  if (hasIpoEtf) {
    series.push({ label: "IPO ETF", color: "#7a89d8", data: ipoHist });
  }

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.primary,
            marginBottom: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Zap size={14} /> Alpha vs. benchmarks
        </div>
        <h2
          style={{
            fontFamily: FONTS.serif,
            fontSize: 36,
            fontWeight: 500,
            color: COLORS.fg,
            margin: 0,
            lineHeight: 1.1,
            marginBottom: 8,
          }}
        >
          How {filing.ticker || filing.companyName} did vs. the market.
        </h2>
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 14,
            color: COLORS.fgMuted,
            marginBottom: 24,
            fontWeight: 300,
            lineHeight: 1.55,
          }}
        >
          Lines normalized to 0% at IPO. Difference between the lines = alpha
          vs. that benchmark over the same window.
        </div>

        {/* Headline alpha tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <AlphaTile
            label={`${filing.ticker || "Company"} since IPO`}
            value={formatPct(companyReturn)}
            color={returnColor(companyReturn)}
            sub="company return"
          />
          {hasSpy ? (
            <AlphaTile
              label="vs. S&P 500"
              value={formatPct(alphaSpy)}
              color={returnColor(alphaSpy)}
              sub={`SPY ${formatPct(spyReturn)}`}
              icon={<TrendIcon value={alphaSpy} />}
            />
          ) : null}
          {hasIpoEtf ? (
            <AlphaTile
              label="vs. IPO cohort"
              value={formatPct(alphaIpoEtf)}
              color={returnColor(alphaIpoEtf)}
              sub={`IPO ETF ${formatPct(ipoEtfReturn)}`}
              icon={<TrendIcon value={alphaIpoEtf} />}
            />
          ) : null}
        </div>

        {/* Overlay chart */}
        <div
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "20px 18px 14px 18px",
          }}
        >
          <OverlaySparkline series={series} height={240} />
          <div
            style={{
              marginTop: 10,
              fontFamily: FONTS.mono,
              fontSize: 10,
              color: COLORS.fgDim,
              letterSpacing: "0.02em",
              lineHeight: 1.55,
            }}
          >
            X-axis = trading days since each line's start point. Both the
            company and benchmarks begin at 0% and re-base to each day's
            close.
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Tile ───────────────────────────────────────────────────────────

function AlphaTile({
  label,
  value,
  color,
  sub,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLORS.fgMuted,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.serif,
          fontSize: 28,
          fontWeight: 500,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 6,
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: COLORS.fgDim,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {icon}
          {sub}
        </div>
      ) : null}
    </div>
  );
}
