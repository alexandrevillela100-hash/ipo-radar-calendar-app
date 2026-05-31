import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useRoute } from "wouter";
import { Briefcase, ArrowLeft, Loader2 } from "lucide-react";
import {
  getAllFilings,
  dedupeByCompany,
  normalizeUnderwriter,
  underwriterSlug,
  formatPct,
  returnColor,
  formatMoneyM,
  filingTypeColor,
  type Filing,
} from "@/lib/filingsClient";

/**
 * UnderwriterDetail — single underwriter's IPO book.
 *
 * Save as:  calendar-app/src/pages/UnderwriterDetail.tsx
 *
 * URL: /underwriters/:slug
 *
 * Shows summary stats + full deal list for one bank.
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
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 32px",
};

export default function UnderwriterDetail() {
  const [match, params] = useRoute("/underwriters/:slug");
  const slug = match ? params.slug : null;

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
        console.error("[UnderwriterDetail] failed to load:", err);
        setError(err?.message || "Failed to load filings");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo<Filing[]>(() => {
    if (!slug) return [];
    const deduped = dedupeByCompany(filings);
    return deduped
      .filter((f) =>
        (f.leadUnderwriters || []).some(
          (u) => underwriterSlug(normalizeUnderwriter(u)) === slug,
        ),
      )
      .sort((a, b) =>
        (b.pricing?.ipoDate || b.filingDate || "").localeCompare(
          a.pricing?.ipoDate || a.filingDate || "",
        ),
      );
  }, [filings, slug]);

  // Resolve display name from any matched filing's underwriter list.
  const displayName = useMemo<string | null>(() => {
    if (!slug || filtered.length === 0) return null;
    for (const f of filtered) {
      for (const raw of f.leadUnderwriters || []) {
        const name = normalizeUnderwriter(raw);
        if (underwriterSlug(name) === slug) return name;
      }
    }
    return slug;
  }, [filtered, slug]);

  // Aggregate stats
  const stats = useMemo(() => {
    const deals = filtered.length;
    const grossProceedsM = filtered.reduce(
      (sum, f) => sum + (f.grossProceedsM ?? 0),
      0,
    );
    const pops = filtered
      .map((f) => f.performance?.firstDayPop)
      .filter((x): x is number => Number.isFinite(x as number));
    const returns = filtered
      .map((f) => f.performance?.returnSinceIPO)
      .filter((x): x is number => Number.isFinite(x as number));
    const firstDayPopAvg =
      pops.length > 0
        ? pops.reduce((a, b) => a + b, 0) / pops.length
        : undefined;
    const returnSinceIPOAvg =
      returns.length > 0
        ? returns.reduce((a, b) => a + b, 0) / returns.length
        : undefined;
    return { deals, grossProceedsM, firstDayPopAvg, returnSinceIPOAvg };
  }, [filtered]);

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
              style={{ marginRight: 10, animation: "spin 1s linear infinite" }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading underwriter book…
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
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <Link
            href="/underwriters"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: COLORS.primary,
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              textDecoration: "none",
              marginBottom: 24,
            }}
          >
            <ArrowLeft size={12} /> Back to league table
          </Link>
          <div style={{ color: COLORS.fgMuted, padding: "40px 0" }}>
            No deals found for "{slug}".
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link
          href="/underwriters"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: COLORS.primary,
            fontFamily: FONTS.mono,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            textDecoration: "none",
            marginBottom: 32,
          }}
        >
          <ArrowLeft size={12} /> League table
        </Link>

        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLORS.primary,
              marginBottom: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Briefcase size={14} />
            Underwriter
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
            {displayName}.
          </h1>
        </div>

        {/* ── Stats ────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 40,
          }}
        >
          <StatCard label="Deals" value={String(stats.deals)} />
          <StatCard
            label="Gross proceeds"
            value={
              stats.grossProceedsM > 0
                ? formatMoneyM(stats.grossProceedsM)
                : "—"
            }
          />
          <StatCard
            label="Avg first-day pop"
            value={formatPct(stats.firstDayPopAvg)}
            color={returnColor(stats.firstDayPopAvg)}
          />
          <StatCard
            label="Avg since-IPO return"
            value={formatPct(stats.returnSinceIPOAvg)}
            color={returnColor(stats.returnSinceIPOAvg)}
          />
        </div>

        {/* ── Deal list ────────────────────────────────────────── */}
        <div
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Ticker</Th>
                <Th>Type</Th>
                <Th right>IPO date</Th>
                <Th right>Proceeds</Th>
                <Th right>1-day</Th>
                <Th right>Since IPO</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const accent = filingTypeColor(f.filingType);
                const href = f.reportSlug
                  ? `/fact-sheet/${encodeURIComponent(f.reportSlug)}`
                  : null;
                return (
                  <tr
                    key={f._id}
                    style={{ borderTop: `1px solid ${COLORS.borderSubtle}` }}
                  >
                    <Td>
                      {href ? (
                        <Link
                          href={href}
                          style={{
                            color: COLORS.fg,
                            textDecoration: "none",
                            fontFamily: FONTS.sans,
                            fontWeight: 400,
                          }}
                        >
                          {f.companyName}
                        </Link>
                      ) : (
                        f.companyName
                      )}
                    </Td>
                    <Td mono color={COLORS.primary}>
                      {f.ticker || "—"}
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontFamily: FONTS.mono,
                          fontSize: 9,
                          textTransform: "uppercase",
                          letterSpacing: "0.14em",
                          padding: "3px 7px",
                          color: accent,
                          backgroundColor: `${accent}22`,
                          border: `1px solid ${accent}55`,
                          borderRadius: 2,
                        }}
                      >
                        {f.filingType}
                      </span>
                    </Td>
                    <Td right mono>
                      {f.pricing?.ipoDate || f.filingDate || "—"}
                    </Td>
                    <Td right mono>
                      {f.grossProceedsM
                        ? formatMoneyM(f.grossProceedsM)
                        : "—"}
                    </Td>
                    <Td
                      right
                      mono
                      color={returnColor(f.performance?.firstDayPop)}
                    >
                      {formatPct(f.performance?.firstDayPop)}
                    </Td>
                    <Td
                      right
                      mono
                      color={returnColor(f.performance?.returnSinceIPO)}
                    >
                      {formatPct(f.performance?.returnSinceIPO)}
                    </Td>
                    <Td right>
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
                          }}
                        >
                          View →
                        </Link>
                      ) : null}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
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
          fontSize: 26,
          fontWeight: 500,
          color: color || COLORS.fg,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
  right,
}: {
  children?: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      style={{
        padding: "16px 18px",
        textAlign: right ? "right" : "left",
        fontFamily: FONTS.mono,
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: COLORS.fgMuted,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  mono,
  color,
}: {
  children?: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  color?: string;
}) {
  return (
    <td
      style={{
        padding: "14px 18px",
        textAlign: right ? "right" : "left",
        fontFamily: mono ? FONTS.mono : FONTS.sans,
        fontSize: mono ? 12 : 14,
        color: color || COLORS.fg,
        fontWeight: 300,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}
