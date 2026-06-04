import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useRoute } from "wouter";
import {
  Building2,
  Calendar as CalendarIcon,
  DollarSign,
  Download,
  TrendingUp,
  Users,
  AlertTriangle,
  ExternalLink,
  Briefcase,
} from "lucide-react";
import FactSheetChat from "@/components/FactSheetChat";
import PerformanceSection from "@/components/PerformanceSection";
import ComparablesSection from "@/components/ComparablesSection";
import DownloadFinancialsButton from "@/components/DownloadFinancialsButton";
import CompareWithButton from "@/components/CompareWithButton";
import StarButton from "@/components/StarButton";
import AmendmentDiffSection from "@/components/AmendmentDiffSection";
import {
  getFilingBySlug,
  filingTypeColor,
  hasFinancialsDeep,
  hasAmendmentDiff,
  formatPct,
  type Filing,
} from "@/lib/filingsClient";
import { useDocumentMeta } from "@/lib/useDocumentMeta";

/**
 * FactSheet — v9.
 *
 * Save as:  calendar-app/src/pages/FactSheet.tsx (overwrite v8)
 *
 * Changes from v8:
 *   - Adds StarButton (chip variant) into the CTA bar
 *   - Adds AmendmentDiffSection between Performance and The Offering
 *     when filing.amendmentDiff exists
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
  paddingTop: "64px",
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
};

function shortDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  if (n >= 1) return `$${n.toFixed(0)}M`;
  return `$${(n * 1000).toFixed(0)}K`;
}

function buildOgDescription(filing: Filing): string {
  const bits: string[] = [];
  if (filing.ticker) bits.push(filing.ticker);
  if (filing.industry) bits.push(filing.industry);
  bits.push(`${filing.filingType} filed ${shortDate(filing.filingDate)}`);
  if (filing.performance?.returnSinceIPO !== undefined) {
    bits.push(`Since IPO ${formatPct(filing.performance.returnSinceIPO)}`);
  } else if (filing.performance?.firstDayPop !== undefined) {
    bits.push(`Day-1 pop ${formatPct(filing.performance.firstDayPop)}`);
  }
  return bits.join(" · ");
}

export default function FactSheet() {
  const [match, params] = useRoute("/fact-sheet/:slug");
  const slug = match ? params.slug : null;

  const [filing, setFiling] = useState<Filing | null>(null);
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
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getFilingBySlug(slug)
      .then((row) => {
        if (cancelled) return;
        setFiling(row);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("[FactSheet] failed to load:", err);
        setError(err?.message || "Failed to load filing");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useDocumentMeta({
    title: filing
      ? `${filing.companyName}${filing.ticker ? ` (${filing.ticker})` : ""} — IPO Radar`
      : "IPO Radar",
    description: filing ? buildOgDescription(filing) : undefined,
    ogTitle: filing
      ? `${filing.companyName}${filing.ticker ? ` (${filing.ticker})` : ""}`
      : undefined,
    ogDescription: filing ? buildOgDescription(filing) : undefined,
    ogImage:
      filing && slug
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/og?slug=${encodeURIComponent(slug)}`
        : undefined,
    ogUrl:
      filing && slug
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/fact-sheet/${encodeURIComponent(slug)}`
        : undefined,
  });

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ ...containerStyle, padding: "120px 32px", color: COLORS.fgMuted }}>
          Loading…
        </div>
      </div>
    );
  }

  if (error || !filing) {
    return (
      <div style={pageStyle}>
        <div style={{ ...containerStyle, padding: "120px 32px", color: COLORS.fgMuted }}>
          {error ? `Error: ${error}` : "Filing not found."}
        </div>
      </div>
    );
  }

  const accent = filingTypeColor(filing.filingType);
  const hero = filing.heroImageUrl;
  const offering = filing.offering;
  const financials = filing.financials;
  const pdfUrl = filing.pdfReportUrl ?? null;
  const fullReportHref = filing.reportSlug
    ? `/reports/${encodeURIComponent(filing.reportSlug)}`
    : null;
  const xlsxAvailable = hasFinancialsDeep(filing);

  return (
    <div style={pageStyle}>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section style={{ position: "relative" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: "460px",
            background: COLORS.bg,
            overflow: "hidden",
          }}
        >
          {hero ? (
            <img
              src={hero}
              alt={filing.companyName}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.55,
              }}
            />
          ) : null}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(10,13,16,0.45) 0%, rgba(10,13,16,0.85) 75%, #0a0d10 100%)",
              pointerEvents: "none",
            }}
          />

          {/* Star button in top-right corner */}
          <div
            style={{
              position: "absolute",
              top: 84,
              right: 32,
              zIndex: 2,
            }}
          >
            <StarButton slug={filing.reportSlug} variant="chip" size={14} />
          </div>

          <div
            style={{
              ...containerStyle,
              position: "relative",
              padding: "112px 32px 56px",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "5px 10px",
                borderRadius: "3px",
                background: `${accent}1f`,
                border: `1px solid ${accent}55`,
                color: accent,
                fontFamily: FONTS.mono,
                fontSize: "10px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              {filing.filingType} · {shortDate(filing.filingDate)}
            </div>

            <h1
              style={{
                fontFamily: FONTS.serif,
                fontSize: "72px",
                fontWeight: 400,
                color: COLORS.fg,
                lineHeight: 1.0,
                margin: 0,
                marginBottom: "16px",
                letterSpacing: "-0.01em",
              }}
            >
              {filing.companyName}
            </h1>

            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: "11px",
                color: COLORS.fgMuted,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {filing.ticker ? (
                <span>
                  {filing.exchange && filing.exchange !== "UNKNOWN"
                    ? `${filing.exchange}: `
                    : ""}
                  <span style={{ color: COLORS.primary }}>{filing.ticker}</span>
                </span>
              ) : null}
              {filing.industry ? <span>· {filing.industry}</span> : null}
              {filing.sicCode ? <span>· SIC {filing.sicCode}</span> : null}
            </div>
          </div>
        </div>
      </section>

      {/* Quick facts */}
      <section
        style={{
          borderTop: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
          background: "rgba(19,24,32,0.4)",
        }}
      >
        <div
          style={{
            ...containerStyle,
            padding: "40px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "24px 32px",
          }}
        >
          <QuickFact icon={<Building2 size={14} />} label="Exchange" value={filing.exchange || "—"} />
          <QuickFact icon={<CalendarIcon size={14} />} label="Filed" value={shortDate(filing.filingDate)} />
          <QuickFact
            icon={<DollarSign size={14} />}
            label="Gross proceeds"
            value={formatMoney(offering?.grossProceedsM ?? filing.grossProceedsM)}
          />
          <QuickFact
            icon={<TrendingUp size={14} />}
            label="Last revenue"
            value={formatMoney(financials?.lastRevenueM)}
          />
        </div>
      </section>

      {/* Performance */}
      {filing.performance ? <PerformanceSection filing={filing} /> : null}

      {/* Amendment diff (NEW) */}
      {hasAmendmentDiff(filing) ? <AmendmentDiffSection filing={filing} /> : null}

      {/* The Offering */}
      {offering ? (
        <Section eyebrow="The Offering" title="Deal terms.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px 48px" }}>
            <DataRow label="Shares offered" value={formatMoney(offering.sharesOfferedM)} />
            <DataRow label="Price range" value={offering.priceRange || "—"} />
            <DataRow label="Gross proceeds" value={formatMoney(offering.grossProceedsM)} />
            <DataRow label="Implied valuation" value={formatMoney(offering.impliedValuationM)} />
          </div>
        </Section>
      ) : null}

      {/* Use of Proceeds */}
      {filing.useOfProceeds && filing.useOfProceeds.length > 0 ? (
        <Section eyebrow="Use of Proceeds" title="Where the money goes.">
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filing.useOfProceeds.map((line, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "12px",
                  padding: "8px 0",
                  fontFamily: FONTS.sans,
                  fontSize: "15px",
                  color: COLORS.fg,
                  fontWeight: 300,
                  lineHeight: 1.55,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    background: COLORS.primary,
                    borderRadius: "50%",
                    flexShrink: 0,
                    marginTop: "9px",
                  }}
                />
                {line}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Key Risks */}
      {filing.keyRisks && filing.keyRisks.length > 0 ? (
        <Section eyebrow="Key Risks" title="What could go wrong.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "14px",
            }}
          >
            {filing.keyRisks.slice(0, 6).map((risk, i) => (
              <div
                key={i}
                style={{
                  background: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "8px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <AlertTriangle size={16} style={{ color: COLORS.gold, flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontFamily: FONTS.sans, fontSize: "13px", color: COLORS.fg, fontWeight: 300, lineHeight: 1.55 }}>
                  {risk}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Financial Snapshot */}
      {financials?.history && financials.history.length > 0 ? (
        <Section eyebrow="Financial Snapshot" title="Three-year history.">
          <div
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
              padding: "20px 24px",
              fontFamily: FONTS.mono,
              fontSize: "13px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: COLORS.fgMuted, fontSize: "11px" }}>
                  <th style={{ textAlign: "left", padding: "6px 12px" }}>FY</th>
                  <th style={{ textAlign: "right", padding: "6px 12px" }}>Revenue</th>
                  <th style={{ textAlign: "right", padding: "6px 12px" }}>Gross profit</th>
                  <th style={{ textAlign: "right", padding: "6px 12px" }}>Net income</th>
                </tr>
              </thead>
              <tbody>
                {financials.history.map((row, i) => (
                  <tr key={i} style={{ color: COLORS.fg }}>
                    <td style={{ padding: "8px 12px" }}>{row.fy}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatMoney(row.revenueM)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatMoney(row.grossProfitM)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatMoney(row.netIncomeM)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {/* Comparables */}
      {filing.comps && filing.comps.length > 0 ? <ComparablesSection filing={filing} /> : null}

      {/* Bankers & Peers */}
      {(filing.leadUnderwriters && filing.leadUnderwriters.length > 0) ||
      (filing.comparables && filing.comparables.length > 0) ? (
        <Section eyebrow="Bankers & Peers" title="Who's on the deal.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
            {filing.leadUnderwriters && filing.leadUnderwriters.length > 0 ? (
              <div>
                <div style={subTitleStyle}>Lead underwriters</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {filing.leadUnderwriters.map((uw, i) => (
                    <li
                      key={i}
                      style={{
                        padding: "6px 0",
                        color: COLORS.fg,
                        fontFamily: FONTS.sans,
                        fontWeight: 300,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Briefcase size={12} style={{ color: COLORS.primary }} />
                      {uw}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {filing.comparables && filing.comparables.length > 0 ? (
              <div>
                <div style={subTitleStyle}>Listed comparables</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {filing.comparables.map((c, i) => (
                    <li
                      key={i}
                      style={{
                        padding: "6px 0",
                        color: COLORS.fg,
                        fontFamily: FONTS.sans,
                        fontWeight: 300,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Users size={12} style={{ color: COLORS.primary }} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* CTA bar */}
      <section
        style={{
          borderTop: `1px solid ${COLORS.border}`,
          background: "rgba(19,24,32,0.4)",
        }}
      >
        <div
          style={{
            ...containerStyle,
            padding: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={eyebrowStyle}>Go deeper</div>
            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: "14px",
                color: COLORS.fgMuted,
                fontWeight: 300,
                marginTop: "6px",
              }}
            >
              Save this name, compare to another IPO, download the financial workbook, or read the full report.
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <StarButton slug={filing.reportSlug} variant="chip" size={14} />
            <CompareWithButton currentFiling={filing} />
            {xlsxAvailable ? <DownloadFinancialsButton filing={filing} variant="primary" /> : null}
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 18px",
                  background: COLORS.primary,
                  color: "#001512",
                  fontFamily: FONTS.mono,
                  fontSize: "11px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  textDecoration: "none",
                  borderRadius: "4px",
                }}
              >
                <Download size={14} />
                Download PDF
              </a>
            ) : null}
            {fullReportHref && pdfUrl ? (
              <Link
                href={fullReportHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 18px",
                  background: "transparent",
                  color: COLORS.fg,
                  fontFamily: FONTS.mono,
                  fontSize: "11px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  border: `1px solid ${COLORS.border}`,
                  textDecoration: "none",
                  borderRadius: "4px",
                }}
              >
                Read full report
                <ExternalLink size={12} />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <FactSheetChat filing={filing} />
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ ...containerStyle, padding: "56px 32px" }}>
      <div style={eyebrowStyle}>{eyebrow}</div>
      <h2 style={titleStyle}>{title}</h2>
      <div style={{ marginTop: "20px" }}>{children}</div>
    </section>
  );
}

function QuickFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: COLORS.fgMuted,
          fontFamily: FONTS.mono,
          fontSize: "10px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.serif,
          fontSize: "28px",
          fontWeight: 500,
          color: COLORS.fg,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: "16px",
        padding: "12px 0",
        borderBottom: `1px solid ${COLORS.borderSubtle}`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: COLORS.fgMuted,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: "16px",
          color: COLORS.fg,
          fontWeight: 300,
        }}
      >
        {value}
      </div>
    </div>
  );
}
