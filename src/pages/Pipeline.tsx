import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  getAllFilings,
  pipelineStage,
  dedupeByCompany,
  daysSince,
  filingTypeColor,
  formatPct,
  returnColor,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGE_DESCRIPTION,
  PIPELINE_STAGE_COLOR,
  type Filing,
  type PipelineStage,
} from "@/lib/filingsClient";

/**
 * Pipeline — kanban-style overview of every IPO in the universe.
 *
 * Save as:  calendar-app/src/pages/Pipeline.tsx (new file)
 *
 * Four columns:
 *   1. Filed             — initial S-1 / F-1 on file
 *   2. Amended           — at least one S-1/A
 *   3. Pricing window    — 424B or pricing-window status
 *   4. Trading           — performance data exists or status=trading
 *
 * Companies that appear in multiple stages (S-1 then S-1/A) are deduped
 * via dedupeByCompany() and shown in their furthest stage only.
 *
 * Click any card → /fact-sheet/<slug>.
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
  maxWidth: "1400px",
  margin: "0 auto",
  padding: "0 32px",
};

const headerStyle: CSSProperties = {
  marginBottom: "40px",
};

const eyebrowStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "11px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: COLORS.primary,
  marginBottom: "12px",
};

const titleStyle: CSSProperties = {
  fontFamily: FONTS.serif,
  fontSize: "56px",
  fontWeight: 400,
  margin: 0,
  lineHeight: 1.05,
  letterSpacing: "-0.01em",
};

const subtitleStyle: CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  fontWeight: 300,
  color: COLORS.fgMuted,
  marginTop: "12px",
  maxWidth: "640px",
  lineHeight: 1.55,
};

const columnsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(260px, 1fr))",
  gap: "20px",
  alignItems: "stretch",
};

const columnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: COLORS.bgCard,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "12px",
  overflow: "hidden",
};

const columnHeaderStyle: CSSProperties = {
  padding: "20px 20px 16px",
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
};

const columnTitleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "8px",
};

const columnTitleStyle: CSSProperties = {
  fontFamily: FONTS.serif,
  fontSize: "22px",
  fontWeight: 500,
  margin: 0,
  letterSpacing: "-0.005em",
};

const countBadgeStyle = (color: string): CSSProperties => ({
  fontFamily: FONTS.mono,
  fontSize: "11px",
  letterSpacing: "0.04em",
  color,
  background: `${color}1f`,
  border: `1px solid ${color}3a`,
  padding: "2px 8px",
  borderRadius: "999px",
});

const columnSubStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "10px",
  letterSpacing: "0.06em",
  color: COLORS.fgDim,
  textTransform: "uppercase",
};

const columnBodyStyle: CSSProperties = {
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  flex: 1,
  minHeight: "240px",
};

const cardStyle: CSSProperties = {
  display: "block",
  background: COLORS.bgCard2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "10px",
  padding: "14px 14px 12px",
  textDecoration: "none",
  color: COLORS.fg,
  transition: "border-color 0.15s ease, transform 0.15s ease",
};

const cardCompanyStyle: CSSProperties = {
  fontFamily: FONTS.serif,
  fontSize: "17px",
  fontWeight: 500,
  lineHeight: 1.2,
  marginBottom: "6px",
};

const cardMetaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontFamily: FONTS.mono,
  fontSize: "10px",
  letterSpacing: "0.05em",
  color: COLORS.fgMuted,
};

const tickerChipStyle = (color: string): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  fontFamily: FONTS.mono,
  fontSize: "10px",
  color,
  letterSpacing: "0.05em",
});

const cardFooterStyle: CSSProperties = {
  marginTop: "10px",
  paddingTop: "10px",
  borderTop: `1px solid ${COLORS.borderSubtle}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const emptyStyle: CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: COLORS.fgDim,
  textAlign: "center",
  padding: "40px 0",
};

// ─── Component ──────────────────────────────────────────────────────

export default function Pipeline() {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Google Fonts on mount (idempotent).
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllFilings()
      .then((rows) => {
        if (cancelled) return;
        setFilings(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("[Pipeline] failed to load filings:", err);
        setError(err?.message || "Failed to load filings");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const deduped = dedupeByCompany(filings);

  const byStage: Record<PipelineStage, Filing[]> = {
    filed: [],
    amended: [],
    pricing: [],
    trading: [],
    withdrawn: [],
  };
  for (const f of deduped) {
    byStage[pipelineStage(f)].push(f);
  }
  // Sort within each stage by filing date desc (most recent first).
  for (const stage of PIPELINE_STAGES) {
    byStage[stage].sort((a, b) =>
      (b.filingDate || "").localeCompare(a.filingDate || ""),
    );
  }

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
                marginRight: "10px",
                animation: "spin 1s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading pipeline…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ color: "#d86060", padding: "40px 0" }}>
            Error loading pipeline: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* ── Header ───────────────────────────────────────────── */}
        <div style={headerStyle}>
          <div style={eyebrowStyle}>The Pipeline</div>
          <h1 style={titleStyle}>Every IPO, by stage.</h1>
          <div style={subtitleStyle}>
            Live view of all registered offerings tracked by IPO Radar — from
            first S-1 through public trading. {deduped.length} companies in the
            pipeline.
          </div>
        </div>

        {/* ── Columns ──────────────────────────────────────────── */}
        <div style={columnsGridStyle}>
          {PIPELINE_STAGES.map((stage) => {
            const color = PIPELINE_STAGE_COLOR[stage];
            const rows = byStage[stage];

            return (
              <div key={stage} style={columnStyle}>
                <div style={columnHeaderStyle}>
                  <div style={columnTitleRowStyle}>
                    <h2 style={columnTitleStyle}>
                      {PIPELINE_STAGE_LABEL[stage]}
                    </h2>
                    <span style={countBadgeStyle(color)}>{rows.length}</span>
                  </div>
                  <div style={columnSubStyle}>
                    {PIPELINE_STAGE_DESCRIPTION[stage]}
                  </div>
                </div>

                <div style={columnBodyStyle}>
                  {rows.length === 0 ? (
                    <div style={emptyStyle}>No filings in this stage</div>
                  ) : (
                    rows.map((f) => (
                      <PipelineCard key={f._id} filing={f} stage={stage} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────────

function PipelineCard({
  filing,
  stage,
}: {
  filing: Filing;
  stage: PipelineStage;
}) {
  const accent = filingTypeColor(filing.filingType);
  const days = daysSince(filing.filingDate);
  const href = filing.reportSlug
    ? `/fact-sheet/${encodeURIComponent(filing.reportSlug)}`
    : null;

  const inner = (
    <>
      <div style={cardCompanyStyle}>{filing.companyName}</div>

      <div style={cardMetaRowStyle}>
        {filing.ticker ? (
          <span style={tickerChipStyle(COLORS.primary)}>
            {filing.exchange && filing.exchange !== "UNKNOWN"
              ? `${filing.exchange}: `
              : ""}
            <span style={{ color: COLORS.primary, fontWeight: 500 }}>
              {filing.ticker}
            </span>
          </span>
        ) : (
          <span style={{ color: COLORS.fgDim }}>—</span>
        )}
        <span style={{ color: accent, letterSpacing: "0.05em" }}>
          {filing.filingType}
        </span>
      </div>

      <div style={cardFooterStyle}>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: "10px",
            color: COLORS.fgDim,
          }}
        >
          {days !== undefined ? `${days}d in stage` : "—"}
        </span>

        {stage === "trading" && filing.performance?.returnSinceIPO !== undefined ? (
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: "11px",
              color: returnColor(filing.performance.returnSinceIPO),
              fontWeight: 500,
            }}
          >
            {formatPct(filing.performance.returnSinceIPO)}
          </span>
        ) : href ? (
          <ArrowRight size={12} style={{ color: COLORS.primary }} />
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={cardStyle}
        // hover effect via inline event (no CSS)
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor =
            COLORS.primary;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor =
            COLORS.border;
        }}
      >
        {inner}
      </Link>
    );
  }

  return <div style={cardStyle}>{inner}</div>;
}
