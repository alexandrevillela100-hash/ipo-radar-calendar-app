import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import { GitCompare, ArrowRight, Loader2 } from "lucide-react";
import {
  getAllFilings,
  filingTypeColor,
  hasAmendmentDiff,
  amendmentChangeColor,
  type Filing,
} from "@/lib/filingsClient";

/**
 * Diffs — /diffs page listing every amendment that has an AI-generated
 * diff against its prior filing.
 *
 * Save as:  calendar-app/src/pages/Diffs.tsx
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
  maxWidth: "1080px",
  margin: "0 auto",
  padding: "0 32px",
};

export default function Diffs() {
  const [filings, setFilings] = useState<Filing[]>([]);
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
        console.error("[Diffs] load failed:", err);
        setError(err?.message || "Failed to load filings");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const withDiffs = useMemo(
    () =>
      filings
        .filter(hasAmendmentDiff)
        .sort((a, b) =>
          (b.amendmentDiff?.comparedAt || b.filingDate || "").localeCompare(
            a.amendmentDiff?.comparedAt || a.filingDate || "",
          ),
        ),
    [filings],
  );

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
            <Loader2 size={20} style={{ marginRight: 10, animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading amendment diffs…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ color: "#d86060", padding: "40px 0" }}>Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLORS.gold,
              marginBottom: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <GitCompare size={14} /> Amendments
          </div>
          <h1
            style={{
              fontFamily: FONTS.serif,
              fontSize: 56,
              fontWeight: 400,
              margin: 0,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}
          >
            What changed.
          </h1>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 16,
              fontWeight: 300,
              color: COLORS.fgMuted,
              marginTop: 12,
              maxWidth: 720,
              lineHeight: 1.55,
            }}
          >
            Every S-1/A and F-1/A amendment, summarized against the prior
            filing by Claude. Material changes only — pricing tweaks, share
            count adjustments, new risk factors, underwriter swaps.{" "}
            {withDiffs.length} amendment{withDiffs.length === 1 ? "" : "s"} tracked.
          </div>
        </div>

        {withDiffs.length === 0 ? (
          <div
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "60px 40px",
              textAlign: "center",
              color: COLORS.fgDim,
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            No amendment diffs available yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {withDiffs.map((f) => (
              <DiffCard key={f._id} filing={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffCard({ filing }: { filing: Filing }) {
  const diff = filing.amendmentDiff!;
  const accent = filingTypeColor(filing.filingType);
  const href = filing.reportSlug
    ? `/fact-sheet/${encodeURIComponent(filing.reportSlug)}`
    : null;

  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: "22px 26px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONTS.serif,
              fontSize: 24,
              fontWeight: 500,
              lineHeight: 1.15,
            }}
          >
            {href ? (
              <Link
                href={href}
                style={{ color: COLORS.fg, textDecoration: "none" }}
              >
                {filing.companyName}
              </Link>
            ) : (
              filing.companyName
            )}
            {filing.ticker ? (
              <span
                style={{
                  marginLeft: 12,
                  fontFamily: FONTS.mono,
                  fontSize: 13,
                  color: COLORS.primary,
                  letterSpacing: "0.04em",
                }}
              >
                {filing.ticker}
              </span>
            ) : null}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: FONTS.mono,
            fontSize: 10,
            letterSpacing: "0.14em",
            color: COLORS.fgMuted,
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              padding: "3px 8px",
              background: `${accent}22`,
              border: `1px solid ${accent}55`,
              color: accent,
              borderRadius: 2,
            }}
          >
            {filing.filingType}
          </span>
          <span>{filing.filingDate}</span>
          <span style={{ color: COLORS.fgDim }}>
            vs. {diff.priorFilingType || "prior"} {diff.priorFilingDate || ""}
          </span>
        </div>
      </div>

      {diff.summary ? (
        <div
          style={{
            fontFamily: FONTS.serif,
            fontSize: 17,
            fontStyle: "italic",
            color: COLORS.fg,
            lineHeight: 1.5,
            paddingLeft: 14,
            borderLeft: `3px solid ${COLORS.gold}`,
            marginBottom: 14,
          }}
        >
          {diff.summary}
        </div>
      ) : null}

      {diff.changes && diff.changes.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {diff.changes.slice(0, 5).map((c, i) => {
            const color = amendmentChangeColor(c.category);
            return (
              <span
                key={i}
                title={c.description}
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "4px 10px",
                  color,
                  background: `${color}1f`,
                  border: `1px solid ${color}55`,
                  borderRadius: 999,
                }}
              >
                {c.category}
              </span>
            );
          })}
          {diff.changes.length > 5 ? (
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 10,
                color: COLORS.fgDim,
                letterSpacing: "0.06em",
                padding: "4px 8px",
              }}
            >
              +{diff.changes.length - 5} more
            </span>
          ) : null}
        </div>
      ) : null}

      {href ? (
        <Link
          href={href}
          style={{
            color: COLORS.primary,
            fontFamily: FONTS.mono,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          See full diff <ArrowRight size={11} />
        </Link>
      ) : null}
    </div>
  );
}
