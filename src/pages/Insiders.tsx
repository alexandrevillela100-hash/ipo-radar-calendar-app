import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import { Users, ArrowRight, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import {
  getAllFilings,
  dedupeByCompany,
  hasInsiderActivity,
  formatMoneySigned,
  returnColor,
  type Filing,
} from "@/lib/filingsClient";

/**
 * Insiders — /insiders page.
 *
 * Save as:  calendar-app/src/pages/Insiders.tsx
 *
 * League table of every tracked filing's insider activity. Sortable by
 * net 30d / 90d $ flow. Click a row to its fact sheet.
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
  paddingTop: "96px",
  paddingBottom: "96px",
};

const containerStyle: CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
  padding: "0 32px",
};

type SortKey = "net30" | "net90" | "buys30" | "sells30" | "recent" | "ticker";

export default function Insiders() {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
        console.error("[Insiders] load failed:", err);
        setError(err?.message || "Failed to load filings");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const withActivity = useMemo(
    () => dedupeByCompany(filings).filter(hasInsiderActivity),
    [filings],
  );

  const sorted = useMemo(() => {
    const rows = [...withActivity];
    rows.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      const ai = a.insiderActivity!;
      const bi = b.insiderActivity!;
      switch (sortBy) {
        case "net30": av = ai.net30dUsd ?? 0; bv = bi.net30dUsd ?? 0; break;
        case "net90": av = ai.net90dUsd ?? 0; bv = bi.net90dUsd ?? 0; break;
        case "buys30": av = ai.buys30d ?? 0; bv = bi.buys30d ?? 0; break;
        case "sells30": av = ai.sells30d ?? 0; bv = bi.sells30d ?? 0; break;
        case "recent":
          av = ai.mostRecentTradeDate || "";
          bv = bi.mostRecentTradeDate || "";
          break;
        case "ticker":
        default:
          av = a.ticker || a.companyName || "";
          bv = b.ticker || b.companyName || "";
      }
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [withActivity, sortBy, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(k);
      setSortDir(k === "ticker" ? "asc" : "desc");
    }
  };

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
            Loading insider activity…
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
              color: COLORS.primary,
              marginBottom: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Users size={14} /> Insider activity
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
            What insiders are doing.
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
            Form 4 transactions for every tracked IPO. Aggregated from SEC
            EDGAR via OpenInsider. Refreshed daily. {withActivity.length} name
            {withActivity.length === 1 ? "" : "s"} with activity.
          </div>
        </div>

        {withActivity.length === 0 ? (
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
            No insider activity tracked yet — run the track-insiders workflow
          </div>
        ) : (
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
                  <Th>{"#"}</Th>
                  <Th sortable onClick={() => toggleSort("ticker")}>
                    Company
                  </Th>
                  <Th>Ticker</Th>
                  <Th right sortable onClick={() => toggleSort("net30")}>
                    Net 30d
                  </Th>
                  <Th right sortable onClick={() => toggleSort("net90")}>
                    Net 90d
                  </Th>
                  <Th right sortable onClick={() => toggleSort("buys30")}>
                    Buys 30d
                  </Th>
                  <Th right sortable onClick={() => toggleSort("sells30")}>
                    Sales 30d
                  </Th>
                  <Th right sortable onClick={() => toggleSort("recent")}>
                    Most recent
                  </Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((f, i) => {
                  const ai = f.insiderActivity!;
                  const href = f.reportSlug
                    ? `/fact-sheet/${encodeURIComponent(f.reportSlug)}`
                    : null;
                  const netColor = (n: number | undefined) =>
                    returnColor(n ? n / 1e6 : 0);
                  return (
                    <tr
                      key={f._id}
                      style={{ borderTop: `1px solid ${COLORS.borderSubtle}` }}
                    >
                      <Td muted mono>{i + 1}</Td>
                      <Td>
                        {href ? (
                          <Link
                            href={href}
                            style={{
                              color: COLORS.fg,
                              textDecoration: "none",
                              fontFamily: FONTS.sans,
                            }}
                          >
                            {f.companyName}
                          </Link>
                        ) : (
                          f.companyName
                        )}
                      </Td>
                      <Td mono color={COLORS.primary}>{f.ticker || "—"}</Td>
                      <Td right mono color={netColor(ai.net30dUsd)}>
                        {formatMoneySigned(ai.net30dUsd)}
                      </Td>
                      <Td right mono color={netColor(ai.net90dUsd)}>
                        {formatMoneySigned(ai.net90dUsd)}
                      </Td>
                      <Td right mono>
                        <span style={{ color: COLORS.primary, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {ai.buys30d ? <TrendingUp size={11} /> : null}
                          {ai.buys30d ?? 0}
                        </span>
                      </Td>
                      <Td right mono>
                        <span style={{ color: COLORS.red, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {ai.sells30d ? <TrendingDown size={11} /> : null}
                          {ai.sells30d ?? 0}
                        </span>
                      </Td>
                      <Td right mono>{ai.mostRecentTradeDate || "—"}</Td>
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
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            View <ArrowRight size={11} />
                          </Link>
                        ) : null}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.fgDim,
            letterSpacing: "0.02em",
            lineHeight: 1.55,
          }}
        >
          Net $ flow includes all Form 4 transaction codes (purchases, sales,
          option exercises, awards, tax withholdings). Buys / sales counts only
          include explicit Purchase (P) and Sale (S) codes — grants and
          exercises are excluded.
        </div>
      </div>
    </div>
  );
}

function Th({
  children, right, sortable, onClick,
}: {
  children?: React.ReactNode;
  right?: boolean;
  sortable?: boolean;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={sortable ? onClick : undefined}
      style={{
        padding: "14px 16px",
        textAlign: right ? "right" : "left",
        fontFamily: FONTS.mono,
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: COLORS.fgMuted,
        fontWeight: 500,
        cursor: sortable ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children, right, mono, muted, color,
}: {
  children?: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  muted?: boolean;
  color?: string;
}) {
  return (
    <td
      style={{
        padding: "12px 16px",
        textAlign: right ? "right" : "left",
        fontFamily: mono ? FONTS.mono : FONTS.sans,
        fontSize: mono ? 12 : 14,
        color: color || (muted ? COLORS.fgDim : COLORS.fg),
        fontWeight: 300,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}
