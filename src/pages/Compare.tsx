import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import OverlaySparkline from "@/components/OverlaySparkline";
import {
  getFilingBySlug,
  filingTypeColor,
  formatPct,
  returnColor,
  formatMoneyM,
  formatMultiple,
  type Filing,
} from "@/lib/filingsClient";

/**
 * Compare — side-by-side IPO comparison page.
 *
 * Save as:  calendar-app/src/pages/Compare.tsx
 *
 * URL: /compare/:slugA/vs/:slugB
 *   e.g. /compare/reddit/vs/arm
 *
 * Layout:
 *   - Header strip with both company names + "VS" divider
 *   - Overlay sparkline (% return since each company's IPO, on same axes)
 *   - 2-column KPI grid (Offer / Day-1 close / Current / Since IPO etc.)
 *   - 2-column comparison: industry, gross proceeds, lead underwriters
 *   - Comps side-by-side (top 3 per side for compactness)
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
  blue: "#7a89d8",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
};

const FONTS = {
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '"Barlow", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", "SF Mono", Consolas, monospace',
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Barlow:wght@200;300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap";

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: COLORS.bg,
  color: COLORS.fg,
  fontFamily: FONTS.sans,
  paddingTop: "96px",
  paddingBottom: "96px",
};

const containerStyle: CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
  padding: "0 32px",
};

const COLOR_A = COLORS.primary;
const COLOR_B = COLORS.gold;

export default function Compare() {
  const [match, params] = useRoute("/compare/:slugA/vs/:slugB");
  const slugA = match ? params.slugA : null;
  const slugB = match ? params.slugB : null;

  const [filingA, setFilingA] = useState<Filing | null>(null);
  const [filingB, setFilingB] = useState<Filing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!slugA || !slugB) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getFilingBySlug(slugA), getFilingBySlug(slugB)])
      .then(([a, b]) => {
        if (cancelled) return;
        setFilingA(a);
        setFilingB(b);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("[Compare] failed to load:", err);
        setError(err?.message || "Failed to load filings");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slugA, slugB]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "120px 0",
              color: COLORS.fgMuted,
            }}
          >
            <Loader2
              size={20}
              style={{
                marginRight: 10,
                animation: "spin 1s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading comparison…
          </div>
        </div>
      </div>
    );
  }

  if (error || !filingA || !filingB) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ color: "#d86060", padding: "40px 0" }}>
            {error
              ? `Error: ${error}`
              : `One or both filings not found (${slugA}, ${slugB})`}
          </div>
        </div>
      </div>
    );
  }

  const performanceA = filingA.performance;
  const performanceB = filingB.performance;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* ── Header ───────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: FONTS.mono,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.primary,
            marginBottom: 12,
          }}
        >
          <ArrowLeftRight size={14} />
          Side-by-side comparison
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 32,
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <CompanyHeader filing={filingA} color={COLOR_A} />
          <div
            style={{
              fontFamily: FONTS.serif,
              fontSize: 32,
              color: COLORS.fgDim,
              fontStyle: "italic",
            }}
          >
            vs.
          </div>
          <CompanyHeader filing={filingB} color={COLOR_B} align="right" />
        </div>

        {/* ── Performance overlay ──────────────────────────────── */}
        {(performanceA?.history?.length || 0) >= 2 ||
        (performanceB?.history?.length || 0) >= 2 ? (
          <SectionCard>
            <SectionLabel>Normalized performance since IPO</SectionLabel>
            <OverlaySparkline
              height={260}
              series={[
                {
                  label: `${filingA.ticker || filingA.companyName} (${performanceA?.history?.length ?? 0}d)`,
                  color: COLOR_A,
                  data: performanceA?.history ?? [],
                },
                {
                  label: `${filingB.ticker || filingB.companyName} (${performanceB?.history?.length ?? 0}d)`,
                  color: COLOR_B,
                  data: performanceB?.history ?? [],
                },
              ]}
            />
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 10,
                color: COLORS.fgDim,
                marginTop: 14,
                lineHeight: 1.55,
              }}
            >
              Y-axis = % return from each company's IPO close. X-axis = trading
              days since each company's IPO (not calendar-aligned).
            </div>
          </SectionCard>
        ) : null}

        {/* ── KPI grid ─────────────────────────────────────────── */}
        <SectionCard>
          <SectionLabel>Performance KPIs</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <KpiRow
              label="Offer price"
              valueA={moneyOrDash(filingA.pricing?.offerPrice)}
              valueB={moneyOrDash(filingB.pricing?.offerPrice)}
              colorA={COLORS.fg}
              colorB={COLORS.fg}
            />
            <KpiRow
              label="Day-1 close"
              valueA={moneyOrDash(performanceA?.closeDay1)}
              valueB={moneyOrDash(performanceB?.closeDay1)}
              colorA={COLORS.fg}
              colorB={COLORS.fg}
            />
            <KpiRow
              label="Current price"
              valueA={moneyOrDash(performanceA?.currentPrice)}
              valueB={moneyOrDash(performanceB?.currentPrice)}
              colorA={COLORS.fg}
              colorB={COLORS.fg}
            />
            <KpiRow
              label="First-day pop"
              valueA={formatPct(performanceA?.firstDayPop)}
              valueB={formatPct(performanceB?.firstDayPop)}
              colorA={returnColor(performanceA?.firstDayPop)}
              colorB={returnColor(performanceB?.firstDayPop)}
            />
            <KpiRow
              label="Since-IPO return"
              valueA={formatPct(performanceA?.returnSinceIPO)}
              valueB={formatPct(performanceB?.returnSinceIPO)}
              colorA={returnColor(performanceA?.returnSinceIPO)}
              colorB={returnColor(performanceB?.returnSinceIPO)}
            />
            <KpiRow
              label="vs. S&P 500"
              valueA={formatPct(performanceA?.spy?.returnSinceIPO)}
              valueB={formatPct(performanceB?.spy?.returnSinceIPO)}
              colorA={returnColor(performanceA?.spy?.returnSinceIPO)}
              colorB={returnColor(performanceB?.spy?.returnSinceIPO)}
            />
            <KpiRow
              label="vs. IPO cohort"
              valueA={formatPct(performanceA?.ipoETF?.returnSinceIPO)}
              valueB={formatPct(performanceB?.ipoETF?.returnSinceIPO)}
              colorA={returnColor(performanceA?.ipoETF?.returnSinceIPO)}
              colorB={returnColor(performanceB?.ipoETF?.returnSinceIPO)}
            />
          </div>
        </SectionCard>

        {/* ── Deal terms ───────────────────────────────────────── */}
        <SectionCard>
          <SectionLabel>Deal terms</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <KpiRow
              label="Gross proceeds"
              valueA={formatMoneyM(filingA.grossProceedsM)}
              valueB={formatMoneyM(filingB.grossProceedsM)}
            />
            <KpiRow
              label="Shares offered (M)"
              valueA={
                filingA.pricing?.sharesOfferedM !== undefined
                  ? filingA.pricing.sharesOfferedM.toFixed(1)
                  : "—"
              }
              valueB={
                filingB.pricing?.sharesOfferedM !== undefined
                  ? filingB.pricing.sharesOfferedM.toFixed(1)
                  : "—"
              }
            />
            <KpiRow
              label="Exchange"
              valueA={filingA.exchange || "—"}
              valueB={filingB.exchange || "—"}
            />
            <KpiRow
              label="Industry"
              valueA={filingA.industry || "—"}
              valueB={filingB.industry || "—"}
            />
            <ListRow
              label="Lead underwriters"
              valueA={filingA.leadUnderwriters}
              valueB={filingB.leadUnderwriters}
            />
          </div>
        </SectionCard>

        {/* ── Comparables / valuation ──────────────────────────── */}
        <SectionCard>
          <SectionLabel>Peer multiples (top 3)</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
            }}
          >
            <CompsBlock filing={filingA} color={COLOR_A} />
            <CompsBlock filing={filingB} color={COLOR_B} />
          </div>
        </SectionCard>

        {/* ── Back links ───────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            marginTop: 32,
            flexWrap: "wrap",
            fontFamily: FONTS.mono,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {filingA.reportSlug ? (
            <Link
              href={`/fact-sheet/${filingA.reportSlug}`}
              style={{ color: COLOR_A, textDecoration: "none" }}
            >
              ← {filingA.ticker || filingA.companyName} fact sheet
            </Link>
          ) : null}
          {filingB.reportSlug ? (
            <Link
              href={`/fact-sheet/${filingB.reportSlug}`}
              style={{ color: COLOR_B, textDecoration: "none" }}
            >
              {filingB.ticker || filingB.companyName} fact sheet →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function CompanyHeader({
  filing,
  color,
  align = "left",
}: {
  filing: Filing;
  color: string;
  align?: "left" | "right";
}) {
  const accent = filingTypeColor(filing.filingType);
  return (
    <div style={{ textAlign: align }}>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: "0.14em",
          color: COLORS.fgDim,
          marginBottom: 8,
        }}
      >
        {filing.exchange && filing.exchange !== "UNKNOWN"
          ? `${filing.exchange}: `
          : ""}
        <span style={{ color }}>{filing.ticker || "—"}</span>
      </div>
      <div
        style={{
          fontFamily: FONTS.serif,
          fontSize: 48,
          fontWeight: 500,
          lineHeight: 1.05,
          letterSpacing: "-0.01em",
        }}
      >
        {filing.companyName}
      </div>
      <div
        style={{
          marginTop: 12,
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: "0.12em",
          color: accent,
          textTransform: "uppercase",
        }}
      >
        {filing.filingType}
        {filing.industry ? ` · ${filing.industry}` : ""}
      </div>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: "24px 28px 28px",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: COLORS.fgMuted,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function KpiRow({
  label,
  valueA,
  valueB,
  colorA,
  colorB,
}: {
  label: string;
  valueA: string;
  valueB: string;
  colorA?: string;
  colorB?: string;
}) {
  return (
    <>
      <KpiCell label={label} value={valueA} color={colorA} />
      <KpiCell label={label} value={valueB} color={colorB} hideLabel />
    </>
  );
}

function KpiCell({
  label,
  value,
  color,
  hideLabel,
}: {
  label: string;
  value: string;
  color?: string;
  hideLabel?: boolean;
}) {
  return (
    <div
      style={{
        background: COLORS.bgCard2,
        border: `1px solid ${COLORS.borderSubtle}`,
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLORS.fgMuted,
          marginBottom: 6,
          visibility: hideLabel ? "hidden" : "visible",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.serif,
          fontSize: 22,
          fontWeight: 500,
          color: color || COLORS.fg,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ListRow({
  label,
  valueA,
  valueB,
}: {
  label: string;
  valueA?: string[];
  valueB?: string[];
}) {
  const render = (list: string[] | undefined, hideLabel = false) => (
    <div
      style={{
        background: COLORS.bgCard2,
        border: `1px solid ${COLORS.borderSubtle}`,
        borderRadius: 8,
        padding: "14px 16px",
        minHeight: 76,
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
          visibility: hideLabel ? "hidden" : "visible",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: 13,
          color: COLORS.fg,
          fontWeight: 300,
          lineHeight: 1.55,
        }}
      >
        {list && list.length > 0 ? list.join(", ") : "—"}
      </div>
    </div>
  );
  return (
    <>
      {render(valueA)}
      {render(valueB, true)}
    </>
  );
}

function CompsBlock({ filing, color }: { filing: Filing; color: string }) {
  const top = (filing.comps ?? [])
    .filter((c) => Number.isFinite(c.marketCapM))
    .sort((a, b) => (b.marketCapM ?? 0) - (a.marketCapM ?? 0))
    .slice(0, 3);

  return (
    <div
      style={{
        background: COLORS.bgCard2,
        border: `1px solid ${COLORS.borderSubtle}`,
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color,
          marginBottom: 12,
        }}
      >
        {filing.ticker || filing.companyName} peers
      </div>
      {top.length === 0 ? (
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: COLORS.fgDim,
          }}
        >
          No comp data yet.
        </div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: FONTS.sans,
            fontSize: 12,
          }}
        >
          <thead>
            <tr style={{ color: COLORS.fgDim, fontSize: 10 }}>
              <th style={{ textAlign: "left", padding: "6px 0" }}>Peer</th>
              <th style={{ textAlign: "right", padding: "6px 0" }}>Mkt cap</th>
              <th style={{ textAlign: "right", padding: "6px 0" }}>P/S</th>
            </tr>
          </thead>
          <tbody>
            {top.map((c) => (
              <tr key={c.ticker} style={{ color: COLORS.fg }}>
                <td style={{ padding: "6px 0", fontWeight: 300 }}>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      color: COLORS.primary,
                      marginRight: 8,
                    }}
                  >
                    {c.ticker}
                  </span>
                </td>
                <td
                  style={{
                    padding: "6px 0",
                    textAlign: "right",
                    fontFamily: FONTS.mono,
                    fontSize: 11,
                  }}
                >
                  {formatMoneyM(c.marketCapM)}
                </td>
                <td
                  style={{
                    padding: "6px 0",
                    textAlign: "right",
                    fontFamily: FONTS.mono,
                    fontSize: 11,
                  }}
                >
                  {formatMultiple(c.ps)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function moneyOrDash(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}
