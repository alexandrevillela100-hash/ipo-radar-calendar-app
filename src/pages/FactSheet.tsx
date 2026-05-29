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
import {
  getFilingBySlug,
  filingTypeColor,
  type Filing,
} from "@/lib/filingsClient";

/**
 * FactSheet — v4. Refined one-pager per company.
 *
 * Save as:  calendar-app/src/pages/FactSheet.tsx (overwrite)
 *
 * Design notes:
 *   - All styling inline (no Tailwind dependency).
 *   - Loads Google Fonts (Cormorant Garamond + Barlow + DM Mono) on
 *     mount via <link> injection — falls back to system fonts on slow
 *     networks but never breaks layout.
 *   - Every section auto-hides if Sanity data is missing for it.
 *     So a bare filing (only EDGAR metadata) still renders a clean
 *     page; published reports unlock more sections.
 *   - Chat box (FactSheetChat) is rendered as the last section.
 *
 * Route: /fact-sheet/:slug
 */

// ─── Constants ────────────────────────────────────────────────────────

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Barlow:wght@200;300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap";

const COLORS = {
  bg: "#0a0d10",
  bgCard: "#131820",
  bgCard2: "#0f141a",
  fg: "#e4e6e8",
  fgMuted: "#8b9099",
  fgDim: "#5b6068",
  primary: "#03c8b5",
  primaryFg: "#001512",
  gold: "#c8a45c",
  border: "rgba(255, 255, 255, 0.08)",
  borderSoft: "rgba(255, 255, 255, 0.05)",
};

const FONTS = {
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '"Barlow", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", "SF Mono", Consolas, monospace',
};

// ─── Helpers ──────────────────────────────────────────────────────────

function shortDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

function formatMoney(usdMillions?: number | null): string {
  if (usdMillions == null) return "—";
  if (Math.abs(usdMillions) >= 1000) {
    return `$${(usdMillions / 1000).toFixed(2)}B`;
  }
  return `$${usdMillions.toFixed(1)}M`;
}

function loadFonts() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_HREF;
  document.head.appendChild(link);
}

// ─── Component ────────────────────────────────────────────────────────

export default function FactSheet() {
  const [, params] = useRoute<{ slug: string }>("/fact-sheet/:slug");
  const slug = params?.slug ?? "";

  const [filing, setFiling] = useState<Filing | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadFonts();
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    getFilingBySlug(slug)
      .then((row) => {
        if (cancelled) return;
        setFiling(row);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setErr(String((e as Error)?.message ?? e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ─── Loading / error states ─────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ ...pageBaseStyle, ...centerStyle }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", color: COLORS.fgMuted }}>
          Loading fact sheet…
        </span>
      </div>
    );
  }

  if (err || !filing) {
    return (
      <div style={{ ...pageBaseStyle, ...centerStyle, gap: "16px", textAlign: "center", padding: "0 24px" }}>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: "32px", fontWeight: 400, color: COLORS.fg, margin: 0 }}>
          Fact sheet not found
        </h1>
        <p style={{ color: COLORS.fgMuted, fontSize: "14px", maxWidth: "400px", margin: 0 }}>
          We couldn't locate a filing with slug{" "}
          <code style={{ fontFamily: FONTS.mono }}>{slug}</code>.
        </p>
        <Link
          href="/"
          style={{
            fontFamily: FONTS.mono, fontSize: "11px",
            textTransform: "uppercase", letterSpacing: "0.16em",
            color: COLORS.primary, textDecoration: "none",
          }}
        >
          ← Back to calendar
        </Link>
      </div>
    );
  }

  // ─── Data preparation ──────────────────────────────────────────────

  const accent = filingTypeColor(filing.filingType);
  const hero = filing.heroImageUrl;
  const offering = filing.offering;
  const financials = filing.financials;
  const pdfUrl = filing.pdfReportUrl ?? null;
  const fullReportHref = filing.reportSlug
    ? `/reports/${encodeURIComponent(filing.reportSlug)}`
    : null;

  return (
    <div style={pageBaseStyle}>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section style={{ position: "relative" }}>
        <div
          style={{
            position: "relative",
            height: "44vh",
            minHeight: "340px",
            maxHeight: "500px",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, rgba(3,200,181,0.18), rgba(19,24,32,1))",
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
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, " +
                COLORS.bg +
                " 5%, rgba(10,13,16,0.4), transparent)",
            }}
          />
        </div>

        <div
          style={{
            ...containerStyle,
            marginTop: "-130px",
            position: "relative",
            zIndex: 5,
            paddingBottom: "48px",
          }}
        >
          {/* Filing-type chip */}
          <div
            style={{
              display: "inline-block",
              fontFamily: FONTS.mono,
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              padding: "6px 12px",
              marginBottom: "20px",
              border: `1px solid ${accent}55`,
              borderRadius: "2px",
              color: accent,
              backgroundColor: `${accent}22`,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            {filing.filingType} · {shortDate(filing.filingDate)}
          </div>

          <h1
            style={{
              fontFamily: FONTS.serif,
              fontWeight: 400,
              fontSize: "clamp(40px, 5.5vw, 76px)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              color: COLORS.fg,
              margin: "0 0 16px 0",
            }}
          >
            {filing.companyName}
          </h1>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 20px",
              fontFamily: FONTS.mono,
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: COLORS.fgMuted,
            }}
          >
            {filing.ticker ? (
              <span style={{ color: COLORS.fg }}>
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
      </section>

      {/* ── Quick facts ────────────────────────────────────────── */}
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
          className="quickfacts-grid"
        >
          <QuickFact
            icon={<Building2 size={14} />}
            label="Exchange"
            value={filing.exchange || "—"}
          />
          <QuickFact
            icon={<CalendarIcon size={14} />}
            label="Filed"
            value={shortDate(filing.filingDate)}
          />
          <QuickFact
            icon={<DollarSign size={14} />}
            label="Gross proceeds"
            value={formatMoney(offering?.grossProceedsM)}
          />
          <QuickFact
            icon={<TrendingUp size={14} />}
            label="Last revenue"
            value={formatMoney(financials?.lastRevenueM)}
          />
        </div>
      </section>

      {/* ── Post-IPO Performance (auto-hides if no performance data) ──── */}
      {filing.performance ? <PerformanceSection filing={filing} /> : null}

      {/* ── The Offering ───────────────────────────────────────── */}
      {offering ? (
        <Section eyebrow="The Offering" title="Deal terms.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "10px 48px",
            }}
            className="twocol-grid"
          >
            {offering.sharesOfferedM != null ? (
              <DataRow
                label="Shares offered"
                value={`${offering.sharesOfferedM.toLocaleString()}M units`}
              />
            ) : null}
            {offering.priceRange ? (
              <DataRow label="Price range" value={offering.priceRange} />
            ) : null}
            {offering.grossProceedsM != null ? (
              <DataRow
                label="Gross proceeds"
                value={formatMoney(offering.grossProceedsM)}
              />
            ) : null}
            {offering.impliedValuationM != null ? (
              <DataRow
                label="Implied valuation"
                value={formatMoney(offering.impliedValuationM)}
              />
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* ── Use of proceeds ─────────────────────────────────────── */}
      {filing.useOfProceeds && filing.useOfProceeds.length > 0 ? (
        <Section eyebrow="Use of Proceeds" title="Where the money goes.">
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filing.useOfProceeds.map((line, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: "14px",
                  fontSize: "15.5px",
                  color: "rgba(228,230,232,0.88)",
                  lineHeight: 1.75,
                  marginBottom: "14px",
                  fontWeight: 300,
                  fontFamily: FONTS.sans,
                }}
              >
                <span
                  style={{
                    marginTop: "12px",
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: COLORS.primary,
                    flexShrink: 0,
                  }}
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ── Key risks ────────────────────────────────────────────── */}
      {filing.keyRisks && filing.keyRisks.length > 0 ? (
        <Section eyebrow="Key Risks" title="What to watch.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "16px",
            }}
            className="risks-grid"
          >
            {filing.keyRisks.slice(0, 6).map((risk, i) => (
              <div
                key={i}
                style={{
                  border: `1px solid ${COLORS.border}`,
                  background: "rgba(19,24,32,0.4)",
                  padding: "18px",
                  borderRadius: "4px",
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <AlertTriangle
                    size={16}
                    color={COLORS.gold}
                    style={{ marginTop: "2px", flexShrink: 0 }}
                  />
                  <p
                    style={{
                      fontFamily: FONTS.sans,
                      fontSize: "14px",
                      color: "rgba(228,230,232,0.85)",
                      lineHeight: 1.65,
                      margin: 0,
                      fontWeight: 300,
                    }}
                  >
                    {risk}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ── Financial snapshot ──────────────────────────────────── */}
      {financials?.history && financials.history.length > 0 ? (
        <Section eyebrow="Financial Snapshot" title="Recent fiscal years.">
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: FONTS.mono,
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th style={finThStyle}>Year</th>
                  <th style={{ ...finThStyle, textAlign: "right" }}>Revenue</th>
                  <th style={{ ...finThStyle, textAlign: "right" }}>Gross profit</th>
                  <th style={{ ...finThStyle, textAlign: "right" }}>Net income</th>
                </tr>
              </thead>
              <tbody>
                {financials.history.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${COLORS.borderSoft}` }}>
                    <td style={{ ...finTdStyle, color: COLORS.fg }}>{row.fy}</td>
                    <td style={{ ...finTdStyle, textAlign: "right" }}>
                      {formatMoney(row.revenueM)}
                    </td>
                    <td style={{ ...finTdStyle, textAlign: "right" }}>
                      {formatMoney(row.grossProfitM)}
                    </td>
                    <td style={{ ...finTdStyle, textAlign: "right" }}>
                      {formatMoney(row.netIncomeM)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              marginTop: "16px",
              fontFamily: FONTS.mono,
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: COLORS.fgDim,
            }}
          >
            Source: S-1 filing · IPO Radar structured extraction
          </div>
        </Section>
      ) : null}

      {/* ── Bankers + comparables ──────────────────────────────── */}
      {(filing.leadUnderwriters && filing.leadUnderwriters.length > 0) ||
      (filing.comparables && filing.comparables.length > 0) ? (
        <Section eyebrow="Bankers & Peers" title="Deal team and comps.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "32px 48px",
            }}
            className="twocol-grid"
          >
            {filing.leadUnderwriters && filing.leadUnderwriters.length > 0 ? (
              <div>
                <h3 style={colListHeadingStyle}>
                  <Users size={12} /> Lead underwriters
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {filing.leadUnderwriters.map((uw, i) => (
                    <li key={i} style={colListItemStyle}>
                      {uw}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {filing.comparables && filing.comparables.length > 0 ? (
              <div>
                <h3 style={colListHeadingStyle}>
                  <Briefcase size={12} /> Comparable companies
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {filing.comparables.map((c, i) => (
                    <li key={i} style={colListItemStyle}>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* ── CTA bar — Download PDF + Read full report ─────────── */}
      {pdfUrl || fullReportHref ? (
        <section
          style={{
            borderTop: `1px solid ${COLORS.border}`,
            background: "rgba(19,24,32,0.4)",
            padding: "48px 0",
          }}
        >
          <div
            style={{
              ...containerStyle,
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
            className="cta-bar"
          >
            <div>
              <div style={eyebrowStyle}>Go deeper</div>
              <div
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: "15px",
                  color: COLORS.fgMuted,
                  fontWeight: 300,
                  marginTop: "8px",
                }}
              >
                Download the full 30-page initiation report, or read it online.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={ctaPrimaryStyle}
                >
                  <Download size={14} /> Download PDF
                </a>
              ) : null}
              {fullReportHref ? (
                <Link href={fullReportHref} style={ctaSecondaryStyle}>
                  Read full report <ExternalLink size={14} />
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Analyst chat ───────────────────────────────────────── */}
      <FactSheetChat filing={filing} />

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div
        style={{
          ...containerStyle,
          padding: "48px 32px",
          textAlign: "center",
          fontFamily: FONTS.mono,
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: COLORS.fgDim,
        }}
      >
        Source: SEC EDGAR · IPO Radar by Velocia Ventures
      </div>

      {/* Responsive helpers */}
      <style>{`
        @media (min-width: 768px) {
          .quickfacts-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .twocol-grid { grid-template-columns: 1fr 1fr !important; }
          .risks-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 640px) {
          .cta-bar { flex-direction: row !important; align-items: center !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

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
      <h2
        style={{
          fontFamily: FONTS.serif,
          fontWeight: 400,
          fontSize: "clamp(24px, 2.6vw, 36px)",
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
          color: COLORS.fg,
          margin: "8px 0 32px 0",
        }}
      >
        {title.split(" ").map((word, i, arr) => {
          // Italicize the final word for visual rhythm
          if (i === arr.length - 1) {
            return (
              <em key={i} style={{ color: COLORS.primary, fontStyle: "italic" }}>
                {word}
              </em>
            );
          }
          return <span key={i}>{word + " "}</span>;
        })}
      </h2>
      {children}
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
          fontFamily: FONTS.mono,
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: COLORS.fgMuted,
          marginBottom: "8px",
        }}
      >
        {icon} {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.serif,
          fontSize: "22px",
          color: COLORS.fg,
          fontWeight: 400,
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
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        borderBottom: `1px solid ${COLORS.borderSoft}`,
        padding: "12px 0",
      }}
    >
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: COLORS.fgMuted,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: FONTS.sans,
          fontSize: "16px",
          color: "rgba(228,230,232,0.95)",
          fontWeight: 300,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Shared style objects ────────────────────────────────────────────

const pageBaseStyle: CSSProperties = {
  minHeight: "100vh",
  background: COLORS.bg,
  color: COLORS.fg,
  fontFamily: FONTS.sans,
  fontWeight: 300,
  WebkitFontSmoothing: "antialiased",
};

const centerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "96px 0",
};

const containerStyle: CSSProperties = {
  maxWidth: "1180px",
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: "32px",
  paddingRight: "32px",
};

const eyebrowStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: COLORS.primary,
  display: "inline-block",
};

const finThStyle: CSSProperties = {
  textAlign: "left",
  padding: "14px 24px 14px 0",
  fontFamily: FONTS.mono,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: COLORS.fgMuted,
  fontWeight: 400,
};

const finTdStyle: CSSProperties = {
  padding: "12px 24px 12px 0",
  color: "rgba(228,230,232,0.9)",
};

const colListHeadingStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: COLORS.fgMuted,
  fontWeight: 400,
  margin: "0 0 12px 0",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const colListItemStyle: CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  color: "rgba(228,230,232,0.9)",
  padding: "5px 0",
  fontWeight: 300,
};

const ctaPrimaryStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "14px 22px",
  background: COLORS.primary,
  color: COLORS.primaryFg,
  fontFamily: FONTS.mono,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  textDecoration: "none",
  borderRadius: "2px",
  fontWeight: 500,
};

const ctaSecondaryStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "14px 22px",
  background: "transparent",
  color: COLORS.fg,
  border: `1px solid ${COLORS.border}`,
  fontFamily: FONTS.mono,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  textDecoration: "none",
  borderRadius: "2px",
};
