import type { CSSProperties } from "react";
import { Scale, TrendingUp } from "lucide-react";
import {
  formatMoneyM,
  formatMultiple,
  type Filing,
  type CompCompany,
} from "@/lib/filingsClient";

/**
 * ComparablesSection — auto-renders inside FactSheet when filing.comps exists.
 *
 * Save as:  calendar-app/src/components/ComparablesSection.tsx
 *
 * Layout:
 *   - Eyebrow + serif title
 *   - Comps table (name, ticker, market cap, revenue, P/S, EV/Rev, P/E, GM%)
 *   - Implied Valuation card (only if filing has lastRevenueM):
 *       median P/S × company revenue
 *       25th–75th percentile range
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
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
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
  marginBottom: "8px",
};

const subTitleStyle: CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "14px",
  color: COLORS.fgMuted,
  marginBottom: "24px",
  fontWeight: 300,
  lineHeight: 1.5,
};

const tableWrapStyle: CSSProperties = {
  background: COLORS.bgCard,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "10px",
  overflow: "hidden",
  marginBottom: "20px",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: FONTS.sans,
  fontSize: "13px",
};

const thStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "9px",
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: COLORS.fgDim,
  fontWeight: 500,
  textAlign: "left",
  padding: "14px 16px",
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
  whiteSpace: "nowrap",
};

const thRightStyle: CSSProperties = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
  color: COLORS.fg,
  fontWeight: 300,
};

const tdRightStyle: CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontFamily: FONTS.mono,
  fontSize: "12px",
};

const tdLastRowStyle: CSSProperties = { ...tdStyle, borderBottom: "none" };
const tdRightLastRowStyle: CSSProperties = {
  ...tdRightStyle,
  borderBottom: "none",
};

const valBoxStyle: CSSProperties = {
  background: COLORS.bgCard2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "10px",
  padding: "24px 24px 22px",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "16px",
  alignItems: "center",
};

const valLabelStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "10px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: COLORS.fgMuted,
  marginBottom: "6px",
};

const valHeadlineStyle: CSSProperties = {
  fontFamily: FONTS.serif,
  fontSize: "30px",
  fontWeight: 500,
  color: COLORS.fg,
  lineHeight: 1.1,
};

const valRangeStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "11px",
  color: COLORS.fgMuted,
  marginTop: "8px",
  letterSpacing: "0.02em",
};

const sourcesStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "10px",
  color: COLORS.fgDim,
  letterSpacing: "0.02em",
  marginTop: "16px",
  lineHeight: 1.55,
};

// ─── Helpers ────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number | undefined {
  if (sorted.length === 0) return undefined;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

interface ComparablesSectionProps {
  filing: Filing;
}

export default function ComparablesSection({ filing }: ComparablesSectionProps) {
  const comps: CompCompany[] = filing.comps ?? [];
  if (comps.length === 0) return null;

  // Sort by market cap desc for display
  const sortedForDisplay = [...comps].sort(
    (a, b) => (b.marketCapM ?? 0) - (a.marketCapM ?? 0),
  );

  // Compute percentile bands of P/S for implied valuation.
  const psValues = comps
    .map((c) => c.ps)
    .filter((x): x is number => Number.isFinite(x as number));
  psValues.sort((a, b) => a - b);

  const p25 = percentile(psValues, 25);
  const p50 = percentile(psValues, 50);
  const p75 = percentile(psValues, 75);

  const companyRevenueM = filing.financials?.lastRevenueM;
  const canValue =
    Number.isFinite(companyRevenueM as number) &&
    (companyRevenueM as number) > 0 &&
    Number.isFinite(p50 as number);

  let impliedMedianM: number | undefined;
  let implied25M: number | undefined;
  let implied75M: number | undefined;
  if (canValue) {
    impliedMedianM = (companyRevenueM as number) * (p50 as number);
    if (Number.isFinite(p25 as number))
      implied25M = (companyRevenueM as number) * (p25 as number);
    if (Number.isFinite(p75 as number))
      implied75M = (companyRevenueM as number) * (p75 as number);
  }

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <div style={eyebrowStyle}>Valuation</div>
        <h2 style={titleStyle}>Comparable companies.</h2>
        <div style={subTitleStyle}>
          Public-market peers tracked daily. Trading multiples below feed the
          implied valuation range. Data refreshed nightly.
        </div>

        {/* ── Comps table ─────────────────────────────────────── */}
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Ticker</th>
                <th style={thRightStyle}>Mkt cap</th>
                <th style={thRightStyle}>Revenue (TTM)</th>
                <th style={thRightStyle}>P/S</th>
                <th style={thRightStyle}>EV/Rev</th>
                <th style={thRightStyle}>P/E</th>
                <th style={thRightStyle}>GM %</th>
              </tr>
            </thead>
            <tbody>
              {sortedForDisplay.map((c, i) => {
                const last = i === sortedForDisplay.length - 1;
                return (
                  <tr key={c.ticker}>
                    <td style={last ? tdLastRowStyle : tdStyle}>
                      {c.name || c.ticker}
                    </td>
                    <td
                      style={{
                        ...(last ? tdLastRowStyle : tdStyle),
                        fontFamily: FONTS.mono,
                        fontSize: "12px",
                        color: COLORS.primary,
                      }}
                    >
                      {c.ticker}
                    </td>
                    <td style={last ? tdRightLastRowStyle : tdRightStyle}>
                      {formatMoneyM(c.marketCapM)}
                    </td>
                    <td style={last ? tdRightLastRowStyle : tdRightStyle}>
                      {formatMoneyM(c.revenueM)}
                    </td>
                    <td style={last ? tdRightLastRowStyle : tdRightStyle}>
                      {formatMultiple(c.ps)}
                    </td>
                    <td style={last ? tdRightLastRowStyle : tdRightStyle}>
                      {formatMultiple(c.evRevenue)}
                    </td>
                    <td style={last ? tdRightLastRowStyle : tdRightStyle}>
                      {formatMultiple(c.peRatio)}
                    </td>
                    <td style={last ? tdRightLastRowStyle : tdRightStyle}>
                      {c.grossMargin !== undefined &&
                      Number.isFinite(c.grossMargin)
                        ? `${c.grossMargin.toFixed(0)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Implied valuation ────────────────────────────────── */}
        {canValue ? (
          <div style={valBoxStyle}>
            <div>
              <div style={valLabelStyle}>
                <Scale
                  size={11}
                  style={{
                    display: "inline-block",
                    verticalAlign: "middle",
                    marginRight: 6,
                    marginTop: -2,
                  }}
                />
                Implied valuation (at peer median P/S)
              </div>
              <div style={valHeadlineStyle}>
                {formatMoneyM(impliedMedianM)}
              </div>
              {implied25M !== undefined && implied75M !== undefined ? (
                <div style={valRangeStyle}>
                  Range at 25th–75th percentile:{" "}
                  <span style={{ color: COLORS.fg }}>
                    {formatMoneyM(implied25M)} – {formatMoneyM(implied75M)}
                  </span>
                </div>
              ) : null}
            </div>

            <div
              style={{
                textAlign: "right",
                fontFamily: FONTS.mono,
                fontSize: "11px",
                color: COLORS.fgMuted,
                letterSpacing: "0.04em",
              }}
            >
              <div>{formatMoneyM(companyRevenueM)} revenue (TTM)</div>
              <div style={{ marginTop: 4 }}>
                ×{" "}
                <span style={{ color: COLORS.gold }}>
                  {formatMultiple(p50)}
                </span>{" "}
                median P/S
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: COLORS.fgDim,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <TrendingUp size={11} /> {comps.length} peers
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              ...valBoxStyle,
              gridTemplateColumns: "1fr",
              padding: "20px 24px",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: "13px",
                color: COLORS.fgMuted,
                fontWeight: 300,
                lineHeight: 1.55,
              }}
            >
              Implied valuation will appear here once the company's last-twelve-
              months revenue is available from the S-1 financial extraction.
            </div>
          </div>
        )}

        <div style={sourcesStyle}>
          Sources: Yahoo Finance via yahoo-finance2. Last refresh on each peer
          shown inline. Implied valuation assumes the company trades in line
          with peer multiples; actual pricing may differ based on growth,
          margin profile, lockups, sentiment, and market conditions.
        </div>
      </div>
    </section>
  );
}
